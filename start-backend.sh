#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ -f "$HOME/Developer/Environments/ranano-venv/bin/activate" ]; then
  source "$HOME/Developer/Environments/ranano-venv/bin/activate"
elif [ -f ".venv/bin/activate" ]; then
  source ".venv/bin/activate"
else
  echo "No virtual environment found. Create one and install backend/requirements.txt first."
  exit 1
fi
exec uvicorn backend.main:app --host 127.0.0.1 --port 8001
