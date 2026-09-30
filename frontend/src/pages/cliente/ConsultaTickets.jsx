import React, { useEffect, useState } from 'react';
import {
  Container, Paper, Typography, Box, Card, CardContent, Chip,
  Divider, Button, CircularProgress, Alert
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LogoutIcon from '@mui/icons-material/Logout';
import axios from 'axios';

const currentHost = window.location.hostname;
const API_URL = import.meta.env.VITE_API_URL || `http://${currentHost}:8080`;

export default function ConsultaTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cliente, setCliente] = useState(null);

  useEffect(() => {
    const sesionStr = localStorage.getItem('clienteSesion');
    if (!sesionStr) {
      window.location.href = '/cliente/login';
      return;
    }
    const clienteSesion = JSON.parse(sesionStr);
    setCliente(clienteSesion);

    const fetchTickets = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/v1/clientes/${clienteSesion.id}/tickets`);
        setTickets(res.data);
      } catch (err) {
        setError('Error al cargar tu historial de compras.');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('clienteSesion');
    window.location.href = '/cliente/login';
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Hola, {cliente?.nombre}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              N° Control: {cliente?.numeroControlEmpleado}
            </Typography>
          </Box>
          <Button color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>
            Salir
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
          <ReceiptIcon /> Mis Tickets de Consumo
        </Typography>

        {loading && <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!loading && tickets.length === 0 && (
          <Typography color="text.secondary" align="center" my={4}>
            No registras consumos realizados en la cafetería.
          </Typography>
        )}

        {tickets.map((ticket) => (
          <Card key={ticket.id} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Ticket #{ticket.id}
                </Typography>
                <Chip
                  label={ticket.estadoPago === 'PAGADO' ? 'PAGADO' : 'PENDIENTE DE PAGO'}
                  color={ticket.estadoPago === 'PAGADO' ? 'success' : 'error'}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>

              <Typography variant="body2" color="text.secondary">
                Fecha: {new Date(ticket.fecha).toLocaleString('es-MX')}
              </Typography>

              <Typography variant="h6" color="primary" sx={{ mt: 1, fontWeight: 'bold' }}>
                ${Number(ticket.total).toFixed(2)} MXN
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Paper>
    </Container>
  );
}