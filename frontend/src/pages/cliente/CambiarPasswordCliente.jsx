import React, { useState } from 'react';
import {
  Container, Paper, Typography, TextField, Button, Box, Alert, CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosClient';

export default function CambiarPasswordCliente() {
  const [form, setForm] = useState({ passwordActual: '', passwordNueva: '', confirmar: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const sesion = JSON.parse(localStorage.getItem('clienteSesion') || 'null');
  const esForzado = sesion?.debeCambiarPassword;

  const handleChange = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.passwordNueva !== form.confirmar) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    if (form.passwordNueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/clientes/cambiar-password', {
        passwordActual: form.passwordActual,
        passwordNueva: form.passwordNueva
      });
      if (sesion) {
        localStorage.setItem('clienteSesion', JSON.stringify({ ...sesion, debeCambiarPassword: false }));
      }
      navigate('/cliente/mi-apartado');
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
        return;
      }
      setError(err.response?.data?.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom textAlign="center">
          {esForzado ? 'Crea tu contraseña' : 'Cambiar contraseña'}
        </Typography>
        {esForzado && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Por seguridad, cambia la contraseña temporal por una propia antes de continuar.
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField label={esForzado ? 'Contraseña temporal (código + CAFE)' : 'Contraseña actual'}
            type="password" fullWidth required margin="normal"
            value={form.passwordActual} onChange={handleChange('passwordActual')} />
          <TextField label="Nueva contraseña" type="password" fullWidth required margin="normal"
            value={form.passwordNueva} onChange={handleChange('passwordNueva')} helperText="Mínimo 6 caracteres" />
          <TextField label="Confirmar nueva contraseña" type="password" fullWidth required margin="normal"
            value={form.confirmar} onChange={handleChange('confirmar')} />

          <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}
            sx={{ mt: 3, py: 1.2, fontWeight: 'bold' }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Guardar'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
