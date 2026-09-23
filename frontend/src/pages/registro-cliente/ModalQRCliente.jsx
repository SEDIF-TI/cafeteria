import React from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Typography, Button } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';

export default function ModalQRCliente({ open, onClose }) {
  // Ajusta la URL según la IP de tu red local o dominio para que los celulares puedan acceder
  const urlRegistro = `${window.location.origin}/registro-cliente`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle textAlign="center" fontWeight="bold">
        Escanea para Registrarte
      </DialogTitle>
      <DialogContent textAlign="center">
        <Box display="flex" flexDirection="column" alignItems="center" my={2}>
          <QRCodeSVG value={urlRegistro} size={220} includeMargin={true} />
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