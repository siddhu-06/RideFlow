$ports = @(3000, 5173)

foreach ($port in $ports) {
    $pattern = "^\s*TCP\s+\S+:$port\s+\S+\s+LISTENING\s+(\d+)\s*$"
    $processIds = netstat -ano |
        ForEach-Object {
            if ($_ -match $pattern) {
                [int] $matches[1]
            }
        } |
        Sort-Object -Unique

    foreach ($processId in $processIds) {
        if ($processId -and $processId -ne 0) {
            Write-Host "Stopping process $processId on port $port"
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "RideFlow monolith ports stopped."
