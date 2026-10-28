import React, { useEffect, useState, useMemo } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Chip, TextField, MenuItem, CircularProgress, Alert, IconButton, Collapse,
  Stack, InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import api from '../../api/axiosClient';
import usePaginacion from '../../hooks/usePaginacion';
import PaginacionTabla from '../../components/PaginacionTabla';

const dinero = (v) => `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const fechaHora = (f) => (f ? new Date(f).toLocaleString('es-MX') : '—');
const soloFecha = (f) => (f ? new Date(f).toISOString().slice(0, 10) : '');

const estadoChip = (estado) => {
  const pagado = estado === 'PAGADO' || estado === 'COMPLETADO';
  return <Chip size="small" label={pagado ? 'Pagado' : estado === 'CANCELADO' ? 'Cancelado' : 'Pendiente'}
    color={pagado ? 'success' : estado === 'CANCELADO' ? 'default' : 'warning'} />;
};

function FilaVenta({ venta }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton size="small" onClick={() => setAbierto(!abierto)}
            sx={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
            <KeyboardArrowDownIcon />
          </IconButton>
        </TableCell>
        <TableCell>#{venta.id}</TableCell>
        <TableCell>{fechaHora(venta.fechaCreacion)}</TableCell>
        <TableCell>{venta.clienteNombre || 'Público general'}</TableCell>
        <TableCell>{venta.clienteArea || '—'}</TableCell>
        <TableCell>{venta.metodoPago || '—'}</TableCell>
        <TableCell align="right">{dinero(venta.total)}</TableCell>
        <TableCell align="right">
          {Number(venta.saldoPendiente) > 0
            ? <Typography variant="body2" color="error">{dinero(venta.saldoPendiente)}</Typography>
            : '—'}
        </TableCell>
        <TableCell align="center">{estadoChip(venta.estado)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={9} sx={{ py: 0, border: 0 }}>
          <Collapse in={abierto} unmountOnExit>
            <Box sx={{ m: 1, ml: 6 }}>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>Detalle del ticket</Typography>
              <Table size="small">
                <TableBody>
                  {(venta.detalles || []).map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{d.cantidad}× {d.productoNombre}</TableCell>
                      <TableCell align="right">{dinero(d.precioUnitario)} c/u</TableCell>
                      <TableCell align="right">{dinero(d.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                  {(!venta.detalles || venta.detalles.length === 0) && (
                    <TableRow><TableCell colSpan={3}>Sin detalle</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('TODAS');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        // La venta solo trae IDs; los nombres se resuelven con los catálogos de clientes y productos.
        const [resV, resC, resP] = await Promise.all([
          api.get('/ventas'),
          api.get('/clientes').catch(() => ({ data: [] })),
          api.get('/productos').catch(() => ({ data: [] }))
        ]);

        const mapaC = {}; (resC.data || []).forEach(c => { mapaC[c.id] = c; });
        const mapaP = {}; (resP.data || []).forEach(p => { mapaP[p.id] = p; });

        const enriquecidas = (resV.data || []).map(v => ({
          ...v,
          clienteNombre: v.clienteId ? mapaC[v.clienteId]?.nombre : null,
          clienteArea: v.clienteId ? mapaC[v.clienteId]?.area : null,
          detalles: (v.detalles || []).map(d => ({
            ...d,
            productoNombre: mapaP[d.productoId]?.nombre || 'Producto'
          }))
        }));

        setVentas(enriquecidas);
      } catch (err) {
        setError('No se pudo cargar el historial de ventas.');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const filtradas = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();
    return ventas
      .filter((v) => {
        if (estado === 'PAGADAS') return v.estado === 'PAGADO' || v.estado === 'COMPLETADO';
        if (estado === 'PENDIENTES') return v.estado === 'PENDIENTE';
        return true;
      })
      .filter((v) => {
        if (!texto) return true;
        return [v.clienteNombre, v.clienteArea, String(v.id), v.metodoPago]
          .some((c) => (c || '').toString().toLowerCase().includes(texto));
      })
      .filter((v) => {
        const f = soloFecha(v.fechaCreacion);
        if (desde && f < desde) return false;
        if (hasta && f > hasta) return false;
        return true;
      })
      .sort((a, b) => b.id - a.id);
  }, [ventas, busqueda, estado, desde, hasta]);

  const totalPeriodo = filtradas.reduce((acc, v) => acc + Number(v.total || 0), 0);
  const totalPendiente = filtradas.reduce((acc, v) => acc + Number(v.saldoPendiente || 0), 0);

  const pag = usePaginacion(filtradas);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <ReceiptLongIcon color="primary" fontSize="large" />
        <Typography variant="h4" sx={{
          fontWeight: "bold"
        }}>Historial de ventas</Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mb: 4
        }}>
        Todas las ventas registradas, con su detalle, estado y saldo pendiente.
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField size="small" placeholder="Buscar cliente, área, ticket o método" value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)} sx={{ minWidth: 260 }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }
          }} />
        <TextField size="small" select label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="TODAS">Todas</MenuItem>
          <MenuItem value="PAGADAS">Pagadas</MenuItem>
          <MenuItem value="PENDIENTES">Pendientes</MenuItem>
        </TextField>
        <TextField size="small" type="date" label="Desde" slotProps={{ inputLabel: { shrink: true } }}
          value={desde} onChange={(e) => setDesde(e.target.value)} />
        <TextField size="small" type="date" label="Hasta" slotProps={{ inputLabel: { shrink: true } }}
          value={hasta} onChange={(e) => setHasta(e.target.value)} />
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip label={`${filtradas.length} ventas`} />
        <Chip color="primary" variant="outlined" label={`Total: ${dinero(totalPeriodo)}`} />
        {totalPendiente > 0 && <Chip color="warning" variant="outlined" label={`Por cobrar: ${dinero(totalPendiente)}`} />}
      </Stack>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && (
        <TableContainer component={Paper}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell><b>Ticket</b></TableCell>
                <TableCell><b>Fecha</b></TableCell>
                <TableCell><b>Cliente</b></TableCell>
                <TableCell><b>Área</b></TableCell>
                <TableCell><b>Método</b></TableCell>
                <TableCell align="right"><b>Total</b></TableCell>
                <TableCell align="right"><b>Saldo</b></TableCell>
                <TableCell align="center"><b>Estado</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pag.pagina.map((v) => <FilaVenta key={v.id} venta={v} />)}
              {filtradas.length === 0 && (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3 }}>Sin ventas para los filtros seleccionados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {filtradas.length > 0 && <PaginacionTabla pag={pag} />}
        </TableContainer>
      )}
    </Container>
  );
}
