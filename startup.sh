#!/bin/bash
set -e

export PYTHONPATH="/home/site/wwwroot/.python_packages/lib/site-packages:/home/site/wwwroot/backend:${PYTHONPATH}"
export PORT=${PORT:-8080}

if [ -f /home/site/wwwroot/frontend/public/legacy/data/cities.json ]; then
  echo "=== Found legacy city registry ==="
else
  echo "=== WARNING: legacy city registry is missing ==="
fi

echo "=== Starting Uvicorn Server on port ${PORT} ==="
python3 -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
