import React, { useState } from 'react';
import {
  Box, Container, Paper, Typography, TextField, Button,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Alert
} from '@mui/material';
import api from '../../api/axiosClient';

export default function RegistroClientePublico() {
  const [formData, setFormData] = useState({
    nombre: '',
    numeroControlEmpleado: '',
    area: '',
    email: '',
    telefono: '',
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
      await api.post('/clientes', formData);
      setExito(true);
    } catch (err) {
      const errores = err.response?.data?.data;
      const detalle = errores && typeof errores === 'object' ? Object.values(errores).join('. ') : null;
      const errorMsg = (!err.response && 'No se pudo conectar con el servidor. Verifica tu conexión a la red.') ||
                       detalle ||
                       err.response?.data?.message ||
                       (typeof err.response?.data === 'string' ? err.response.data : null) || 
                       'Ocurrió un error al registrar tus datos. Verifica que los campos sean válidos.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (exito) {
    return (
      <Container maxWidth="xs" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h5" color="primary" gutterBottom sx={{
            fontWeight: "bold"
          }}>
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
        <Typography
          variant="h6"
          align="center"
          gutterBottom
          sx={{
            fontWeight: "bold",
            color: 'primary.main'
          }}>
          Registro de Cliente - SEDIF Cafetería
        </Typography>
        <Typography
          variant="body2"
          align="center"
          sx={{
            color: "text.secondary",
            mb: 3
          }}>
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
            label="Código / N° de empleado"
            name="numeroControlEmpleado"
            fullWidth
            required
            margin="normal"
            value={formData.numeroControlEmpleado}
            onChange={handleChange}
            helperText="Con este código el cajero te identifica en la venta"
          />
          <TextField
            label="Área a la que perteneces (ej. Piso 2 - Jurídico)"
            name="area"
            fullWidth
            required
            margin="normal"
            value={formData.area}
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

          <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
            <FormLabel component="legend">¿Cómo prefieres recibir tu ticket?</FormLabel>
            <RadioGroup
              name="preferenciaNotificacion"
              value={formData.preferenciaNotificacion}
              onChange={handleChange}
            >
              <FormControlLabel value="EMAIL" control={<Radio />} label="Correo Electrónico" />
              <FormControlLabel value="NINGUNO" control={<Radio />} label="No enviar ticket digital" />
            </RadioGroup>
          </FormControl>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{ mt: 3, backgroundColor: 'primary.main', py: 1.5, '&:hover': { backgroundColor: 'primary.dark' } }}
          >
            {loading ? 'Guardando...' : 'Completar Registro'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}