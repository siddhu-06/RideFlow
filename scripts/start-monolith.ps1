$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$pwsh = (Get-Command pwsh -ErrorAction SilentlyContinue).Source
if (-not $pwsh) {
    $pwsh = (Get-Command powershell).Source
}

function Stop-ListenerOnPort {
    param([int] $Port)

    $pattern = "^\s*TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$"
    $processIds = netstat -ano |
        ForEach-Object {
            if ($_ -match $pattern) {
                [int] $matches[1]
            }
        } |
        Sort-Object -Unique

    foreach ($processId in $processIds) {
        if ($processId -and $processId -ne 0) {
            Write-Host "Stopping process $processId on port $Port"
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}

function Start-NpmProcess {
    param(
        [string] $Name,
        [string] $WorkingDirectory,
        [string] $NpmCommand,
        [string] $OutLog,
        [string] $ErrLog
    )

    Remove-Item -LiteralPath $OutLog, $ErrLog -Force -ErrorAction SilentlyContinue
    $escapedDirectory = $WorkingDirectory.Replace("'", "''")
    $command = "Set-Location -LiteralPath '$escapedDirectory'; npm $NpmCommand"

    $process = Start-Process -FilePath $pwsh `
        -ArgumentList @('-NoProfile', '-Command', $command) `
        -WorkingDirectory $WorkingDirectory `
        -WindowStyle Hidden `
        -RedirectStandardOutput $OutLog `
        -RedirectStandardError $ErrLog `
        -PassThru

    Write-Host "$Name started as process $($process.Id)"
    Write-Host "$Name logs: $OutLog / $ErrLog"
}

function Wait-Http {
    param(
        [string] $Name,
        [string] $Url,
        [int] $Seconds = 30
    )

    for ($i = 0; $i -lt $Seconds; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                Write-Host "$Name is ready at $Url"
                return
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    throw "$Name did not become ready at $Url. Check the log files printed above."
}

Write-Host "Checking MongoDB on localhost:27017..."
$mongoReady = (Test-NetConnection -ComputerName 127.0.0.1 -Port 27017 -WarningAction SilentlyContinue).TcpTestSucceeded
if (-not $mongoReady) {
    Write-Host "MongoDB is not listening on 27017. Start MongoDB before using RideFlow."
    exit 1
}

Stop-ListenerOnPort -Port 3000
Stop-ListenerOnPort -Port 5173

Write-Host "Starting RideFlow backend on http://localhost:3000"
Start-NpmProcess `
    -Name 'Backend' `
    -WorkingDirectory $backend `
    -NpmCommand 'start' `
    -OutLog (Join-Path $backend 'server.out.log') `
    -ErrLog (Join-Path $backend 'server.err.log')

Wait-Http -Name 'Backend' -Url 'http://localhost:3000/health'

Write-Host "Starting RideFlow frontend on http://localhost:5173"
Push-Location $frontend
npm run build
Pop-Location

Start-NpmProcess `
    -Name 'Frontend' `
    -WorkingDirectory $frontend `
    -NpmCommand 'run serve' `
    -OutLog (Join-Path $frontend 'vite.out.log') `
    -ErrLog (Join-Path $frontend 'vite.err.log')

Wait-Http -Name 'Frontend' -Url 'http://localhost:5173'

Write-Host "RideFlow is running at http://localhost:5173"
