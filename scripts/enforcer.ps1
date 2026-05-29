$folder = "D:\GAMEVAULT"
$limitBytes = 1.3 * 1024 * 1024 * 1024 # 1.3 GB

Write-Host "[ENFORCER] Initializing strict 1.3GB size limit watcher on $folder" -ForegroundColor Cyan

while ($true) {
    # Calculate total size of the folder
    $size = (Get-ChildItem $folder -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    
    if ($size -gt $limitBytes) {
        $sizeMB = [math]::Round($size / 1MB, 2)
        Write-Host "[ENFORCER] Warning: Workspace size ($sizeMB MB) exceeded 1.3GB limit! Purging caches..." -ForegroundColor Yellow
        
        # Tier 1: Safe caches that do not break running apps
        Remove-Item -Recurse -Force "$folder\apps\desktop\release" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "$folder\apps\web\.next\cache" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "$folder\node_modules\.cache" -ErrorAction SilentlyContinue
        
        # Re-check size
        $size = (Get-ChildItem $folder -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        if ($size -gt $limitBytes) {
            Write-Host "[ENFORCER] Tier 1 purge insufficient. Applying Tier 2 purge (Aggressive)..." -ForegroundColor Red
            # Tier 2: Aggressive purge (may require restarting dev server)
            Remove-Item -Recurse -Force "$folder\apps\web\.next" -ErrorAction SilentlyContinue
            Remove-Item -Recurse -Force "$folder\apps\desktop\dist" -ErrorAction SilentlyContinue
        }
        
        $newSizeMB = [math]::Round((Get-ChildItem $folder -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
        Write-Host "[ENFORCER] Purge complete. New size: $newSizeMB MB" -ForegroundColor Green
    }
    
    # Check every 30 seconds
    Start-Sleep -Seconds 30
}
