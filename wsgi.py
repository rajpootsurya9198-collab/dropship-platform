import os
import sys

# Ensure root directory is in python search path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server.app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
