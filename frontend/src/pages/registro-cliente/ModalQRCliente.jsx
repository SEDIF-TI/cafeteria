import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Button, Typography } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import QRCode from 'react-qr-code';

export default function ModalQRCliente({ open, onClose }) {
  const urlRegistro = `${import.meta.env.VITE_PUBLIC_URL || window.location.origin}/registro-cliente`;

  const handleImprimir = () => {
    // Abrir una ventana nueva limpia dedicada exclusivamente a la impresión
    const ventanaImpresion = window.open('', '_blank', 'width=800,height=900');
    
    if (!ventanaImpresion) {
      alert('Por favor permite las ventanas emergentes (pop-ups) para imprimir el QR.');
      return;
    }

    const contenidoHTML = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Imprimir QR - SEDIF Cafetería</title>
          <style>
            @page {
              size: letter portrait;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              background-color: #ffffff;
              font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
            }
            .hoja-contenedor {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              width: 100vw;
              height: 100vh;
              text-align: center;
              box-sizing: border-box;
              padding: 40px;
            }
            h1 {
              color: #691c32;
              font-size: 36px;
              margin: 0 0 8px 0;
              font-weight: 900;
            }
            h2 {
              color: #555555;
              font-size: 22px;
              margin: 0 0 36px 0;
              font-weight: 700;
            }
            .marco-qr {
              background: #ffffff;
              padding: 24px;
              border: 4px solid #691c32;
              border-radius: 20px;
              display: inline-block;
              box-shadow: 0 6px 18px rgba(0,0,0,0.06);
            }
            p {
              font-size: 18px;
              font-weight: 600;
              margin-top: 36px;
              color: #222222;
              max-width: 420px;
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          <div class="hoja-contenedor">
            <h1>Registro de Cliente</h1>
            <h2>SEDIF Cafetería</h2>
            
            <div class="marco-qr">
              ${document.getElementById('qr-svg-container')?.innerHTML || ''}
            </div>

            <p>Escanea con tu celular para registrarte y consultar tus tickets digitales.</p>
          </div>

          <script>
            window.onload = function() {
              window.onafterprint = function() { window.close(); };
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    ventanaImpresion.document.open();
    ventanaImpresion.document.write(contenidoHTML);
    ventanaImpresion.document.close();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Box sx={{ p: 2 }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: '900', fontSize: '1.6rem', pb: 0.5, color: '#691c32' }}>
          Registro de Cliente
        </DialogTitle>
        <Typography variant="subtitle1" textAlign="center" fontWeight="bold" color="text.secondary" sx={{ mb: 2 }}>
          SEDIF Cafetería
        </Typography>

        <DialogContent sx={{ p: 1, overflow: 'hidden' }}>
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
            <Box 
              id="qr-svg-container"
              sx={{ 
                background: 'white', 
                p: 2.5, 
                display: 'inline-block', 
                border: '3px solid #691c32', 
                borderRadius: '16px'
              }}
            >
              <QRCode value={urlRegistro} size={220} />
            </Box>

            <Typography 
              variant="body1" 
              textAlign="center" 
              fontWeight="600" 
              color="text.primary" 
              sx={{ mt: 3, px: 2, fontSize: '1.05rem' }}
            >
              Escanea con tu celular para registrarte y consultar tus tickets digitales.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 2, justifyContent: 'space-between' }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 'bold' }}>
            Cerrar
          </Button>
          <Button 
            onClick={handleImprimir} 
            variant="contained" 
            startIcon={<PrintIcon />}
            sx={{ backgroundColor: '#691c32', fontWeight: 'bold', '&:hover': { backgroundColor: '#4a1323' } }}
          >
            Imprimir QR
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}