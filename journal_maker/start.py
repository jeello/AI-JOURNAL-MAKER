#!/usr/bin/env python3
"""
Startup script with error handling for Railway deployment
"""
import os
import sys
import traceback

print("=== AI Journal Maker Starting ===", flush=True)
print(f"Python version: {sys.version}", flush=True)
print(f"Working directory: {os.getcwd()}", flush=True)

# Check required environment variables
required_vars = ["OPENROUTER_API_KEY"]
optional_vars = ["DATABASE_URL", "CLOUDINARY_URL"]

print("\n=== Environment Variables ===", flush=True)
missing_required = []
for var in required_vars:
    value = os.getenv(var)
    if value:
        print(f"{var}: ✓ SET", flush=True)
    else:
        print(f"{var}: ✗ MISSING", flush=True)
        missing_required.append(var)

for var in optional_vars:
    value = os.getenv(var)
    if value:
        print(f"{var}: ✓ SET", flush=True)
    else:
        print(f"{var}: ✗ NOT SET (using local/dev mode)", flush=True)

if missing_required:
    print(f"\n⚠️  WARNING: Missing required vars: {missing_required}", flush=True)
    print("Some features may not work!", flush=True)

# Get port - Railway sets PORT env var
port = int(os.getenv("PORT", "8000"))
print(f"\n=== Starting Server on port {port} ===", flush=True)

try:
    import uvicorn
    uvicorn.run(
        "journal_app:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
except Exception as e:
    print(f"\n❌ FATAL ERROR: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)
