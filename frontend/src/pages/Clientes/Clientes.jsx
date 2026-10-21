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

const dinero = (v) => `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [objetivo, setObjetivo] = useState(null); // cliente a resetear
  const [reseteando, setReseteando] = useState(false);
  const [aviso, setAviso] = useState('');

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
      setAviso(`Contraseña de ${objetivo.nombre} restablecida a: ${objetivo.numeroControl}CAFE`);
      setObjetivo(null);
    } catch (err) {
      setAviso(err.response?.data?.message || 'No se pudo restablecer la contraseña.');
    } finally {
      setReseteando(false);
    }
  };

  const filtrados = useMemo(() => {
    const t = busqueda.toLowerCase().trim();
    return clientes.filter((c) =>
      !t || [c.nombre, c.numeroControl, c.area].some((v) => (v || '').toLowerCase().includes(t))
    );
  }, [clientes, busqueda]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <PeopleIcon color="primary" fontSize="large" />
        <Typography variant="h4" fontWeight="bold">Clientes</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Empleados registrados. Puedes restablecer su contraseña del portal a la temporal (código + CAFE).
      </Typography>

      <TextField size="small" placeholder="Buscar nombre, código o área" value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)} sx={{ minWidth: 280, mb: 2 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />

      {loading && <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><b>Nombre</b></TableCell>
                <TableCell><b>Código</b></TableCell>
                <TableCell><b>Área</b></TableCell>
                <TableCell align="right"><b>Saldo</b></TableCell>
                <TableCell align="center"><b>Estado</b></TableCell>
                <TableCell align="center"><b>Contraseña</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtrados.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{c.nombre}</TableCell>
                  <TableCell>{c.numeroControl || '—'}</TableCell>
                  <TableCell>{c.area || '—'}</TableCell>
                  <TableCell align="right">
                    {Number(c.saldoDeudor) > 0
                      ? <Typography variant="body2" color="error">{dinero(c.saldoDeudor)}</Typography>
                      : dinero(0)}
                  </TableCell>
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
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>Sin clientes</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
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
          <Button onClick={() => setObjetivo(null)} disabled={reseteando}>Cancelar</Button>
          <Button variant="contained" color="warning" onClick={confirmarReset} disabled={reseteando}>
            {reseteando ? 'Restableciendo…' : 'Restablecer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!aviso} autoHideDuration={6000} onClose={() => setAviso('')}
        message={aviso} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Container>
  );
}
