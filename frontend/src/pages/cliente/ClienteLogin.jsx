import React, { useState } from 'react';
import {
  Container, Paper, Typography, TextField, Button, Box, Alert, CircularProgress,
  Link as MuiLink
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '../../api/axiosClient';

export default function ClienteLogin() {
  const [numeroControl, setNumeroControl] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/clientes/login', {
        numeroControlEmpleado: numeroControl,
        password
      });
      // El token viaja en localStorage.token; axiosClient lo adjunta en cada peticion.
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('clienteSesion', JSON.stringify(res.data));

      if (res.data.debeCambiarPassword) {
        navigate('/cliente/cambiar-password');
      } else {
        navigate('/cliente/mi-apartado');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (typeof err.response?.data === 'string' ? err.response.data : null) ||
        (!err.response ? 'No se pudo conectar con el servidor.' : 'Número de control o contraseña incorrectos.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
        <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: '50%', backgroundColor: 'primary.light', color: 'primary.main', mb: 1 }}>
          <LockOutlinedIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="h5" fontWeight="bold" gutterBottom>Portal Clientes</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>SEDIF Cafetería - Iniciar Sesión</Typography>

        {error && <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>{error}</Alert>}

        <Box component="form" onSubmit={handleLogin}>
          <TextField label="Número de Control / Empleado" fullWidth required margin="normal"
            value={numeroControl} onChange={(e) => setNumeroControl(e.target.value)} />
          <TextField label="Contraseña" type="password" fullWidth required margin="normal"
            value={password} onChange={(e) => setPassword(e.target.value)} />

          <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}
            sx={{ mt: 3, mb: 1, py: 1.2, fontWeight: 'bold' }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Ingresar'}
          </Button>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            La primera vez entra con tu número de empleado + CAFE (ej. 5289CAFE).
          </Typography>

          <Box display="flex" justifyContent="space-between">
            <MuiLink component={RouterLink} to="/cliente/recuperar" variant="body2" underline="hover">
              ¿Olvidaste tu contraseña?
            </MuiLink>
            <MuiLink component={RouterLink} to="/registro-cliente" variant="body2" underline="hover">
              Regístrate
            </MuiLink>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
