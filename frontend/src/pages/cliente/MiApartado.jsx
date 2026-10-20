import React, { useEffect, useState } from 'react';
import {
  Container, Paper, Typography, Box, Card, CardContent, Chip, Divider, Button,
  CircularProgress, Alert, Stack, Collapse, IconButton
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LogoutIcon from '@mui/icons-material/Logout';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import KeyIcon from '@mui/icons-material/Key';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosClient';

const dinero = (v) => `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const fecha = (f) => (f ? new Date(f).toLocaleString('es-MX') : '');

function TicketCard({ ticket }) {
  const [abierto, setAbierto] = useState(false);
  const pendiente = Number(ticket.saldoPendiente) > 0;
  return (
    <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 2, borderColor: pendiente ? 'error.light' : undefined }}>
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" fontWeight="bold">Ticket #{ticket.id}</Typography>
          <Chip size="small" label={ticket.estado === 'PAGADO' ? 'PAGADO' : 'PENDIENTE'}
            color={ticket.estado === 'PAGADO' ? 'success' : 'error'} sx={{ fontWeight: 'bold' }} />
        </Box>
        <Typography variant="body2" color="text.secondary">{fecha(ticket.fecha)}</Typography>
        <Box display="flex" justifyContent="space-between" alignItems="flex-end" mt={1}>
          <Box>
            <Typography variant="h6" fontWeight="bold">{dinero(ticket.total)}</Typography>
            {pendiente && (
              <Typography variant="body2" color="error" fontWeight="bold">
                Debes: {dinero(ticket.saldoPendiente)}
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={() => setAbierto(!abierto)}
            sx={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
            <ExpandMoreIcon />
          </IconButton>
        </Box>
        <Collapse in={abierto}>
          <Divider sx={{ my: 1 }} />
          {(ticket.detalles || []).map((d, i) => (
            <Box key={i} display="flex" justifyContent="space-between">
              <Typography variant="body2">{d.cantidad}× {d.producto}</Typography>
              <Typography variant="body2">{dinero(d.subtotal)}</Typography>
            </Box>
          ))}
        </Collapse>
      </CardContent>
    </Card>
  );
}

export default function MiApartado() {
  const [cliente, setCliente] = useState(null);
  const [deudas, setDeudas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const salir = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('clienteSesion');
    navigate('/cliente/login');
  };

  useEffect(() => {
    const sesion = JSON.parse(localStorage.getItem('clienteSesion') || 'null');
    if (!sesion) { navigate('/cliente/login'); return; }
    if (sesion.debeCambiarPassword) { navigate('/cliente/cambiar-password'); return; }
    setCliente(sesion);

    const cargar = async () => {
      try {
        const [resDeudas, resHist] = await Promise.all([
          api.get('/clientes/mis-deudas'),
          api.get('/clientes/mis-tickets')
        ]);
        setDeudas(resDeudas.data || []);
        setHistorial(resHist.data || []);
      } catch (err) {
        if (err.response?.status === 401) { salir(); return; }
        setError('No se pudo cargar tu información. Intenta más tarde.');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const totalDeuda = deudas.reduce((acc, t) => acc + Number(t.saldoPendiente || 0), 0);

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight="bold">Hola, {cliente?.nombre}</Typography>
            <Typography variant="caption" color="text.secondary">
              {cliente?.area} · N° {cliente?.clienteId}
            </Typography>
          </Box>
          <Stack spacing={0.5} alignItems="flex-end">
            <Button size="small" color="error" startIcon={<LogoutIcon />} onClick={salir}>Salir</Button>
            <Button size="small" startIcon={<KeyIcon />} onClick={() => navigate('/cliente/cambiar-password')}>
              Contraseña
            </Button>
          </Stack>
        </Box>

        {loading && <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!loading && !error && (
          <>
            {/* Primero las deudas */}
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <WarningAmberIcon color={totalDeuda > 0 ? 'error' : 'disabled'} />
              <Typography variant="h6">Mis deudas</Typography>
            </Box>
            {deudas.length === 0 ? (
              <Alert severity="success" sx={{ mb: 3 }}>Estás al corriente, no tienes deudas pendientes.</Alert>
            ) : (
              <>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Debes un total de <b>{dinero(totalDeuda)}</b> en {deudas.length} ticket(s).
                </Alert>
                {deudas.map((t) => <TicketCard key={t.id} ticket={t} />)}
              </>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Luego el historial completo */}
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <ReceiptIcon />
              <Typography variant="h6">Historial de compras</Typography>
            </Box>
            {historial.length === 0 ? (
              <Typography color="text.secondary" align="center" my={3}>
                Aún no registras consumos en la cafetería.
              </Typography>
            ) : (
              historial.map((t) => <TicketCard key={t.id} ticket={t} />)
            )}
          </>
        )}
      </Paper>
    </Container>
  );
}
