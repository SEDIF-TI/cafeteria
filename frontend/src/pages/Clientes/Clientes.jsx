import React, { useEffect, useState, useMemo } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Chip, TextField, CircularProgress, Alert, Button, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyIcon from '@mui/icons-material/Key';
import PeopleIcon from '@mui/icons-material/People';
import api from '../../api/axiosClient';
import usePaginacion from '../../hooks/usePaginacion';
import PaginacionTabla from '../../components/PaginacionTabla';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [objetivo, setObjetivo] = useState(null); // cliente a resetear
  const [reseteando, setReseteando] = useState(false);
  const [aviso, setAviso] = useState(null); // { texto, tipo: 'success' | 'error' }

  const cargar = async () => {
    try {
      const res = await api.get('/clientes');
      setClientes(res.data || []);
    } catch (err) {
      setError(err.response?.status === 403
        ? 'No tienes permiso para ver los clientes.'
        : 'No se pudo cargar la lista de clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const confirmarReset = async () => {
    setReseteando(true);
    try {
      await api.patch(`/clientes/${objetivo.id}/reset-password`);
      setAviso({ texto: `Contraseña de ${objetivo.nombre} restablecida a: ${objetivo.numeroControl}CAFE`, tipo: 'success' });
      setObjetivo(null);
    } catch (err) {
      setAviso({ texto: err.response?.data?.message || 'No se pudo restablecer la contraseña.', tipo: 'error' });
    } finally {
      setReseteando(false);
    }
  };

  const filtrados = useMemo(() => {
    const t = busqueda.toLowerCase().trim();
    return clientes
      .filter((c) =>
        !t || [c.nombre, c.numeroControl, c.area].some((v) => (v || '').toLowerCase().includes(t))
      )
      .sort((a, b) => (b.id || 0) - (a.id || 0)); // más recientes primero
  }, [clientes, busqueda]);

  const pag = usePaginacion(filtrados);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <PeopleIcon color="primary" fontSize="large" />
        <Typography variant="h4" sx={{
          fontWeight: "bold"
        }}>Clientes</Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mb: 4
        }}>
        Empleados registrados. Puedes restablecer su contraseña del portal a la temporal (código + CAFE).
      </Typography>

      <TextField size="small" placeholder="Buscar nombre, código o área" value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)} sx={{ minWidth: 280, mb: 2 }}
        slotProps={{
          input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }
        }} />

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><b>Nombre</b></TableCell>
                <TableCell><b>No. Control</b></TableCell>
                <TableCell><b>Área</b></TableCell>
                <TableCell align="center"><b>Estado</b></TableCell>
                <TableCell align="center"><b>Contraseña</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pag.pagina.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{c.nombre}</TableCell>
                  <TableCell>{c.numeroControl || '—'}</TableCell>
                  <TableCell>{c.area || '—'}</TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={c.activo ? 'Activo' : 'Inactivo'} color={c.activo ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="center">
                    <Button size="small" startIcon={<KeyIcon />} onClick={() => setObjetivo(c)}>
                      Restablecer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtrados.length === 0 && (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>Sin clientes</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {filtrados.length > 0 && <PaginacionTabla pag={pag} />}
        </TableContainer>
      )}

      <Dialog open={!!objetivo} onClose={() => !reseteando && setObjetivo(null)}>
        <DialogTitle>Restablecer contraseña</DialogTitle>
        <DialogContent>
          <DialogContentText>
            La contraseña de <b>{objetivo?.nombre}</b> volverá a la temporal
            <b> {objetivo?.numeroControl}CAFE</b>. Se le pedirá cambiarla al ingresar. ¿Continuar?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="error" onClick={() => setObjetivo(null)} disabled={reseteando}>
            Cancelar
          </Button>
          <Button variant="contained" color="success" onClick={confirmarReset} disabled={reseteando}>
            {reseteando ? 'Restableciendo…' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!aviso} autoHideDuration={4000} onClose={() => setAviso(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={aviso?.tipo || 'success'} variant="filled" onClose={() => setAviso(null)} sx={{ width: '100%' }}>
          {aviso?.texto}
        </Alert>
      </Snackbar>
    </Container>
  );
}
