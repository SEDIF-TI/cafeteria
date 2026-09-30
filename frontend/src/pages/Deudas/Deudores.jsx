import React, { useState, useEffect } from "react";
import {
  Box, Container, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, InputAdornment, Tabs, Tab
} from '@mui/material';
import api from '../../api/axiosClient';

const SearchIcon = () => (
  <Box component="svg" viewBox="0 0 24 24" fill="currentColor" sx={{ width: 20, height: 20, color: 'text.secondary' }}>
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </Box>
);

export default function Deudores() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [tabActual, setTabActual] = useState('DEUDORES'); // 'DEUDORES', 'TODOS', 'AL_DIA'
  const [modalAbono, setModalAbono] = useState(false);
  const [clienteSel, setClienteSel] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [cargando, setCargando] = useState(false);

  const cargarClientes = async () => {
    setCargando(true);
    try {
      let res;
      try {
        res = await api.get('/api/v1/clientes');
      } catch {
        res = await api.get('/clientes');
      }
      const data = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.content || res.data?.data || []);
      setClientes(data);
    } catch (error) {
      console.error('Error al cargar la lista de clientes:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const clientesFiltrados = clientes.filter(c => {
    const q = busqueda.toLowerCase();
    const coincide = 
      (c.nombre || '').toLowerCase().includes(q) ||
      (c.numeroControlEmpleado || c.numeroControl || '').toLowerCase().includes(q);

    if (!coincide) return false;

    const saldo = Number(c.saldoDeudor || 0);
    if (tabActual === 'DEUDORES') return saldo > 0;
    if (tabActual === 'AL_DIA') return saldo <= 0;
    return true;
  });

  const handleOpenAbono = (cliente) => {
    setClienteSel(cliente);
    setMontoAbono(String(cliente.saldoDeudor || ''));
    setModalAbono(true);
  };

  const procesarPago = async () => {
    const abono = parseFloat(montoAbono);
    if (isNaN(abono) || abono <= 0) return;

    try {
      await api.post(`/api/v1/clientes/${clienteSel.id}/abono`, { monto: abono })
        .catch(() => api.post(`/clientes/${clienteSel.id}/abono`, { monto: abono }))
        .catch(() => api.patch(`/clientes/${clienteSel.id}`, {
          saldoDeudor: Math.max(0, Number(clienteSel.saldoDeudor) - abono)
        }));

      alert('¡Pago / Abono registrado con éxito!');
      setModalAbono(false);
      cargarClientes();
    } catch (error) {
      alert('Error al procesar el pago.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h4" fontWeight="bold" color="text.primary">
          Control de Deudores y Clientes
        </Typography>
        <TextField
          placeholder="Buscar por Nº Control o Nombre..."
          size="small"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ backgroundColor: 'white', borderRadius: 1, width: '320px' }}
        />
      </Box>

      <Paper elevation={0} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabActual} 
          onChange={(_, val) => setTabActual(val)} 
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Solo Deudores" value="DEUDORES" sx={{ fontWeight: 'bold' }} />
          <Tab label="Todos los Clientes" value="TODOS" sx={{ fontWeight: 'bold' }} />
          <Tab label="Al Día" value="AL_DIA" sx={{ fontWeight: 'bold' }} />
        </Tabs>
      </Paper>

      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><b>Nº Control / Empleado</b></TableCell>
              <TableCell><b>Nombre del Empleado</b></TableCell>
              <TableCell><b>Contacto</b></TableCell>
              <TableCell align="right"><b>Deuda Total</b></TableCell>
              <TableCell align="center"><b>Estado</b></TableCell>
              <TableCell align="center"><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cargando ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  Cargando clientes...
                </TableCell>
              </TableRow>
            ) : clientesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary">No se encontraron registros.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              clientesFiltrados.map((item) => {
                const saldo = Number(item.saldoDeudor || 0);
                const tieneDeuda = saldo > 0;

                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Chip 
                        label={item.numeroControlEmpleado || item.numeroControl || 'S/N'} 
                        size="small" 
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: '600' }}>{item.nombre}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{item.email || 'Sin correo'}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.telefono || ''}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: tieneDeuda ? 'error.main' : 'success.main' }}>
                      ${saldo.toFixed(2)}
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={tieneDeuda ? 'Pendiente' : 'Al día'} 
                        color={tieneDeuda ? 'warning' : 'success'}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {tieneDeuda ? (
                        <Button
                          variant="contained"
                          size="small"
                          color="success"
                          onClick={() => handleOpenAbono(item)}
                        >
                          Abonar / Liquidar
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Sin adeudos</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal para Abonar o Liquidar */}
      <Dialog open={modalAbono} onClose={() => setModalAbono(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Registrar Pago / Abono</DialogTitle>
        <DialogContent>
          {clienteSel && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2">
                Empleado: <b>[{clienteSel.numeroControlEmpleado || 'S/N'}] {clienteSel.nombre}</b>
              </Typography>
              <Typography variant="body2" color="error.main">
                Adeudo Actual: <b>${Number(clienteSel.saldoDeudor || 0).toFixed(2)}</b>
              </Typography>
              <TextField
                label="Monto a Pagar / Abonar"
                type="number"
                fullWidth
                autoFocus
                value={montoAbono}
                onChange={(e) => setMontoAbono(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setModalAbono(false)} color="inherit">Cancelar</Button>
          <Button 
            onClick={procesarPago} 
            variant="contained" 
            color="success"
            disabled={!montoAbono || parseFloat(montoAbono) <= 0}
          >
            Confirmar Pago
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}