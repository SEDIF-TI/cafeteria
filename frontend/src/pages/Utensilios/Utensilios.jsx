import React, { useState, useEffect, useMemo } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Chip, TextField, Button, Divider, Alert, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import api from '../../api/axiosClient';
import { useFeedback } from '../../components/FeedbackProvider';

const formatearFecha = (f) => (f ? new Date(f).toLocaleString('es-MX') : '—');

// Resumen de piezas pendientes (cantidad - ya devueltas) del juego.
const resumenPiezas = (detalles) =>
  (detalles || [])
    .map((d) => `${d.utensilio}×${(d.cantidad || 0) - (d.cantidadDevuelta || 0)}`)
    .join(', ');

/**
 * Recolección de cubiertos: muestra los juegos que están FUERA de la cafetería,
 * agrupados por área, para recuperarlos pasando área por área. Al recogerlos se
 * marca el juego como recogido (devuelto).
 */
export default function Utensilios() {
  const { notificar } = useFeedback();
  const [prestamos, setPrestamos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [confirmar, setConfirmar] = useState(null); // préstamo a marcar como recogido

  const cargar = async () => {
    try {
      const res = await api.get('/prestamos-utensilios', { params: { abiertos: true } });
      setPrestamos(res.data || []);
    } catch {
      notificar('No se pudieron cargar los cubiertos fuera de la cafetería.', 'error');
    }
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = useMemo(() => {
    const t = busqueda.toLowerCase().trim();
    return (prestamos || []).filter((p) =>
      !t || [p.area, p.codigoEmpleado, p.nombreEmpleado].some((v) => (v || '').toLowerCase().includes(t))
    );
  }, [prestamos, busqueda]);

  // Agrupado por área (áreas en orden alfabético, juegos recientes primero).
  const porArea = useMemo(() => {
    const mapa = {};
    filtrados.forEach((p) => {
      const area = p.area || 'Sin área';
      (mapa[area] = mapa[area] || []).push(p);
    });
    return Object.keys(mapa)
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
      .map((area) => ({
        area,
        items: mapa[area].sort((a, b) => new Date(b.fechaSalida) - new Date(a.fechaSalida))
      }));
  }, [filtrados]);

  const marcarRecogido = async () => {
    if (!confirmar) return;
    try {
      await api.patch(`/prestamos-utensilios/${confirmar.id}/devolver`);
      setConfirmar(null);
      await cargar();
      notificar('Cubiertos marcados como recogidos.', 'success');
    } catch (err) {
      notificar(err.response?.data?.message || 'No se pudo marcar como recogido.', 'error');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <RestaurantIcon color="primary" fontSize="large" />
        <Typography variant="h4" sx={{
          fontWeight: "bold"
        }}>Recolección de cubiertos</Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mb: 3
        }}>
        Juegos de cubiertos que están fuera de la cafetería, agrupados por área. Marca “Recogido” cuando los recuperes.
      </Typography>

      <TextField
        size="small"
        placeholder="Buscar por área, empleado o código"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        sx={{ minWidth: 300, mb: 3 }}
      />

      {porArea.length === 0 && (
        <Alert severity="success">No hay cubiertos fuera de la cafetería.</Alert>
      )}

      {porArea.map(({ area, items }) => (
        <Paper key={area} elevation={2} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, bgcolor: '#f8fafc' }}>
            <PlaceIcon color="primary" />
            <Typography variant="h6" sx={{
              fontWeight: "bold"
            }}>{area}</Typography>
            <Chip size="small" color="warning" label={`${items.length} juego${items.length === 1 ? '' : 's'} fuera`} />
          </Box>
          <Divider />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><b>Empleado / referencia</b></TableCell>
                  <TableCell><b>Piezas</b></TableCell>
                  <TableCell><b>Desde</b></TableCell>
                  <TableCell align="center"><b>Acción</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Typography sx={{
                        fontWeight: "bold"
                      }}>
                        {p.nombreEmpleado || p.codigoEmpleado || 'Público general'}
                      </Typography>
                      {p.codigoEmpleado && (
                        <Typography variant="body2" sx={{
                          color: "text.secondary"
                        }}>{p.codigoEmpleado}</Typography>
                      )}
                    </TableCell>
                    <TableCell>{resumenPiezas(p.detalles)}</TableCell>
                    <TableCell>{formatearFecha(p.fechaSalida)}</TableCell>
                    <TableCell align="center">
                      <Button variant="contained" color="success" size="small" onClick={() => setConfirmar(p)}>
                        Recogido
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}

      <Dialog open={!!confirmar} onClose={() => setConfirmar(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Marcar como recogido</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.primary' }}>
            Se marcarán como recogidos los cubiertos de{' '}
            <b>{confirmar?.nombreEmpleado || confirmar?.codigoEmpleado || 'Público general'}</b>
            {confirmar?.area ? <> en <b>{confirmar.area}</b></> : null}. ¿Continuar?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" color="error" onClick={() => setConfirmar(null)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={marcarRecogido}>Confirmar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
