import React, { useState } from 'react';
import {
  Box, Container, Paper, Typography, TextField, Button,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Alert, Checkbox
} from '@mui/material';
import axios from 'axios';

export default function RegistroClientePublico() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    telegramChatId: '',
    preferenciaNotificacion: 'EMAIL'
  });
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Ajustar a la URL publica de tu backend Spring Boot
      await axios.post('http://localhost:8080/api/v1/clientes/registro-publico', formData);
      setExito(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Ocurrió un error al registrar tus datos.');
    } finally {
      setLoading(false);
    }
  };

  if (exito) {
    return (
      <Container maxWidth="xs" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h5" color="primary" fontWeight="bold" gutterBottom>
            ¡Registro Completado!
          </Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            Ya estás registrado en la Cafetería. Ya puedes pedir tus consumos en caja dando tu nombre.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xs" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" textAlign="center" color="#691c32" gutterBottom>
          Registro de Cliente - SEDIF Cafetería
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
          Escanea y regístrate para recibir tus tickets de compra de forma digital.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField
            label="Nombre Completo"
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
          <TextField
            label="ID de Chat / Usuario Telegram"
            name="telegramChatId"
            fullWidth
            margin="normal"
            helperText="Opcional: Si deseas recibir tus tickets por Telegram"
            value={formData.telegramChatId}
            onChange={handleChange}
          />

          <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
            <FormLabel component="legend">¿Cómo prefieres recibir tu ticket?</FormLabel>
            <RadioGroup
              name="preferenciaNotificacion"
              value={formData.preferenciaNotificacion}
              onChange={handleChange}
            >
              <FormControlLabel value="EMAIL" control={<Radio />} label="Correo Electrónico" />
              <FormControlLabel value="TELEGRAM" control={<Radio />} label="Telegram" />
              <FormControlLabel value="AMBOS" control={<Radio />} label="Ambos Medios" />
              <FormControlLabel value="NINGUNO" control={<Radio />} label="No enviar ticket digital" />
            </RadioGroup>
          </FormControl>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{ mt: 3, backgroundColor: '#691c32', py: 1.5 }}
          >
            {loading ? 'Guardando...' : 'Completar Registro'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}