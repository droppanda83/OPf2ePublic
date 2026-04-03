$ErrorActionPreference = 'Stop'

try {
  $scriptPath = $MyInvocation.MyCommand.Path
  $scriptDir = if ($scriptPath) { Split-Path -Parent $scriptPath } else { '' }
  $baseDir = [System.AppDomain]::CurrentDomain.BaseDirectory

  $candidates = @()
  if ($baseDir) { $candidates += $baseDir }
  if ($scriptDir) {
    $candidates += $scriptDir
    $candidates += (Split-Path -Parent $scriptDir)
  }

  $root = $null
  foreach ($candidate in $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique) {
    $backendProbe = Join-Path $candidate 'backend'
    $frontendProbe = Join-Path $candidate 'frontend'
    if ((Test-Path $backendProbe) -and (Test-Path $frontendProbe)) {
      $root = $candidate
      break
    }
  }

  if (-not $root) {
    Write-Error "Could not find backend/frontend folders near the launcher executable."
    exit 1
  }

  $backendDir = Join-Path $root 'backend'
  $frontendDir = Join-Path $root 'frontend'

  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm run dev' -WorkingDirectory $backendDir -WindowStyle Normal
  Start-Sleep -Seconds 3
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm run dev' -WorkingDirectory $frontendDir -WindowStyle Normal
  Start-Sleep -Seconds 4
  Start-Process 'http://localhost:5173/'
}
catch {
  throw
}
