import React, { useEffect, useState, useMemo } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent, Button, TextField,
  CircularProgress, Divider, Chip, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Stack, Alert
} from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import api from '../../api/axiosClient';
import { useFeedback } from '../../components/FeedbackProvider';
import usePaginacion from '../../hooks/usePaginacion';
import PaginacionTabla from '../../components/PaginacionTabla';

const dinero = (v) => `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const fechaHora = (f) => (f ? new Date(f).toLocaleString('es-MX') : '—');

export default function Caja() {
  const { notificar } = useFeedback();
  const esAdmin = (() => {
    try { return (JSON.parse(localStorage.getItem('user') || '{}').rol || '').toUpperCase().includes('ADMIN'); }
    catch { return false; }
  })();
  const [turno, setTurno] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fondo, setFondo] = useState('');
  const [abriendo, setAbriendo] = useState(false);

  const [openCierre, setOpenCierre] = useState(false);
  const [contado, setContado] = useState('');
  const [cerrando, setCerrando] = useState(false);

  // Autorización de administrador para cerrar con faltante.
  const [openAuth, setOpenAuth] = useState(false);
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [motivo, setMotivo] = useState('');

  // Corrección de un corte ya cerrado (solo admin).
  const [corte, setCorte] = useState(null); // turno que se está corrigiendo
  const [corrContado, setCorrContado] = useState('');
  const [corrUser, setCorrUser] = useState('');
  const [corrPass, setCorrPass] = useState('');
  const [corrMotivo, setCorrMotivo] = useState('');
  const [corrigiendo, setCorrigiendo] = useState(false);

  const cargar = async () => {
    try {
      const [resActivo, resHist] = await Promise.all([
        api.get('/turnos/activo').catch((e) => (e.response?.status === 204 ? { data: null } : Promise.reject(e))),
        api.get('/turnos').catch(() => ({ data: [] }))
      ]);
      setTurno(resActivo.data || null);
      setHistorial(resHist.data || []);
    } catch (err) {
      notificar('No se pudo cargar la información de caja.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirTurno = async () => {
    const monto = parseFloat(fondo);
    if (isNaN(monto) || monto < 0) { notificar('Ingresa un fondo inicial válido.', 'warning'); return; }
    setAbriendo(true);
    try {
      await api.post('/turnos/abrir', { fondoCaja: monto });
      setFondo('');
      await cargar();
      notificar('Turno abierto correctamente.', 'success');
    } catch (err) {
      notificar(err.response?.data?.message || 'No se pudo abrir el turno.', 'error');
    } finally {
      setAbriendo(false);
    }
  };

  // Envía el cierre. Si `auth` es true, incluye las credenciales del administrador.
  const procesarCierre = async (auth) => {
    const monto = parseFloat(contado);
    setCerrando(true);
    try {
      const payload = { totalContado: monto };
      if (auth) {
        payload.autorizadorUsuario = authUser.trim();
        payload.autorizadorPassword = authPass;
        payload.motivo = motivo.trim();
      }
      const res = await api.post('/turnos/cerrar', payload);
      const dif = Number(res.data?.diferencia ?? 0);
      setOpenCierre(false);
      setOpenAuth(false);
      setContado(''); setAuthUser(''); setAuthPass(''); setMotivo('');
      await cargar();
      if (dif === 0) notificar('Turno cerrado: la caja cuadró.', 'success');
      else if (dif < 0) notificar(`Turno cerrado con faltante de ${dinero(Math.abs(dif))} (autorizado).`, 'warning');
      else notificar(`Turno cerrado con sobrante de ${dinero(dif)}.`, 'info');
    } catch (err) {
      notificar(err.response?.data?.message || 'No se pudo cerrar el turno.', 'error');
    } finally {
      setCerrando(false);
    }
  };

  // Decide si el cierre necesita autorización (faltante) o se puede cerrar directo.
  const cerrarTurno = () => {
    const monto = parseFloat(contado);
    if (isNaN(monto) || monto < 0) { notificar('Ingresa el efectivo contado.', 'warning'); return; }
    const hayFaltante = monto < (turno ? Number(turno.totalEsperado) : 0);
    if (hayFaltante) {
      setAuthUser(''); setAuthPass(''); setMotivo('');
      setOpenAuth(true); // faltante -> requiere autorización de un administrador
    } else {
      procesarCierre(false);
    }
  };

  const confirmarAutorizacion = () => {
    if (!authUser.trim() || !authPass) {
      notificar('Ingresa el usuario y la contraseña del administrador.', 'warning');
      return;
    }
    procesarCierre(true);
  };

  const abrirCorreccion = (t) => {
    setCorte(t);
    setCorrContado(t.totalContado != null ? String(t.totalContado) : '');
    setCorrUser(''); setCorrPass(''); setCorrMotivo('');
  };

  const guardarCorreccion = async () => {
    const monto = parseFloat(corrContado);
    if (isNaN(monto) || monto < 0) { notificar('Ingresa el efectivo contado correcto.', 'warning'); return; }
    if (!corrUser.trim() || !corrPass) { notificar('Ingresa el usuario y la contraseña del administrador.', 'warning'); return; }
    if (!corrMotivo.trim()) { notificar('Indica el motivo de la corrección.', 'warning'); return; }
    setCorrigiendo(true);
    try {
      await api.patch(`/turnos/${corte.id}/corregir`, {
        totalContado: monto,
        autorizadorUsuario: corrUser.trim(),
        autorizadorPassword: corrPass,
        motivo: corrMotivo.trim()
      });
      setCorte(null);
      await cargar();
      notificar('Corte corregido correctamente.', 'success');
    } catch (err) {
      notificar(err.response?.data?.message || 'No se pudo corregir el corte.', 'error');
    } finally {
      setCorrigiendo(false);
    }
  };

  const chipDiferencia = (dif) => {
    const n = Number(dif);
    if (n === 0) return <Chip size="small" color="success" label="Cuadrado" />;
    return <Chip size="small" color={n < 0 ? 'error' : 'warning'}
      label={`${n < 0 ? 'Faltante' : 'Sobrante'} ${dinero(Math.abs(n))}`} />;
  };

  // Historial ordenado de más reciente a más antiguo + paginación.
  const historialOrdenado = useMemo(
    () => [...historial].sort((a, b) => new Date(b.fechaHoraApertura) - new Date(a.fechaHoraApertura)),
    [historial]
  );
  const pag = usePaginacion(historialOrdenado);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <PointOfSaleIcon color="primary" fontSize="large" />
        <Typography variant="h4" sx={{
          fontWeight: "bold"
        }}>Caja y turnos</Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mb: 4
        }}>
        Abre un turno con el fondo de caja, cobra durante el día y ciérralo con el arqueo del efectivo.
      </Typography>

      {/* Estado del turno */}
      {turno ? (
        <Paper elevation={2} sx={{ p: 2, mb: 2, borderLeft: '5px solid #2e7d32' }}>
          {/* Encabezado: icono + título en la misma fila */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
            <LockOpenIcon color="success" />
            <Typography variant="h6" sx={{
              fontWeight: "bold"
            }}>Turno abierto</Typography>
          </Box>

          {/* Nombre del cajero */}
          <Box sx={{ mb: 1.25 }}>
            <Chip size="small" color="success" label={turno.nombreCajero} />
          </Box>

          {/* Acción de cerrar turno */}
          <Box sx={{ mb: 1.25 }}>
            <Button variant="contained" color="error" startIcon={<LockIcon />}
              onClick={() => { setContado(''); setOpenCierre(true); }}>
              Cerrar turno (arqueo)
            </Button>
          </Box>

          {/* Conteo a ciegas: NO se muestran "Ingresos" ni "Esperado" para que el
              cajero no pueda adivinar el monto y fingir que la caja cuadra. */}
          <Grid container spacing={1.5}>
            {[
              ['Apertura', fechaHora(turno.fechaHoraApertura)],
              ['Fondo inicial', dinero(turno.fondoInicial)]
            ].map(([label, valor]) => (
              <Grid size={{ xs: 6, md: 3 }} key={label}>
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>{label}</Typography>
                <Typography variant="h6" sx={{
                  fontWeight: "bold"
                }}>{valor}</Typography>
              </Grid>
            ))}
          </Grid>
        </Paper>
      ) : (
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderLeft: '5px solid #ed6c02' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LockIcon color="warning" />
            <Typography variant="h6" sx={{
              fontWeight: "bold"
            }}>No hay turno abierto</Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mb: 2
            }}>
            Para cobrar ventas en efectivo y registrar abonos necesitas abrir un turno.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <TextField label="Fondo inicial de caja ($)" type="number" value={fondo}
              onChange={(e) => setFondo(e.target.value)} sx={{ maxWidth: 240 }} slotProps={{
              htmlInput: { min: 0, step: '0.01' }
            }} />
            <Button variant="contained" startIcon={<LockOpenIcon />} onClick={abrirTurno} disabled={abriendo}>
              {abriendo ? 'Abriendo…' : 'Abrir turno'}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Historial de cortes */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: "bold",
          mb: 1
        }}>Historial de cortes</Typography>
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
              {esAdmin && <TableCell align="center"><b>Acciones</b></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {pag.pagina.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>{t.nombreCajero}</TableCell>
                <TableCell>{fechaHora(t.fechaHoraApertura)}</TableCell>
                <TableCell>{fechaHora(t.fechaHoraCierre)}</TableCell>
                <TableCell align="right">{dinero(t.fondoInicial)}</TableCell>
                <TableCell align="right">{dinero(t.totalIngresos)}</TableCell>
                <TableCell align="right">{dinero(t.totalEsperado)}</TableCell>
                <TableCell align="right">{dinero(t.totalContado)}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    {chipDiferencia(t.diferencia)}
                    {t.autorizadoPor && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          maxWidth: 220,
                          lineHeight: 1.3
                        }}>
                        Autorizó: {t.autorizadoPor}{t.motivoDiferencia ? ` — ${t.motivoDiferencia}` : ''}
                      </Typography>
                    )}
                    {t.corregidoPor && (
                      <Typography variant="caption" color="primary" sx={{ maxWidth: 220, lineHeight: 1.3 }}>
                        Corregido por: {t.corregidoPor}{t.motivoCorreccion ? ` — ${t.motivoCorreccion}` : ''}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                {esAdmin && (
                  <TableCell align="center">
                    <Button size="small" variant="outlined" onClick={() => abrirCorreccion(t)}>
                      Corregir
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {historialOrdenado.length === 0 && (
              <TableRow><TableCell colSpan={esAdmin ? 9 : 8} align="center" sx={{ py: 3 }}>Aún no hay cortes registrados</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        {historialOrdenado.length > 0 && <PaginacionTabla pag={pag} />}
      </TableContainer>

      {/* Modal de cierre / arqueo — conteo a ciegas (no se muestra lo esperado) */}
      <Dialog open={openCierre} onClose={() => !cerrando && setOpenCierre(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cerrar turno — arqueo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Cuenta el efectivo físico de la caja e ingrésalo. El resultado se mostrará al cerrar.
            </Typography>
            <TextField label="Efectivo contado ($)" type="number" value={contado} autoFocus
              onChange={(e) => setContado(e.target.value)} slotProps={{
              htmlInput: { min: 0, step: '0.01' }
            }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="error" onClick={() => setOpenCierre(false)} disabled={cerrando}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={cerrarTurno} disabled={cerrando}>
            {cerrando ? 'Cerrando…' : 'Cerrar turno'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Autorización de administrador cuando hay faltante */}
      <Dialog open={openAuth} onClose={() => !cerrando && setOpenAuth(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Autorización requerida</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            El efectivo contado es menor a lo esperado (hay un <b>faltante</b>). Un administrador debe autorizar el cierre.
          </Alert>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Usuario del administrador" value={authUser} autoFocus
              onChange={(e) => setAuthUser(e.target.value)} fullWidth />
            <TextField label="Contraseña" type="password" value={authPass}
              onChange={(e) => setAuthPass(e.target.value)} fullWidth />
            <TextField label="Motivo del faltante" value={motivo}
              onChange={(e) => setMotivo(e.target.value)} fullWidth multiline minRows={2}
              placeholder="Ej. error en cambio, retiro no registrado…" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" color="error" onClick={() => setOpenAuth(false)} disabled={cerrando}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={confirmarAutorizacion} disabled={cerrando}>
            {cerrando ? 'Cerrando…' : 'Autorizar y cerrar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Corregir un corte ya cerrado (solo admin) */}
      <Dialog open={!!corte} onClose={() => !corrigiendo && setCorte(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Corregir corte</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.primary', mb: 2 }}>
            Corte del {corte ? fechaHora(corte.fechaHoraCierre) : ''}. Esperado: <b>{corte ? dinero(corte.totalEsperado) : ''}</b>.
            Reingresa el efectivo contado correcto. Requiere autorización de un administrador.
          </DialogContentText>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Efectivo contado correcto ($)" type="number" value={corrContado} autoFocus
              onChange={(e) => setCorrContado(e.target.value)} fullWidth slotProps={{
              htmlInput: { min: 0, step: '0.01' }
            }} />
            <TextField label="Usuario del administrador" value={corrUser}
              onChange={(e) => setCorrUser(e.target.value)} fullWidth />
            <TextField label="Contraseña" type="password" value={corrPass}
              onChange={(e) => setCorrPass(e.target.value)} fullWidth />
            <TextField label="Motivo de la corrección" value={corrMotivo}
              onChange={(e) => setCorrMotivo(e.target.value)} fullWidth multiline minRows={2}
              placeholder="Ej. se contó de más por error, billete mal contado…" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" color="error" onClick={() => setCorte(null)} disabled={corrigiendo}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={guardarCorreccion} disabled={corrigiendo}>
            {corrigiendo ? 'Guardando…' : 'Guardar corrección'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
