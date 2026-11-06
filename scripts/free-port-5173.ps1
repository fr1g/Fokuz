$conns = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
foreach ($c in ($conns | Select-Object -ExpandProperty OwningProcess -Unique)) {
  $p = Get-Process -Id $c -ErrorAction SilentlyContinue
  Write-Host ("killing pid=" + $c + " name=" + $(if ($p) { $p.ProcessName } else { "?" }))
  Stop-Process -Id $c -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Milliseconds 800
if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) {
  Write-Host "port 5173 still busy"
} else {
  Write-Host "port 5173 free"
}
