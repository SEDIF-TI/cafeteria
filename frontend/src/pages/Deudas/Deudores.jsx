import React, { useState, useEffect } from "react";
import axios from 'axios';
import {
  Box,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PaymentIcon from '@mui/icons-material/Payment';

export default function Deudores() {
  const [deudores, setDeudores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbono, setModalAbono] = useState(false);
  const [deudorSeleccionado, setDeudorSeleccionado] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');

  // Cargar deudas del backend al iniciar
  useEffect(() => {
    const obtenerDeudores = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:8080/api/v1/ventas', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Filtrar solo las ventas con estado PENDIENTE y mapearlas al formato de tu tabla
        const pendientes = response.data
          .filter(v => v.estado === 'PENDIENTE')
          .map(v => ({
            id: v.id,
            nombre: v.clienteNombre || 'Público General',
            area: 'Cliente / General', // O el campo de área si lo tienes en el cliente
            totalDeuda: v.total,
            fechaUltima: v.fechaCreacion ? v.fechaCreacion.split('T')[0] : '',
            estado: 'Pendiente'
          }));

        setDeudores(pendientes);
      } catch (error) {
        console.error('Error al cargar deudas:', error);
      }
    };

    obtenerDeudores();
  }, []);

  const deudoresFiltrados = deudores.filter(d => 
    d.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    d.area.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleOpenAbono = (deudor) => {
    setDeudorSeleccionado(deudor);
    setMontoAbono('');
    setModalAbono(true);
  };

 const [loadingPago, setLoadingPago] = useState(false);

  const procesarPago = async () => {
    const abono = parseFloat(montoAbono);
    if (isNaN(abono) || abono <= 0 || !deudorSeleccionado) return;

    // Validación frontal Solo bloqueamos si intentan abonar MÁS de lo que deben
    if (abono > deudorSeleccionado.totalDeuda) {
      alert(`No puedes abonar más del adeudo total ($${deudorSeleccionado.totalDeuda.toFixed(2)})`);
      return;
    }

    setLoadingPago(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:8080/api/v1/ventas/${deudorSeleccionado.id}/liquidar`, {
        montoIngresado: abono
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Actualizar la lista localmente con la resta matemática
      setDeudores(prev => prev.map(d => {
        if (d.id === deudorSeleccionado.id) {
          return { ...d, totalDeuda: d.totalDeuda - abono };
        }
        return d;
      }).filter(d => d.totalDeuda > 0)); // Si la deuda llega a 0, desaparece de la lista

      setModalAbono(false);
    } catch (error) {
      console.error('Error al procesar el pago:', error);
      const mensajeError = error.response?.data?.message || 'Error al procesar el pago con el servidor.';
      alert(mensajeError);
    } finally {
      setLoadingPago(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
        <Typography variant="h4" component="h1" fontWeight="bold" color="text.primary">
          Control de Deudores / Adeudos
        </Typography>
        <TextField
          placeholder="Buscar por empleado o área..."
          size="small"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ backgroundColor: 'white', borderRadius: 1, width: '300px' }}
        />
      </Box>

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><b>Nombre del Empleado</b></TableCell>
              <TableCell><b>Área / Departamento</b></TableCell>
              <TableCell align="right"><b>Deuda Total</b></TableCell>
              <TableCell align="center"><b>Último Movimiento</b></TableCell>
              <TableCell align="center"><b>Estado</b></TableCell>
              <TableCell align="center"><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deudoresFiltrados.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.nombre}</TableCell>
                <TableCell>{item.area}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                  ${Number(item.totalDeuda).toFixed(2)}
                </TableCell>
                <TableCell align="center">{item.fechaUltima}</TableCell>
                <TableCell align="center">
                  <Chip 
                    label={item.estado} 
                    color="warning"
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Button
                    variant="contained"
                    size="small"
                    color="success"
                    startIcon={<PaymentIcon />}
                    onClick={() => handleOpenAbono(item)}
                  >
                    Abonar / Liquidar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {deudoresFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary">No hay adeudos registrados.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal para Abonar o Liquidar */}
      <Dialog open={modalAbono} onClose={() => setModalAbono(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Registrar Pago / Abono</DialogTitle>
        <DialogContent>
          {deudorSeleccionado && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2">
                Cliente / Empleado: <b>{deudorSeleccionado.nombre}</b>
              </Typography>
              <Typography variant="body2" color="error.main">
                Adeudo Actual: <b>${Number(deudorSeleccionado.totalDeuda).toFixed(2)}</b>
              </Typography>
              <TextField
                label="Monto a Pagar / Abonar"
                type="number"
                fullWidth
                autoFocus
                value={montoAbono}
                onChange={(e) => setMontoAbono(e.target.value)}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                }}
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
            disabled={loadingPago || !montoAbono || parseFloat(montoAbono) <= 0}
          >
            {loadingPago ? 'Procesando pago...' : 'Confirmar Pago'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}