import sqlite3
import os
import re
from contextlib import contextmanager
from .config import DATABASE_PATH, DATABASE_URL, SCHEMA_PATH, DB_ENGINE, IS_PRODUCTION

# Global lazy PostgreSQL connection pool
_pg_pool = None

def get_pg_pool():
    global _pg_pool
    if _pg_pool is None:
        try:
            import psycopg2
            from psycopg2 import pool
            _pg_pool = pool.SimpleConnectionPool(
                minconn=1,
                maxconn=10,
                dsn=DATABASE_URL
            )
        except ImportError:
            raise RuntimeError(
                "psycopg2 is required for PostgreSQL database access. "
                "Install it using: pip install psycopg2-binary"
            )
    return _pg_pool

def translate_sql(sql: str) -> str:
    """Translates SQLite SQL query with '?' placeholders to PostgreSQL '%s' placeholders."""
    if DB_ENGINE != "postgres":
        return sql
    return re.sub(r'\?', '%s', sql)

class PostgresCursorWrapper:
    """Wraps psycopg2 cursor to mirror sqlite3 cursor semantics (lastrowid, dict rows, rowcount)"""
    def __init__(self, raw_cursor):
        self._cursor = raw_cursor
        self.lastrowid = None

    def execute(self, sql, params=None):
        converted_sql = translate_sql(sql)
        params_tuple = tuple(params) if params is not None else None

        # If INSERT statement without RETURNING, append RETURNING id to capture lastrowid
        is_insert = converted_sql.strip().upper().startswith("INSERT INTO")
        has_returning = "RETURNING" in converted_sql.upper()

        if is_insert and not has_returning:
            converted_sql_with_returning = f"{converted_sql.rstrip(';')} RETURNING id;"
            try:
                self._cursor.execute(converted_sql_with_returning, params_tuple)
                row = self._cursor.fetchone()
                if row:
                    self.lastrowid = row[0] if isinstance(row, (tuple, list)) else (row.get("id") if isinstance(row, dict) else row[0])
                return self
            except Exception:
                # If table doesn't have an 'id' column or RETURNING fails, fallback to standard execution
                self._cursor.execute(converted_sql, params_tuple)
                return self
        else:
            self._cursor.execute(converted_sql, params_tuple)
            if is_insert and has_returning:
                try:
                    row = self._cursor.fetchone()
                    if row:
                        self.lastrowid = row[0] if isinstance(row, (tuple, list)) else (row.get("id") if isinstance(row, dict) else row[0])
                except Exception:
                    pass
            return self

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    def fetchmany(self, size=None):
        return self._cursor.fetchmany(size)

    @property
    def rowcount(self):
        return self._cursor.rowcount

    def close(self):
        self._cursor.close()

class PostgresConnectionWrapper:
    """Wraps psycopg2 connection to yield PostgresCursorWrapper with dictionary rows"""
    def __init__(self, raw_conn):
        self._conn = raw_conn

    def cursor(self):
        import psycopg2.extras
        raw_cur = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        return PostgresCursorWrapper(raw_cur)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        pass  # Handled by connection pool putconn

def get_connection():
    if DB_ENGINE == "postgres":
        pool = get_pg_pool()
        raw_conn = pool.getconn()
        return PostgresConnectionWrapper(raw_conn)
    else:
        conn = sqlite3.connect(DATABASE_PATH, timeout=20.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        return conn

@contextmanager
def get_db():
    if DB_ENGINE == "postgres":
        pool = get_pg_pool()
        raw_conn = pool.getconn()
        conn = PostgresConnectionWrapper(raw_conn)
        try:
            yield conn
            raw_conn.commit()
        except Exception:
            raw_conn.rollback()
            raise
        finally:
            pool.putconn(raw_conn)
    else:
        conn = get_connection()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

def query_all(sql, params=()):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def query_one(sql, params=()):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        row = cursor.fetchone()
        return dict(row) if row else None

def execute_write(sql, params=()):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return cursor.lastrowid

def execute_script(script_content):
    with get_db() as conn:
        if DB_ENGINE == "postgres":
            statements = [s.strip() for s in script_content.split(";") if s.strip()]
            cur = conn.cursor()
            for stmt in statements:
                cur.execute(stmt)
        else:
            conn.executescript(script_content)

def check_tables_exist() -> bool:
    """Checks whether the database tables exist without modifying or destroying data."""
    try:
        if DB_ENGINE == "postgres":
            res = query_one(
                "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='users'"
            )
            return bool(res)
        else:
            if not os.path.exists(DATABASE_PATH):
                return False
            res = query_one(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
            )
            return bool(res)
    except Exception:
        return False

def check_database_health() -> dict:
    """Probes the active database connection and returns health telemetry."""
    try:
        res = query_one("SELECT 1 AS alive")
        is_alive = bool(res and (res.get("alive") == 1 or list(res.values())[0] == 1))
        
        tables = []
        if DB_ENGINE == "postgres":
            rows = query_all("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
            tables = [r.get("table_name") or list(r.values())[0] for r in rows]
        else:
            rows = query_all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            tables = [r.get("name") or list(r.values())[0] for r in rows]

        return {
            "status": "connected" if is_alive else "unhealthy",
            "engine": "postgres" if DB_ENGINE == "postgres" else "sqlite",
            "engine_label": "PostgreSQL" if DB_ENGINE == "postgres" else "SQLite (WAL Mode)",
            "tables_count": len(tables),
            "tables": tables
        }
    except Exception as e:
        return {
            "status": "disconnected",
            "engine": "postgres" if DB_ENGINE == "postgres" else "sqlite",
            "engine_label": "PostgreSQL" if DB_ENGINE == "postgres" else "SQLite",
            "tables_count": 0,
            "tables": [],
            "error": str(e)
        }

def convert_schema_to_postgres(sqlite_schema: str) -> str:
    """Converts SQLite DDL schema to valid PostgreSQL DDL syntax."""
    lines = []
    for line in sqlite_schema.splitlines():
        # Skip PRAGMA statements
        if line.strip().upper().startswith("PRAGMA"):
            continue
        lines.append(line)

    schema = "\n".join(lines)
    # Replace AUTOINCREMENT with SERIAL PRIMARY KEY
    schema = re.sub(r'INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT', 'SERIAL PRIMARY KEY', schema, flags=re.IGNORECASE)
    # Replace DATETIME with TIMESTAMP
    schema = re.sub(r'\bDATETIME\b', 'TIMESTAMP', schema, flags=re.IGNORECASE)
    # Replace REAL with DOUBLE PRECISION
    schema = re.sub(r'\bREAL\b', 'DOUBLE PRECISION', schema, flags=re.IGNORECASE)
    return schema

def init_db(force_recreate=False):
    """
    Initializes database schema.
    IMPORTANT: Safe migration - never destroys existing data unless force_recreate=True.
    """
    if DB_ENGINE == "sqlite":
        if force_recreate and os.path.exists(DATABASE_PATH):
            os.remove(DATABASE_PATH)
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema_sql = f.read()
        execute_script(schema_sql)
    else:
        # PostgreSQL safe initialization
        if force_recreate:
            tables = [
                "webhook_deliveries", "webhook_subscriptions", "audit_logs",
                "store_settings", "wishlists", "refund_disputes", "reviews",
                "coupons", "tracking_events", "fulfillments", "order_items",
                "orders", "markup_rules", "product_variants", "products",
                "categories", "suppliers", "addresses", "users"
            ]
            with get_db() as conn:
                cur = conn.cursor()
                for tbl in tables:
                    try:
                        cur.execute(f"DROP TABLE IF EXISTS {tbl} CASCADE;")
                    except Exception:
                        pass

        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            sqlite_schema = f.read()
        pg_schema = convert_schema_to_postgres(sqlite_schema)
        execute_script(pg_schema)
