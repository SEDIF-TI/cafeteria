import React, { useState } from 'react';
import {
  Container, Paper, Typography, TextField, Button, Box, Alert, CircularProgress,
  Link as MuiLink
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '../../api/axiosClient';

export default function RecuperarPasswordCliente() {
  const [paso, setPaso] = useState(1);
  const [numeroControl, setNumeroControl] = useState('');
  const [codigo, setCodigo] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const solicitar = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const res = await api.post('/clientes/recuperar/solicitar', { numeroControlEmpleado: numeroControl });
      setInfo(res.data?.message || 'Si el código existe y tiene correo, te enviamos un código.');
      setPaso(2);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const confirmar_ = async (e) => {
    e.preventDefault();
    setError('');
    if (passwordNueva !== confirmar) {
      setError('La confirmación no coincide.');
      return;
    }
    if (passwordNueva.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/clientes/recuperar/confirmar', {
        numeroControlEmpleado: numeroControl,
        codigo,
        passwordNueva
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Código inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            fontWeight: "bold",
            textAlign: "center"
          }}>
          Recuperar contraseña
        </Typography>
        {info && <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {paso === 1 ? (
          <Box component="form" onSubmit={solicitar}>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mb: 1
              }}>
              Te enviaremos un código a tu correo registrado. Si no registraste correo, acude con el administrador.
            </Typography>
            <TextField label="Número de control / empleado" fullWidth required margin="normal"
              value={numeroControl} onChange={(e) => setNumeroControl(e.target.value)} />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}
              sx={{ mt: 2, py: 1.2, fontWeight: 'bold' }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Enviar código'}
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={confirmar_}>
            <TextField label="Código recibido por correo" fullWidth required margin="normal"
              value={codigo} onChange={(e) => setCodigo(e.target.value)} slotProps={{
              htmlInput: { inputMode: 'numeric' }
            }} />
            <TextField label="Nueva contraseña" type="password" fullWidth required margin="normal"
              value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} helperText="Mínimo 6 caracteres" />
            <TextField label="Confirmar nueva contraseña" type="password" fullWidth required margin="normal"
              value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}
              sx={{ mt: 2, py: 1.2, fontWeight: 'bold' }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Restablecer'}
            </Button>
            <Button fullWidth sx={{ mt: 1 }} onClick={() => { setPaso(1); setError(''); setInfo(''); }}>
              Volver
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <MuiLink component={RouterLink} to="/login" variant="body2" underline="hover">
            Volver a iniciar sesión
          </MuiLink>
        </Box>
      </Paper>
    </Container>
  );
}
