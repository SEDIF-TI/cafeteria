import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, Backdrop, CircularProgress, Typography, Box } from '@mui/material';

/**
 * Proveedor global de feedback para toda la app:
 *  - notificar(mensaje, severidad)  -> aviso tipo "toast" (Snackbar de MUI), no bloqueante.
 *  - cargar(mensaje)  / finalizarCarga()  -> pantalla de carga (Backdrop + spinner).
 *
 * Reemplaza los alert() nativos del navegador por una experiencia consistente.
 */
const FeedbackContext = createContext({
  notificar: () => {},
  cargar: () => {},
  finalizarCarga: () => {},
});

export const useFeedback = () => useContext(FeedbackContext);

export function FeedbackProvider({ children }) {
  const [snack, setSnack] = useState({ open: false, mensaje: '', severidad: 'info' });
  const [carga, setCarga] = useState({ open: false, mensaje: '' });

  const notificar = useCallback((mensaje, severidad = 'info') => {
    setSnack({ open: true, mensaje, severidad });
  }, []);

  const cargar = useCallback((mensaje = 'Procesando...') => {
    setCarga({ open: true, mensaje });
  }, []);

  const finalizarCarga = useCallback(() => {
    setCarga((c) => ({ ...c, open: false }));
  }, []);

  const cerrarSnack = (_event, reason) => {
    if (reason === 'clickaway') return;
    setSnack((s) => ({ ...s, open: false }));
  };

  return (
    <FeedbackContext.Provider value={{ notificar, cargar, finalizarCarga }}>
      {children}

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={cerrarSnack}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={cerrarSnack}
          severity={snack.severidad}
          variant="filled"
          sx={{ width: '100%', boxShadow: 4, borderRadius: 2, fontSize: '1rem' }}
        >
          {snack.mensaje}
        </Alert>
      </Snackbar>

      <Backdrop
        open={carga.open}
        sx={{ color: '#fff', zIndex: (t) => t.zIndex.modal + 10, flexDirection: 'column', gap: 2 }}
      >
        <CircularProgress color="inherit" />
        {carga.mensaje && (
          <Box>
            <Typography variant="h6" sx={{
              fontWeight: "bold"
            }}>{carga.mensaje}</Typography>
          </Box>
        )}
      </Backdrop>
    </FeedbackContext.Provider>
  );
}
