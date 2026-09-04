import React, { useState } from "react";
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

// Datos simulados de adeudos pendientes
const DEUDORES_INICIALES = [
  { id: 1, nombre: 'Juan Pérez', area: 'Recursos Humanos', totalDeuda: 145.00, fechaUltima: '2026-09-01', estado: 'Pendiente' },
  { id: 2, nombre: 'María López', area: 'Servicios Generales', totalDeuda: 65.00, fechaUltima: '2026-09-02', estado: 'Pendiente' },
  { id: 3, nombre: 'Carlos Sánchez', area: 'Informática', totalDeuda: 110.50, fechaUltima: '2026-08-30', estado: 'Pendiente' },
];

export default function Deudores() {
  const [deudores, setDeudores] = useState(DEUDORES_INICIALES);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbono, setModalAbono] = useState(false);
  const [deudorSeleccionado, setDeudorSeleccionado] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');

  const deudoresFiltrados = deudores.filter(d => 
    d.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    d.area.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleOpenAbono = (deudor) => {
    setDeudorSeleccionado(deudor);
    setMontoAbono('');
    setModalAbono(true);
  };

  const procesarPago = () => {
    const abono = parseFloat(montoAbono);
    if (isNaN(abono) || abono <= 0) return;

    setDeudores(prev => prev.map(d => {
      if (d.id === deudorSeleccionado.id) {
        const nuevaDeuda = d.totalDeuda - abono;
        return {
          ...d,
          totalDeuda: nuevaDeuda > 0 ? nuevaDeuda : 0,
          estado: nuevaDeuda <= 0 ? 'Pagado' : 'Pendiente'
        };
      }
      return d;
    }).filter(d => d.totalDeuda > 0)); // Opcional: remueve si la deuda llega a 0

    setModalAbono(false);
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
                  ${item.totalDeuda.toFixed(2)}
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
                Empleado: <b>{deudorSeleccionado.nombre}</b>
              </Typography>
              <Typography variant="body2" color="error.main">
                Adeudo Actual: <b>${deudorSeleccionado.totalDeuda.toFixed(2)}</b>
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
            disabled={!montoAbono || parseFloat(montoAbono) <= 0}
          >
            Confirmar Pago
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}