import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Chip, Divider, Button, Avatar,
  CircularProgress, Alert, Stack, Collapse, IconButton, Paper
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LogoutIcon from '@mui/icons-material/Logout';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import KeyIcon from '@mui/icons-material/Key';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PaidIcon from '@mui/icons-material/Paid';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosClient';

const MARCA = '#691c32';
const dinero = (v) => `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const fecha = (f) => (f ? new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

function TicketCard({ ticket, destacarDeuda }) {
  const [abierto, setAbierto] = useState(false);
  const pendiente = Number(ticket.saldoPendiente) > 0;
  return (
    <Card
      elevation={0}
      sx={{
        mb: 1.5, borderRadius: 3, border: '1px solid',
        borderColor: pendiente && destacarDeuda ? 'error.light' : '#ececef',
        overflow: 'hidden'
      }}
    >
      <CardContent sx={{ pb: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle2" color="text.secondary" fontWeight="600">
              Ticket #{ticket.id}
            </Typography>
            <Typography variant="caption" color="text.secondary">{fecha(ticket.fecha)}</Typography>
          </Box>
          <Chip size="small" label={ticket.estado === 'PAGADO' ? 'Pagado' : 'Pendiente'}
            color={ticket.estado === 'PAGADO' ? 'success' : 'warning'}
            sx={{ fontWeight: 'bold' }} />
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="flex-end" mt={1.5}>
          <Box>
            <Typography variant="h5" fontWeight="800">{dinero(ticket.total)}</Typography>
            {pendiente && (
              <Typography variant="body2" color="error" fontWeight="bold">
                Debes {dinero(ticket.saldoPendiente)}
              </Typography>
            )}
          </Box>
          <Button size="small" onClick={() => setAbierto(!abierto)}
            endIcon={<ExpandMoreIcon sx={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
            sx={{ color: MARCA, textTransform: 'none' }}>
            {abierto ? 'Ocultar' : 'Ver detalle'}
          </Button>
        </Box>

        <Collapse in={abierto}>
          <Divider sx={{ my: 1.5 }} />
          {(ticket.detalles || []).map((d, i) => (
            <Box key={i} display="flex" justifyContent="space-between" py={0.3}>
              <Typography variant="body2" color="text.secondary">{d.cantidad}× {d.producto}</Typography>
              <Typography variant="body2" fontWeight="600">{dinero(d.subtotal)}</Typography>
            </Box>
          ))}
        </Collapse>
      </CardContent>
    </Card>
  );
}

function Resumen({ icon, valor, etiqueta, color }) {
  return (
    <Paper elevation={0} sx={{ flex: 1, p: 2, borderRadius: 3, border: '1px solid #ececef', textAlign: 'center' }}>
      <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
      <Typography variant="h6" fontWeight="800" lineHeight={1.1}>{valor}</Typography>
      <Typography variant="caption" color="text.secondary">{etiqueta}</Typography>
    </Paper>
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
    navigate('/login');
  };

  useEffect(() => {
    const sesion = JSON.parse(localStorage.getItem('clienteSesion') || 'null');
    if (!sesion) { navigate('/login'); return; }
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
  const totalGastado = historial.reduce((acc, t) => acc + Number(t.total || 0), 0);
  const inicial = (cliente?.nombre || '?').trim().charAt(0).toUpperCase();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f7', pb: 6 }}>
      {/* Encabezado de marca */}
      <Box sx={{
        background: `linear-gradient(135deg, ${MARCA} 0%, #8a2342 100%)`,
        color: '#fff', px: 2, pt: 4, pb: 7,
        borderBottomLeftRadius: 28, borderBottomRightRadius: 28
      }}>
        <Container maxWidth="sm" disableGutters>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box display="flex" gap={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 52, height: 52, fontWeight: 800, fontSize: '1.4rem' }}>
                {inicial}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="800" lineHeight={1.1}>{cliente?.nombre}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  {cliente?.area} · N° {cliente?.clienteId}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={salir} sx={{ color: '#fff' }} title="Salir">
              <LogoutIcon />
            </IconButton>
          </Box>
          <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 2 }}>
            SEDIF Cafetería · Portal del cliente
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ mt: -4 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" my={6}><CircularProgress sx={{ color: MARCA }} /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            {/* Resumen */}
            <Stack direction="row" spacing={1.5} mb={3}>
              <Resumen icon={<PaidIcon />} color={totalDeuda > 0 ? 'error.main' : 'success.main'}
                valor={dinero(totalDeuda)} etiqueta="Por pagar" />
              <Resumen icon={<ShoppingBagIcon />} color={MARCA}
                valor={historial.length} etiqueta="Compras" />
              <Resumen icon={<ReceiptLongIcon />} color={MARCA}
                valor={dinero(totalGastado)} etiqueta="Total gastado" />
            </Stack>

            {/* Acciones rápidas */}
            <Button fullWidth variant="outlined" startIcon={<KeyIcon />}
              onClick={() => navigate('/cliente/cambiar-password')}
              sx={{ mb: 3, color: MARCA, borderColor: MARCA, textTransform: 'none', fontWeight: 'bold',
                '&:hover': { borderColor: MARCA, bgcolor: 'rgba(105,28,50,0.04)' } }}>
              Cambiar mi contraseña
            </Button>

            {/* Deudas */}
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <WarningAmberIcon sx={{ color: totalDeuda > 0 ? 'error.main' : 'text.disabled' }} />
              <Typography variant="h6" fontWeight="800">Mis deudas</Typography>
            </Box>
            {deudas.length === 0 ? (
              <Alert icon={<CheckCircleIcon fontSize="inherit" />} severity="success" sx={{ mb: 3, borderRadius: 3 }}>
                Estás al corriente, no tienes deudas pendientes.
              </Alert>
            ) : (
              <>
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 3 }}>
                  Debes un total de <b>{dinero(totalDeuda)}</b> en {deudas.length} ticket(s).
                </Alert>
                {deudas.map((t) => <TicketCard key={t.id} ticket={t} destacarDeuda />)}
              </>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Historial */}
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <ReceiptLongIcon sx={{ color: MARCA }} />
              <Typography variant="h6" fontWeight="800">Historial de compras</Typography>
            </Box>
            {historial.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px dashed #d8d8dc', textAlign: 'center' }}>
                <ShoppingBagIcon sx={{ fontSize: 48, color: '#cfcfd4', mb: 1 }} />
                <Typography color="text.secondary">Aún no registras consumos en la cafetería.</Typography>
              </Paper>
            ) : (
              historial.map((t) => <TicketCard key={t.id} ticket={t} />)
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
