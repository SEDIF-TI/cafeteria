import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Button, Paper, Tabs, Tab, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, IconButton, Tooltip, Alert, Stack, FormControlLabel, Switch
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import api from '../../api/axiosClient';
import { useFeedback } from '../../components/FeedbackProvider';

const COLOR_ESTADO = {
  PRESTADO: 'warning',
  DEVUELTO_PARCIAL: 'info',
  DEVUELTO: 'success',
  PERDIDO: 'error'
};

const mensajeError = (err, porDefecto) =>
  err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null) || porDefecto;

const formatearFecha = (f) => (f ? new Date(f).toLocaleString('es-MX') : '—');

export default function Utensilios() {
  const { notificar, cargar, finalizarCarga } = useFeedback();
  // Solo los administradores gestionan el catalogo; los cajeros ven y devuelven.
  const esAdmin = (() => {
    try { return (JSON.parse(localStorage.getItem('user') || '{}').rol || '').toUpperCase().includes('ADMIN'); }
    catch { return false; }
  })();
  // El cajero aterriza directo en la pestana de devoluciones.
  const [tab, setTab] = useState(esAdmin ? 0 : 1);
  const [utensilios, setUtensilios] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [soloAbiertos, setSoloAbiertos] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');

  // Alta / edición de utensilio
  const [openUtensilio, setOpenUtensilio] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formUtensilio, setFormUtensilio] = useState({ nombre: '', stockTotal: '' });

  // Devolución (total o parcial)
  const [prestamoDevolucion, setPrestamoDevolucion] = useState(null);
  const [cantDevolucion, setCantDevolucion] = useState({});

  // Marcar como perdido (reemplaza el window.prompt nativo)
  const [prestamoPerdido, setPrestamoPerdido] = useState(null);
  const [obsPerdido, setObsPerdido] = useState('');

  const cargarUtensilios = async () => {
    try {
      const res = await api.get('/utensilios');
      setUtensilios(res.data || []);
    } catch (err) {
      setError(mensajeError(err, 'No se pudieron cargar los utensilios.'));
    }
  };

  const cargarPrestamos = async () => {
    try {
      const res = await api.get('/prestamos-utensilios', { params: { abiertos: soloAbiertos } });
      setPrestamos(res.data || []);
    } catch (err) {
      setError(mensajeError(err, 'No se pudieron cargar los préstamos.'));
    }
  };

  useEffect(() => {
    cargarUtensilios();
  }, []);

  useEffect(() => {
    cargarPrestamos();
  }, [soloAbiertos]);

  const abrirUtensilio = (u = null) => {
    setEditId(u?.id ?? null);
    setFormUtensilio(u ? { nombre: u.nombre, stockTotal: u.stockTotal } : { nombre: '', stockTotal: '' });
    setOpenUtensilio(true);
  };

  const guardarUtensilio = async () => {
    const body = { nombre: formUtensilio.nombre, stockTotal: Number(formUtensilio.stockTotal) };
    try {
      if (editId) {
        await api.put(`/utensilios/${editId}`, body);
      } else {
        await api.post('/utensilios', body);
      }
      setOpenUtensilio(false);
      cargarUtensilios();
      notificar(editId ? 'Utensilio actualizado.' : 'Utensilio registrado.', 'success');
    } catch (err) {
      notificar(mensajeError(err, 'No se pudo guardar el utensilio.'), 'error');
    }
  };

  const cambiarEstado = async (id) => {
    try {
      await api.patch(`/utensilios/${id}/estado`);
      cargarUtensilios();
    } catch (err) {
      notificar(mensajeError(err, 'No se pudo cambiar el estado.'), 'error');
    }
  };

  const abrirDevolucion = (p) => {
    const inicial = {};
    p.detalles.forEach((d) => { inicial[d.utensilioId] = d.cantidad - d.cantidadDevuelta; });
    setCantDevolucion(inicial);
    setPrestamoDevolucion(p);
  };

  const confirmarDevolucion = async () => {
    const items = Object.entries(cantDevolucion)
      .filter(([, c]) => Number(c) > 0)
      .map(([utensilioId, c]) => ({ utensilioId: Number(utensilioId), cantidad: Number(c) }));
    if (items.length === 0) {
      notificar('Indica al menos una pieza a devolver.', 'warning');
      return;
    }
    cargar('Registrando la devolución...');
    try {
      await api.patch(`/prestamos-utensilios/${prestamoDevolucion.id}/devolver`, { items });
      setPrestamoDevolucion(null);
      cargarPrestamos();
      cargarUtensilios();
      notificar('Devolución registrada.', 'success');
    } catch (err) {
      notificar(mensajeError(err, 'No se pudo registrar la devolución.'), 'error');
    } finally {
      finalizarCarga();
    }
  };

  const abrirPerdido = (p) => {
    setObsPerdido('');
    setPrestamoPerdido(p);
  };

  const confirmarPerdido = async () => {
    cargar('Actualizando el préstamo...');
    try {
      await api.patch(`/prestamos-utensilios/${prestamoPerdido.id}/perdido`, { observaciones: obsPerdido });
      setPrestamoPerdido(null);
      cargarPrestamos();
      cargarUtensilios();
      notificar('Piezas marcadas como perdidas.', 'success');
    } catch (err) {
      notificar(mensajeError(err, 'No se pudo marcar como perdido.'), 'error');
    } finally {
      finalizarCarga();
    }
  };

  const texto = busqueda.toLowerCase();
  const prestamosFiltrados = prestamos.filter((p) =>
    [p.codigoEmpleado, p.nombreEmpleado, p.area].some((v) => (v || '').toLowerCase().includes(texto))
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Utensilios y trazabilidad de cubiertos
      </Typography>
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Catálogo y stock" />
        <Tab label="Cubiertos fuera de la cafetería" />
      </Tabs>

      {tab === 0 && (
        <Paper sx={{ p: 2 }}>
          {esAdmin && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => abrirUtensilio()}>
                Nuevo utensilio
              </Button>
            </Box>
          )}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Utensilio</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">En cafetería</TableCell>
                  <TableCell align="right">Fuera</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {utensilios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.nombre}</TableCell>
                    <TableCell align="right">{u.stockTotal}</TableCell>
                    <TableCell align="right">{u.stockDisponible}</TableCell>
                    <TableCell align="right">
                      {u.enPrestamo > 0 ? <Chip size="small" color="warning" label={u.enPrestamo} /> : 0}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={u.activo ? 'Activo' : 'Inactivo'} color={u.activo ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="center">
                      {esAdmin ? (
                        <>
                          <Tooltip title="Editar"><IconButton onClick={() => abrirUtensilio(u)}><EditIcon /></IconButton></Tooltip>
                          <Tooltip title="Activar / desactivar"><IconButton onClick={() => cambiarEstado(u.id)}><ToggleOnIcon /></IconButton></Tooltip>
                        </>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {utensilios.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center">Sin utensilios registrados</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems={{ sm: 'center' }}>
            <TextField
              size="small"
              label="Buscar por empleado o área"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              sx={{ minWidth: 280 }}
            />
            <FormControlLabel
              control={<Switch checked={soloAbiertos} onChange={(e) => setSoloAbiertos(e.target.checked)} />}
              label="Solo pendientes de devolver"
            />
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Empleado</TableCell>
                  <TableCell>Área / ubicación</TableCell>
                  <TableCell>Cubiertos</TableCell>
                  <TableCell>Salida</TableCell>
                  <TableCell>Devolución</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {prestamosFiltrados.map((p) => {
                  const abierto = p.estado === 'PRESTADO' || p.estado === 'DEVUELTO_PARCIAL';
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Typography fontWeight="bold">{p.codigoEmpleado}</Typography>
                        <Typography variant="body2" color="text.secondary">{p.nombreEmpleado || 'Sin nombre registrado'}</Typography>
                      </TableCell>
                      <TableCell>{p.area}</TableCell>
                      <TableCell>
                        {p.detalles.map((d) => (
                          <div key={d.utensilioId}>
                            {d.utensilio}: {d.cantidad}{d.cantidadDevuelta > 0 ? ` (devueltos ${d.cantidadDevuelta})` : ''}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>{formatearFecha(p.fechaSalida)}</TableCell>
                      <TableCell>{formatearFecha(p.fechaDevolucion)}</TableCell>
                      <TableCell><Chip size="small" label={p.estado.replace('_', ' ')} color={COLOR_ESTADO[p.estado]} /></TableCell>
                      <TableCell align="center">
                        {abierto && (
                          <>
                            <Tooltip title="Registrar devolución">
                              <IconButton color="success" onClick={() => abrirDevolucion(p)}><AssignmentReturnIcon /></IconButton>
                            </Tooltip>
                            <Tooltip title="Marcar como perdido">
                              <IconButton color="error" onClick={() => abrirPerdido(p)}><ReportProblemIcon /></IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {prestamosFiltrados.length === 0 && (
                  <TableRow><TableCell colSpan={7} align="center">No hay cubiertos fuera de la cafetería</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={openUtensilio} onClose={() => setOpenUtensilio(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editId ? 'Editar utensilio' : 'Nuevo utensilio'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre (ej. Cuchara, Tenedor, Plato)"
              value={formUtensilio.nombre}
              onChange={(e) => setFormUtensilio({ ...formUtensilio, nombre: e.target.value })}
              fullWidth
            />
            <TextField
              label="Cantidad total de piezas"
              type="number"
              value={formUtensilio.stockTotal}
              onChange={(e) => setFormUtensilio({ ...formUtensilio, stockTotal: e.target.value })}
              inputProps={{ min: 0 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUtensilio(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarUtensilio}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!prestamoDevolucion} onClose={() => setPrestamoDevolucion(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Registrar devolución</DialogTitle>
        <DialogContent>
          {prestamoDevolucion && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2">
                {prestamoDevolucion.codigoEmpleado} — {prestamoDevolucion.area}
              </Typography>
              {prestamoDevolucion.detalles.map((d) => {
                const pendiente = d.cantidad - d.cantidadDevuelta;
                if (pendiente <= 0) return null;
                return (
                  <TextField
                    key={d.utensilioId}
                    label={`${d.utensilio} (pendientes: ${pendiente})`}
                    type="number"
                    size="small"
                    value={cantDevolucion[d.utensilioId] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || (Number(val) >= 0 && Number(val) <= pendiente)) {
                        setCantDevolucion((prev) => ({ ...prev, [d.utensilioId]: val }));
                      }
                    }}
                    inputProps={{ min: 0, max: pendiente }}
                  />
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrestamoDevolucion(null)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={confirmarDevolucion}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para marcar como perdido (reemplaza el window.prompt nativo) */}
      <Dialog open={!!prestamoPerdido} onClose={() => setPrestamoPerdido(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'error.main' }}>Marcar piezas como perdidas</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Las piezas pendientes de este préstamo se marcarán como perdidas y no volverán al stock.
          </Alert>
          <TextField
            label="Observación (opcional)"
            value={obsPerdido}
            onChange={(e) => setObsPerdido(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrestamoPerdido(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmarPerdido}>Marcar como perdido</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
