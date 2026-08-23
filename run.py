import os
import sys
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"=== Starting DeadMind Server on port {port} ===")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port)
