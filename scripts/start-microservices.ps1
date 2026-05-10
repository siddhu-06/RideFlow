$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$paths = @{
    Gateway = Join-Path $root 'microservices/gateway'
    User = Join-Path $root 'microservices/user'
    Captain = Join-Path $root 'microservices/captain'
    Ride = Join-Path $root 'microservices/ride'
}
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
        [string] $OutLog,
        [string] $ErrLog
    )

    Remove-Item -LiteralPath $OutLog, $ErrLog -Force -ErrorAction SilentlyContinue
    $escapedDirectory = $WorkingDirectory.Replace("'", "''")
    $command = "Set-Location -LiteralPath '$escapedDirectory'; npm start"

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
    Write-Host "MongoDB is not listening on 27017. Start MongoDB before using RideFlow microservices."
    exit 1
}

foreach ($port in @(3000, 3001, 3002, 3003)) {
    Stop-ListenerOnPort -Port $port
}

Write-Host "RabbitMQ is optional for local dev. If it is not running, ride service uses HTTP fallback."

Start-NpmProcess -Name 'User service' -WorkingDirectory $paths.User -OutLog (Join-Path $paths.User 'server.out.log') -ErrLog (Join-Path $paths.User 'server.err.log')
Start-NpmProcess -Name 'Captain service' -WorkingDirectory $paths.Captain -OutLog (Join-Path $paths.Captain 'server.out.log') -ErrLog (Join-Path $paths.Captain 'server.err.log')
Start-NpmProcess -Name 'Ride service' -WorkingDirectory $paths.Ride -OutLog (Join-Path $paths.Ride 'server.out.log') -ErrLog (Join-Path $paths.Ride 'server.err.log')

Wait-Http -Name 'User service' -Url 'http://localhost:3001/health'
Wait-Http -Name 'Captain service' -Url 'http://localhost:3002/health'
Wait-Http -Name 'Ride service' -Url 'http://localhost:3003/health'

Start-NpmProcess -Name 'Gateway' -WorkingDirectory $paths.Gateway -OutLog (Join-Path $paths.Gateway 'server.out.log') -ErrLog (Join-Path $paths.Gateway 'server.err.log')
Wait-Http -Name 'Gateway' -Url 'http://localhost:3000/health'

Write-Host "RideFlow microservices are running through gateway http://localhost:3000"
