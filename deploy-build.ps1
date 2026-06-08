Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location frontend
npm install
npm run build
Pop-Location

Push-Location backend
python -m pip install -r requirements.txt
Pop-Location

Write-Host "Build complete. FastAPI will serve frontend/dist in production."
