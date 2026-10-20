import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent, Button, TextField,
  CircularProgress, Alert, Divider, Chip, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Dialog, DialogTitle, DialogContent, DialogActions, Stack
} from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import api from '../../api/axiosClient';

const dinero = (v) => `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const fechaHora = (f) => (f ? new Date(f).toLocaleString('es-MX') : '—');

export default function Caja() {
  const [turno, setTurno] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const [fondo, setFondo] = useState('');
  const [abriendo, setAbriendo] = useState(false);

  const [openCierre, setOpenCierre] = useState(false);
  const [contado, setContado] = useState('');
  const [cerrando, setCerrando] = useState(false);

  const cargar = async () => {
    setError('');
    try {
      const [resActivo, resHist] = await Promise.all([
        api.get('/turnos/activo').catch((e) => (e.response?.status === 204 ? { data: null } : Promise.reject(e))),
        api.get('/turnos').catch(() => ({ data: [] }))
      ]);
      setTurno(resActivo.data || null);
      setHistorial(resHist.data || []);
    } catch (err) {
      setError('No se pudo cargar la información de caja.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirTurno = async () => {
    const monto = parseFloat(fondo);
    if (isNaN(monto) || monto < 0) { setAviso('Ingresa un fondo inicial válido.'); return; }
    setAbriendo(true);
    try {
      await api.post('/turnos/abrir', { fondoCaja: monto });
      setFondo('');
      await cargar();
    } catch (err) {
      setAviso(err.response?.data?.message || 'No se pudo abrir el turno.');
    } finally {
      setAbriendo(false);
    }
  };

  const cerrarTurno = async () => {
    const monto = parseFloat(contado);
    if (isNaN(monto) || monto < 0) { setAviso('Ingresa el efectivo contado.'); return; }
    setCerrando(true);
    try {
      await api.post('/turnos/cerrar', { totalContado: monto });
      setOpenCierre(false);
      setContado('');
      await cargar();
    } catch (err) {
      setAviso(err.response?.data?.message || 'No se pudo cerrar el turno.');
    } finally {
      setCerrando(false);
    }
  };

  const esperado = turno ? Number(turno.totalEsperado) : 0;
  const diferenciaPrevista = contado !== '' ? parseFloat(contado) - esperado : null;

  const chipDiferencia = (dif) => {
    const n = Number(dif);
    if (n === 0) return <Chip size="small" color="success" label="Cuadrado" />;
    return <Chip size="small" color={n < 0 ? 'error' : 'warning'}
      label={`${n < 0 ? 'Faltante' : 'Sobrante'} ${dinero(Math.abs(n))}`} />;
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" my={8}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <PointOfSaleIcon color="primary" />
        <Typography variant="h4" fontWeight="bold">Caja y turnos</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Abre un turno con el fondo de caja, cobra durante el día y ciérralo con el arqueo del efectivo.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {aviso && <Alert severity="info" onClose={() => setAviso('')} sx={{ mb: 2 }}>{aviso}</Alert>}

      {/* Estado del turno */}
      {turno ? (
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderLeft: '5px solid #2e7d32' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <LockOpenIcon color="success" />
              <Typography variant="h6" fontWeight="bold">Turno abierto</Typography>
              <Chip size="small" color="success" label={turno.nombreCajero} />
            </Box>
            <Button variant="contained" color="error" startIcon={<LockIcon />} onClick={() => setOpenCierre(true)}>
              Cerrar turno (arqueo)
            </Button>
          </Box>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {[
              ['Apertura', fechaHora(turno.fechaHoraApertura)],
              ['Fondo inicial', dinero(turno.fondoInicial)],
              ['Ingresos en efectivo', dinero(turno.totalIngresos)],
              ['Esperado en caja', dinero(turno.totalEsperado)]
            ].map(([label, valor]) => (
              <Grid item xs={6} md={3} key={label}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="h6" fontWeight="bold">{valor}</Typography>
              </Grid>
            ))}
          </Grid>
        </Paper>
      ) : (
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderLeft: '5px solid #ed6c02' }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <LockIcon color="warning" />
            <Typography variant="h6" fontWeight="bold">No hay turno abierto</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Para cobrar ventas en efectivo y registrar abonos necesitas abrir un turno.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField label="Fondo inicial de caja ($)" type="number" value={fondo}
              onChange={(e) => setFondo(e.target.value)} inputProps={{ min: 0, step: '0.01' }} sx={{ maxWidth: 240 }} />
            <Button variant="contained" startIcon={<LockOpenIcon />} onClick={abrirTurno} disabled={abriendo}>
              {abriendo ? 'Abriendo…' : 'Abrir turno'}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Historial de cortes */}
      <Typography variant="h6" fontWeight="bold" mb={1}>Historial de cortes</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><b>Cajero</b></TableCell>
              <TableCell><b>Apertura</b></TableCell>
              <TableCell><b>Cierre</b></TableCell>
              <TableCell align="right"><b>Fondo</b></TableCell>
              <TableCell align="right"><b>Ingresos</b></TableCell>
              <TableCell align="right"><b>Esperado</b></TableCell>
              <TableCell align="right"><b>Contado</b></TableCell>
              <TableCell align="center"><b>Arqueo</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {historial.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>{t.nombreCajero}</TableCell>
                <TableCell>{fechaHora(t.fechaHoraApertura)}</TableCell>
                <TableCell>{fechaHora(t.fechaHoraCierre)}</TableCell>
                <TableCell align="right">{dinero(t.fondoInicial)}</TableCell>
                <TableCell align="right">{dinero(t.totalIngresos)}</TableCell>
                <TableCell align="right">{dinero(t.totalEsperado)}</TableCell>
                <TableCell align="right">{dinero(t.totalContado)}</TableCell>
                <TableCell align="center">{chipDiferencia(t.diferencia)}</TableCell>
              </TableRow>
            ))}
            {historial.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 3 }}>Aún no hay cortes registrados</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal de cierre / arqueo */}
      <Dialog open={openCierre} onClose={() => !cerrando && setOpenCierre(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cerrar turno — arqueo</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Box display="flex" justifyContent="space-between">
              <Typography color="text.secondary">Esperado en caja</Typography>
              <Typography fontWeight="bold">{dinero(esperado)}</Typography>
            </Box>
            <Divider />
            <TextField label="Efectivo contado ($)" type="number" value={contado} autoFocus
              onChange={(e) => setContado(e.target.value)} inputProps={{ min: 0, step: '0.01' }} />
            {diferenciaPrevista !== null && !isNaN(diferenciaPrevista) && (
              <Alert severity={diferenciaPrevista === 0 ? 'success' : diferenciaPrevista < 0 ? 'error' : 'warning'}>
                {diferenciaPrevista === 0
                  ? 'La caja cuadra exactamente.'
                  : `${diferenciaPrevista < 0 ? 'Faltante' : 'Sobrante'} de ${dinero(Math.abs(diferenciaPrevista))}.`}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCierre(false)} disabled={cerrando}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={cerrarTurno} disabled={cerrando}>
            {cerrando ? 'Cerrando…' : 'Cerrar turno'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
