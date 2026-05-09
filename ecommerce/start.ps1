param()

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $projectRoot 'backend'
$frontendDir = Join-Path $projectRoot 'frontend'

$nodeDir = 'C:\Program Files\nodejs'
if (Test-Path $nodeDir) {
  $env:Path = "$nodeDir;$env:Path"
}

function Write-Section([string]$title) {
  Write-Host ''
  Write-Host ('=' * 68)
  Write-Host $title
  Write-Host ('=' * 68)
}

function Stop-PortProcess([int]$port) {
  try {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
      $pid = $listener.OwningProcess
      if ($pid -and $pid -match '^\d+$') {
        try {
          & taskkill /F /PID $pid /T | Out-Null
          Write-Host "[OK] Cleared port $port (PID $pid)"
        } catch {
          Write-Host "[WARN] Could not stop PID $pid on port $port"
        }
      }
    }
  } catch {
    Write-Host "[WARN] Port cleanup failed for $port"
  }
}

function Ensure-NpmDependencies([string]$dirPath, [string]$label) {
  $nodeModules = Join-Path $dirPath 'node_modules'
  if (Test-Path $nodeModules) {
    Write-Host "[OK] $label dependencies already installed"
    return
  }

  Write-Host "[INFO] Installing $label dependencies..."
  Push-Location $dirPath
  try {
    & npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
      throw "$label dependency installation failed"
    }
  }
  finally {
    Pop-Location
  }
  Write-Host "[OK] $label dependencies installed"
}

function Start-NpmProcess([string]$dirPath, [string]$npmArgs, [string]$logPrefix) {
  $stdoutLog = Join-Path $projectRoot "$logPrefix.out.log"
  $stderrLog = Join-Path $projectRoot "$logPrefix.err.log"
  if (Test-Path $stdoutLog) {
    try { Remove-Item $stdoutLog -Force -ErrorAction Stop } catch { }
  }
  if (Test-Path $stderrLog) {
    try { Remove-Item $stderrLog -Force -ErrorAction Stop } catch { }
  }

  return Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', "npm $npmArgs") -WorkingDirectory $dirPath -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog
}

Write-Section 'VENDORHUB - ONE COMMAND STARTER'
Write-Host "Project root: $projectRoot"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host '[ERROR] Node.js not found. Install Node.js v18+ first.' -ForegroundColor Red
  exit 1
}

Write-Host "Node: $(& node --version)"
Write-Host "npm : $(& npm --version)"

Write-Section 'INSTALLING DEPENDENCIES'
Ensure-NpmDependencies -dirPath $backendDir -label 'Backend'
Ensure-NpmDependencies -dirPath $frontendDir -label 'Frontend'

Write-Section 'CLEARING PORTS'
Stop-PortProcess -port 4000
Stop-PortProcess -port 3000

Write-Section 'STARTING SERVICES'
Write-Host '[INFO] Starting backend on port 4000...'
$backend = Start-NpmProcess -dirPath $backendDir -npmArgs 'start' -logPrefix 'backend'

Write-Host '[INFO] Starting frontend on port 3000...'
$frontend = Start-NpmProcess -dirPath $frontendDir -npmArgs 'run dev -- --host 0.0.0.0 --port 3000 --strictPort' -logPrefix 'frontend'

Write-Section 'LOGIN LINKS'
Write-Host 'Customer Login:'
Write-Host '  http://localhost:4000/customer/login'
Write-Host ''
Write-Host 'Vendor Login:'
Write-Host '  http://localhost:4000/vendor/login'
Write-Host ''
Write-Host 'Admin Login:'
Write-Host '  http://localhost:4000/admin/login'
Write-Host ''
Write-Host 'Backend API:  http://localhost:4000'
Write-Host 'Frontend UI:  http://localhost:3000'
Write-Host ''
Write-Host 'Test credentials:'
Write-Host '  customer@vendorhub.local / customer123'
Write-Host '  vendor@vendorhub.local   / vendor123'
Write-Host '  admin@vendorhub.local    / admin123'
Write-Host ''

Write-Host '[INFO] Waiting for services...'
$backendReady = $false
$frontendReady = $false
for ($i = 0; $i -lt 45; $i++) {
  if (-not $backendReady) {
    try {
      Invoke-WebRequest -Uri 'http://localhost:4000/health' -UseBasicParsing -TimeoutSec 2 | Out-Null
      $backendReady = $true
    } catch { }
  }

  if (-not $frontendReady) {
    try {
      Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2 | Out-Null
      $frontendReady = $true
    } catch { }
  }

  if ($backendReady -and $frontendReady) { break }
  Start-Sleep -Seconds 1
}

if ($backendReady) {
  Write-Host '[OK] Backend is reachable.'
} else {
  Write-Host '[WARN] Backend did not respond within the wait period.' -ForegroundColor Yellow
}

if ($frontendReady) {
  Write-Host '[OK] Frontend is reachable.'
} else {
  Write-Host '[WARN] Frontend did not respond within the wait period.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Logs:'
Write-Host "  $projectRoot\backend.out.log"
Write-Host "  $projectRoot\backend.err.log"
Write-Host "  $projectRoot\frontend.out.log"
Write-Host "  $projectRoot\frontend.err.log"
Write-Host ''
Write-Host 'Press Ctrl+C to stop this window and close the child processes.'

try {
  while (($backend -and -not $backend.HasExited) -or ($frontend -and -not $frontend.HasExited)) {
    Start-Sleep -Seconds 1
  }
}
finally {
  foreach ($proc in @($backend, $frontend)) {
    if ($proc -and -not $proc.HasExited) {
      try { $proc.Kill() } catch { }
    }
  }
}