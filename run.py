import subprocess
import sys
import os

def run():
    print("=== Starting DeadMind Startup Script ===")
    
    # 1. Install dependencies
    print("Installing python requirements...")
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
            check=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        print("Downloading spaCy model...")
        subprocess.run(
            [sys.executable, "-m", "spacy", "download", "en_core_web_sm"],
            check=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
    except Exception as e:
        print("Failed to install requirements or spacy model:", e)

    # 2. Seed database (skipped to save memory on Render, db is committed)
    print("Skipping generate_demo_data.py (database should be checked into git)...")
        
    # 3. Start server
    print("Starting FastAPI/Uvicorn server at http://localhost:8000 ...")
    try:
        import uvicorn
        # Import main app directly
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from backend.main import app
        uvicorn.run(app, host="0.0.0.0", port=8000)
    except KeyboardInterrupt:
        print("\nStopping DeadMind server...")
    except Exception as e:
        print("Failed to run uvicorn server:", e)

if __name__ == "__main__":
    run()
