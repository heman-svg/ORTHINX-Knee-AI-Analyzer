import os
import sys

print("1. Set sys.path", flush=True)
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

print("2. Importing app.main", flush=True)
from app.main import app
print("3. App imported", flush=True)

import uvicorn
print("4. Starting uvicorn", flush=True)
uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
