import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Chip, Divider, Button, Avatar,
  CircularProgress, Alert, Stack, Collapse, Paper, AppBar, Toolbar, IconButton,
  Menu, MenuItem, ListItemIcon, ListItemText, Grid
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
const fecha = (f) => (f ? new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

function TicketCard({ ticket, destacarDeuda }) {
  const [abierto, setAbierto] = useState(false);
  const pendiente = Number(ticket.saldoPendiente) > 0;
  return (
    <Card elevation={0} sx={{
      mb: 1.5, borderRadius: 3, border: '1px solid',
      borderColor: pendiente && destacarDeuda ? 'error.light' : '#ececef', overflow: 'hidden'
    }}>
      <CardContent sx={{ p: { xs: 1.75, sm: 2 }, '&:last-child': { pb: { xs: 1.75, sm: 2 } } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box minWidth={0}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight="600">Ticket #{ticket.id}</Typography>
            <Typography variant="caption" color="text.secondary">{fecha(ticket.fecha)}</Typography>
          </Box>
          <Chip size="small" label={ticket.estado === 'PAGADO' ? 'Pagado' : 'Pendiente'}
            color={ticket.estado === 'PAGADO' ? 'success' : 'warning'} sx={{ fontWeight: 'bold', flexShrink: 0 }} />
        </Box>
        <Box display="flex" justifyContent="space-between" alignItems="flex-end" mt={1.5} gap={1}>
          <Box minWidth={0}>
            <Typography variant="h5" fontWeight="800">{dinero(ticket.total)}</Typography>
            {pendiente && <Typography variant="body2" color="error" fontWeight="bold">Debes {dinero(ticket.saldoPendiente)}</Typography>}
          </Box>
          <Button size="small" onClick={() => setAbierto(!abierto)}
            endIcon={<ExpandMoreIcon sx={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
            sx={{ color: MARCA, textTransform: 'none', flexShrink: 0 }}>
            {abierto ? 'Ocultar' : 'Detalle'}
          </Button>
        </Box>
        <Collapse in={abierto}>
          <Divider sx={{ my: 1.5 }} />
          {(ticket.detalles || []).map((d, i) => (
            <Box key={i} display="flex" justifyContent="space-between" py={0.3} gap={1}>
              <Typography variant="body2" color="text.secondary" noWrap>{d.cantidad}× {d.producto}</Typography>
              <Typography variant="body2" fontWeight="600" flexShrink={0}>{dinero(d.subtotal)}</Typography>
            </Box>
          ))}
        </Collapse>
      </CardContent>
    </Card>
  );
}

function Resumen({ icon, valor, etiqueta, color }) {
  return (
    <Paper elevation={0} sx={{
      height: '100%', p: { xs: 1.25, sm: 2 }, borderRadius: 3, border: '1px solid #ececef', textAlign: 'center'
    }}>
      <Box sx={{ color, mb: 0.5, '& svg': { fontSize: { xs: 22, sm: 26 } } }}>{icon}</Box>
      <Typography fontWeight="800" lineHeight={1.1} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>{valor}</Typography>
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
  const [menuAnchor, setMenuAnchor] = useState(null);
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
      {/* ===== Barra superior a todo lo ancho ===== */}
      <AppBar position="sticky" elevation={0} sx={{ background: `linear-gradient(135deg, ${MARCA} 0%, #8a2342 100%)` }}>
        <Toolbar sx={{ px: { xs: 2, sm: 3 }, gap: 1 }}>
          {/* Avatar con menú (cambiar contraseña y futuras opciones) */}
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ p: 0.5 }} aria-label="menú de cuenta">
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.22)', color: '#fff', fontWeight: 800 }}>{inicial}</Avatar>
          </IconButton>

          {/* Información del usuario, distribuida a lo ancho */}
          <Box sx={{ flexGrow: 1, minWidth: 0, ml: 0.5 }}>
            <Typography fontWeight="800" lineHeight={1.15} noWrap sx={{ color: '#fff', fontSize: { xs: '1rem', sm: '1.15rem' } }}>
              {cliente?.nombre || 'Cliente'}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'rgba(255,255,255,0.85)', display: 'block' }}>
              {cliente?.area || 'SEDIF Cafetería'} · N° {cliente?.clienteId}
            </Typography>
          </Box>

          {/* Cerrar sesión siempre visible en la barra */}
          <Button onClick={salir} startIcon={<LogoutIcon />} sx={{
            color: '#fff', textTransform: 'none', fontWeight: 'bold', flexShrink: 0,
            '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } }
          }}>
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Salir</Box>
          </Button>

          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
            <MenuItem onClick={() => { setMenuAnchor(null); navigate('/cliente/cambiar-password'); }}>
              <ListItemIcon><KeyIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Cambiar contraseña</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setMenuAnchor(null); salir(); }}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Cerrar sesión</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* ===== Contenido ===== */}
      <Container maxWidth="sm" sx={{ pt: 3, px: { xs: 2, sm: 3 } }}>
        {loading ? (
          <Box display="flex" justifyContent="center" my={6}><CircularProgress sx={{ color: MARCA }} /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            {/* Resumen (responsivo) */}
            <Grid container spacing={{ xs: 1, sm: 1.5 }} mb={3}>
              <Grid item xs={4}>
                <Resumen icon={<PaidIcon />} color={totalDeuda > 0 ? 'error.main' : 'success.main'}
                  valor={dinero(totalDeuda)} etiqueta="Por pagar" />
              </Grid>
              <Grid item xs={4}>
                <Resumen icon={<ShoppingBagIcon />} color={MARCA} valor={historial.length} etiqueta="Compras" />
              </Grid>
              <Grid item xs={4}>
                <Resumen icon={<ReceiptLongIcon />} color={MARCA} valor={dinero(totalGastado)} etiqueta="Total gastado" />
              </Grid>
            </Grid>

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
