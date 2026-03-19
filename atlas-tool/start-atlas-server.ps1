$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $scriptDir -WindowStyle Normal

Start-Sleep -Seconds 4
Start-Process "http://localhost:5173/?page=database"
