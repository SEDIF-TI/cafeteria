# Publica la app en internet con un tunel gratuito de Cloudflare para registrarse desde
# cualquier red (datos moviles incluidos). Requiere backend (8080) y frontend (npm run dev, 5173) corriendo.
#   powershell -ExecutionPolicy Bypass -File .\scripts\tunel-publico.ps1
#
# El tunel apunta solo al frontend: Vite reenvia /api al backend, asi que no hace falta exponer el 8080.
# La URL https://xxxx.trycloudflare.com cambia cada vez que se ejecuta. Para el QR, abre el sistema
# del cajero con esa misma URL (o ponla en VITE_PUBLIC_URL de frontend/.env y reinicia npm run dev).

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando cloudflared con winget..." -ForegroundColor Yellow
    winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
                [System.Environment]::GetEnvironmentVariable('Path', 'User')
}

Write-Host "Busca abajo la linea con https://....trycloudflare.com y agrega /registro-cliente" -ForegroundColor Cyan
cloudflared tunnel --url http://localhost:5173
