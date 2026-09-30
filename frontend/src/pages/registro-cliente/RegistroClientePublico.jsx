import React, { useState } from 'react';
import {
  Container, Paper, Typography, TextField, Button, Box, Alert,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
  Card, CardContent, CircularProgress
} from '@mui/material';
import axios from 'axios';

const currentHost = window.location.hostname;
const API_URL = import.meta.env.VITE_API_URL || `http://${currentHost}:8080`;

export default function RegistroClientePublico() {
  const [formData, setFormData] = useState({
    numeroControlEmpleado: '',
    nombre: '',
    email: '',
    telefono: '',
    preferenciaNotificacion: 'EMAIL'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clienteRegistrado, setClienteRegistrado] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_URL}/api/v1/clientes/registro-publico`, formData);
      const dataExtraida = res.data?.data ? res.data.data : res.data;
      setClienteRegistrado(dataExtraida);
    } catch (err) {
      const msg = err.response?.data?.message || 
                  (typeof err.response?.data === 'string' ? err.response?.data : null) || 
                  'Ocurrió un error al registrar tus datos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (clienteRegistrado) {
    return (
      <Container maxWidth="xs" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
          {/* Icono SVG nativo sin dependencia de @mui/icons-material */}
          <Box
            component="svg"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="#2e7d32"
            sx={{ width: 70, height: 70, mb: 1, display: 'inline-block' }}
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </Box>

          <Typography variant="h5" fontWeight="bold" gutterBottom>
            ¡Registro Exitoso!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Guarda tus accesos para consultar tu historial de tickets:
          </Typography>

          <Card variant="outlined" sx={{ backgroundColor: '#f8f9fa', mb: 3, borderRadius: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Número de Control / Empleado
              </Typography>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                {clienteRegistrado.numeroControlEmpleado || formData.numeroControlEmpleado}
              </Typography>
              
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Contraseña de Consulta
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {clienteRegistrado.passwordGenerada || clienteRegistrado.password || 'Asignada'}
              </Typography>
            </CardContent>
          </Card>

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() => window.location.href = '/cliente/login'}
            sx={{
              backgroundColor: '#691c32',
              '&:hover': { backgroundColor: '#521526' },
              borderRadius: 2
            }}
          >
            Ir a la Vista de Consulta
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xs" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight="bold" align="center" gutterBottom>
          Registro de Cliente
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
          SEDIF Cafetería
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Número de Control / Empleado *"
            name="numeroControlEmpleado"
            fullWidth
            required
            margin="normal"
            value={formData.numeroControlEmpleado}
            onChange={handleChange}
          />
          <TextField
            label="Nombre Completo *"
            name="nombre"
            fullWidth
            required
            margin="normal"
            value={formData.nombre}
            onChange={handleChange}
          />
          <TextField
            label="Correo Electrónico"
            name="email"
            type="email"
            fullWidth
            margin="normal"
            value={formData.email}
            onChange={handleChange}
          />
          <TextField
            label="Teléfono"
            name="telefono"
            fullWidth
            margin="normal"
            value={formData.telefono}
            onChange={handleChange}
          />

          <FormControl component="fieldset" margin="normal">
            <FormLabel component="legend">¿Cómo prefieres recibir tu ticket?</FormLabel>
            <RadioGroup
              name="preferenciaNotificacion"
              value={formData.preferenciaNotificacion}
              onChange={handleChange}
            >
              <FormControlLabel value="EMAIL" control={<Radio />} label="Correo Electrónico" />
              <FormControlLabel value="NINGUNO" control={<Radio />} label="No recibir notificaciones" />
            </RadioGroup>
          </FormControl>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{
              mt: 2,
              backgroundColor: '#691c32',
              '&:hover': { backgroundColor: '#521526' },
              borderRadius: 2
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Completar Registro'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}