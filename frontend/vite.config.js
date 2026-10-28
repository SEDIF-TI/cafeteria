import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,           // escucha en todas las interfaces (celulares en la misma red)
    allowedHosts: true,   // permite dominios de tunel (cloudflared/ngrok) para acceso desde datos moviles
    watch: {
      // La carpeta vive en OneDrive; el watcher nativo de Windows pierde cambios ahi.
      // El polling revisa los archivos periodicamente y detecta TODO cambio de forma fiable.
      usePolling: true,
      interval: 300,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        xfwd: true,       // reenvia la IP real del celular al backend (limite de peticiones por IP)
      }
    }
  }
})