import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Link as MuiLink
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';

const currentHost = window.location.hostname;
const API_URL = import.meta.env.VITE_API_URL || `http://${currentHost}:8080`;

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
      const res = await axios.post(`${API_URL}/api/v1/clientes/login`, {
        numeroControlEmpleado: numeroControl,
        password: password
      });

      // Guardar la sesión del cliente
      localStorage.setItem('clienteSesion', JSON.stringify(res.data));
      
      // Redirigir a la consulta de tickets
      navigate('/cliente/tickets');
    } catch (err) {
      setError(
        err.response?.data?.message || 
        err.response?.data || 
        'Número de control o contraseña incorrectos.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
        <Box 
          sx={{ 
            display: 'inline-flex', 
            p: 1.5, 
            borderRadius: '50%', 
            backgroundColor: 'primary.light', 
            color: 'primary.main',
            mb: 1 
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 32 }} />
        </Box>

        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Portal Clientes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          SEDIF Cafetería - Iniciar Sesión
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>{error}</Alert>}

        <Box component="form" onSubmit={handleLogin}>
          <TextField
            label="Número de Control / Empleado"
            fullWidth
            required
            margin="normal"
            value={numeroControl}
            onChange={(e) => setNumeroControl(e.target.value)}
          />

          <TextField
            label="Contraseña"
            type="password"
            fullWidth
            required
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{ mt: 3, mb: 2, py: 1.2, fontWeight: 'bold' }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Ingresar'}
          </Button>

          <Box sx={{ mt: 1 }}>
            <MuiLink component={RouterLink} to="/registro-cliente" variant="body2" underline="hover">
              ¿No tienes cuenta? Regístrate aquí
            </MuiLink>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}