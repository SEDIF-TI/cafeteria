import React from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Typography, Button } from '@mui/material';
import QRCode from 'react-qr-code'; 

export default function ModalQRCliente({ open, onClose }) {
  const urlRegistro = `${window.location.origin}/registro-cliente`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
        Escanea para Registrarte
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2, textAlign: 'center' }}>
          <QRCode value={urlRegistro} size={220} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
            Apunta la cámara de tu celular para abrir el formulario de registro.
          </Typography>
        </Box>
        <Button fullWidth onClick={onClose} variant="outlined" sx={{ mt: 1 }}>
          Cerrar
        </Button>
      </DialogContent>
    </Dialog>
  );
}