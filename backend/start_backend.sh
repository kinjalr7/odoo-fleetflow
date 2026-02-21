#!/bin/bash
# FleetFlow Backend Startup Script
# Usage: ./start_backend.sh

set -e

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BACKEND_DIR"

# Kill any previously running instance
pkill -f "uvicorn main:app" 2>/dev/null || true
sleep 1

# Activate venv
source venv/bin/activate

# Seed if database doesn't exist
if [ ! -f "fleetflow.db" ]; then
    echo "First run — database will be created & seeded automatically"
fi

echo "Starting FleetFlow Python/FastAPI backend on http://localhost:8001"
echo "  API docs: http://localhost:8001/docs"
echo "  WebSocket: ws://localhost:8001/ws"
echo ""
echo "Demo accounts (password: admin123):"
echo "  admin@fleetflow.com       — Fleet Manager"
echo "  dispatcher@fleetflow.com  — Dispatcher"
echo "  safety@fleetflow.com      — Safety Officer"
echo "  finance@fleetflow.com     — Financial Analyst"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8001 --reload
