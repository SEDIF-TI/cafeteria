# Permite que celulares en la misma red WiFi abran la app (puertos 5173 frontend y 8080 backend).
# Ejecutar UNA VEZ en PowerShell como Administrador:
#   powershell -ExecutionPolicy Bypass -File .\scripts\habilitar-red-local.ps1

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Este script debe ejecutarse como Administrador." -ForegroundColor Red
    exit 1
}

foreach ($puerto in 5173, 8080) {
    $nombre = "SEDIF Cafeteria - puerto $puerto"
    if (-not (Get-NetFirewallRule -DisplayName $nombre -ErrorAction SilentlyContinue)) {
        # Se habilita en todos los perfiles porque Windows suele marcar el WiFi como "Publico"
        New-NetFirewallRule -DisplayName $nombre -Direction Inbound -Protocol TCP -LocalPort $puerto `
            -Action Allow -Profile Any | Out-Null
        Write-Host "Regla creada: $nombre" -ForegroundColor Green
    } else {
        Write-Host "Ya existe: $nombre"
    }
}

Write-Host "`nAbre en el celular (misma red):" -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notlike 'vEthernet*' } |
    ForEach-Object { Write-Host "  http://$($_.IPAddress):5173/registro-cliente" }
