import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActionArea,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PaymentsIcon from '@mui/icons-material/Payments';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';

// --- DATOS SIMULADOS (MOCKS) ---
const CATEGORIAS_MOCK = [
  { id: 0, nombre: 'Todos' },
  { id: 1, nombre: 'Bebidas Calientes' },
  { id: 2, nombre: 'Bebidas Frías' },
  { id: 3, nombre: 'Comida Rápida' },
  { id: 4, nombre: 'Postres' },
];

const PRODUCTOS_MOCK = [
  { id: 101, nombre: 'Café Americano', precio: 25.00, categoriaId: 1 },
  { id: 102, nombre: 'Capuchino', precio: 35.00, categoriaId: 1 },
  { id: 103, nombre: 'Té de Manzanilla', precio: 20.00, categoriaId: 1 },
  { id: 201, nombre: 'Refresco de Cola', precio: 22.00, categoriaId: 2 },
  { id: 202, nombre: 'Agua de Horchata', precio: 18.00, categoriaId: 2 },
  { id: 301, nombre: 'Sándwich de Jamón', precio: 45.00, categoriaId: 3 },
  { id: 302, nombre: 'Torta Cubana', precio: 65.00, categoriaId: 3 },
  { id: 303, nombre: 'Molletes (Orden)', precio: 50.00, categoriaId: 3 },
  { id: 401, nombre: 'Rebanada de Pastel', precio: 40.00, categoriaId: 4 },
  { id: 402, nombre: 'Galleta de Chispas', precio: 15.00, categoriaId: 4 },
];

export default function Ventas() {
  const [categoriaActiva, setCategoriaActiva] = useState(0);
  const [carrito, setCarrito] = useState([]);
  
  // Estados para Cobro Efectivo
  const [modalCobro, setModalCobro] = useState(false);
  const [efectivoRecibido, setEfectivoRecibido] = useState('');

  // Estados para Pago con Deuda
  const [modalDeuda, setModalDeuda] = useState(false);
  const [nombreDeudor, setNombreDeudor] = useState('');

  const productosFiltrados = useMemo(() => {
    if (categoriaActiva === 0) return PRODUCTOS_MOCK;
    return PRODUCTOS_MOCK.filter(p => p.categoriaId === categoriaActiva);
  }, [categoriaActiva]);

  const totalTicket = useMemo(() => {
    return carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
  }, [carrito]);

  const cambio = useMemo(() => {
    const recibido = parseFloat(efectivoRecibido);
    if (isNaN(recibido)) return 0;
    return recibido - totalTicket;
  }, [efectivoRecibido, totalTicket]);

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id);
      if (existe) {
        return prev.map(item => 
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const modificarCantidad = (id, delta) => {
    setCarrito(prev => prev.map(item => {
      if (item.id === id) {
        const nuevaCantidad = item.cantidad + delta;
        return { ...item, cantidad: nuevaCantidad > 0 ? nuevaCantidad : 1 };
      }
      return item;
    }));
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(prev => prev.filter(item => item.id !== id));
  };

  const procesarVentaEfectivo = () => {
    alert('Venta en efectivo procesada con éxito (Simulación)');
    setCarrito([]);
    setModalCobro(false);
    setEfectivoRecibido('');
  };

  const procesarVentaDeuda = () => {
    if (!nombreDeudor.trim()) {
      alert('Debe ingresar el nombre del empleado o deudor.');
      return;
    }
    alert(`Venta registrada como adeudo a nombre de: ${nombreDeudor} (Simulación)`);
    setCarrito([]);
    setModalDeuda(false);
    setNombreDeudor('');
  };

  return (
    <Box sx={{ flexGrow: 1, height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        
        {/* --- PANEL IZQUIERDO: CATÁLOGO --- */}
        <Grid item xs={12} md={8} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Paper elevation={2} sx={{ mb: 2, borderRadius: 2 }}>
            <Tabs 
              value={categoriaActiva} 
              onChange={(e, newValue) => setCategoriaActiva(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ px: 2 }}
            >
              {CATEGORIAS_MOCK.map((cat) => (
                <Tab key={cat.id} label={cat.nombre} value={cat.id} sx={{ fontWeight: 'bold' }} />
              ))}
            </Tabs>
          </Paper>

          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
            <Grid container spacing={2}>
              {productosFiltrados.map((producto) => (
                <Grid item xs={6} sm={4} lg={3} key={producto.id}>
                  <Card 
                    elevation={2} 
                    sx={{ 
                      borderRadius: 3, 
                      transition: 'transform 0.1s', 
                      '&:hover': { transform: 'scale(1.03)', border: '1px solid #1976d2' } 
                    }}
                  >
                    <CardActionArea onClick={() => agregarAlCarrito(producto)} sx={{ height: '100%' }}>
                      <CardContent sx={{ textAlign: 'center', height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Typography variant="body1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                          {producto.nombre}
                        </Typography>
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          ${producto.precio.toFixed(2)}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Grid>

        {/* --- PANEL DERECHO: TICKET Y ACCIONES DE PAGO --- */}
        <Grid item xs={12} md={4} sx={{ height: '100%' }}>
          <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3 }}>
            
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShoppingCartIcon />
              <Typography variant="h6" fontWeight="bold">
                Ticket de Venta
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
              {carrito.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography color="text.secondary" variant="body1">
                    El carrito está vacío
                  </Typography>
                </Box>
              ) : (
                <List>
                  {carrito.map((item) => (
                    <Box key={item.id}>
                      <ListItem sx={{ px: 1, py: 0.5 }}>
                        <ListItemText 
                          primary={<Typography variant="body2" fontWeight="bold">{item.nombre}</Typography>}
                          secondary={`$${item.precio.toFixed(2)} x ${item.cantidad}`}
                        />
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ mr: 1 }}>
                            ${(item.precio * item.cantidad).toFixed(2)}
                          </Typography>
                          <IconButton size="small" onClick={() => modificarCantidad(item.id, -1)} color="warning">
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => modificarCantidad(item.id, 1)} color="primary">
                            <AddIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => eliminarDelCarrito(item.id)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </ListItem>
                      <Divider />
                    </Box>
                  ))}
                </List>
              )}
            </Box>

            <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: '0 0 12px 12px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h5" fontWeight="bold">Total:</Typography>
                <Typography variant="h5" fontWeight="bold" color="primary">
                  ${totalTicket.toFixed(2)}
                </Typography>
              </Box>

              {/* Botones de Cobro / Deuda */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="contained" 
                  color="success" 
                  fullWidth 
                  size="medium"
                  startIcon={<PaymentsIcon />}
                  disabled={carrito.length === 0}
                  onClick={() => setModalCobro(true)}
                  sx={{ py: 1, fontWeight: 'bold' }}
                >
                  Cobrar
                </Button>
                <Button 
                  variant="contained" 
                  color="warning" 
                  fullWidth 
                  size="medium"
                  startIcon={<AssignmentLateIcon />}
                  disabled={carrito.length === 0}
                  onClick={() => setModalDeuda(true)}
                  sx={{ py: 1, fontWeight: 'bold', color: 'white' }}
                >
                  A Deuda
                </Button>
              </Box>

              <Button 
                variant="text" 
                color="error" 
                fullWidth 
                size="small"
                disabled={carrito.length === 0}
                onClick={() => setCarrito([])}
              >
                Cancelar Venta
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* --- MODAL DE COBRO EN EFECTIVO --- */}
      <Dialog open={modalCobro} onClose={() => setModalCobro(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem' }}>
          Total a Cobrar: ${totalTicket.toFixed(2)}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Efectivo Recibido"
              type="number"
              fullWidth
              autoFocus
              variant="outlined"
              value={efectivoRecibido}
              onChange={(e) => setEfectivoRecibido(e.target.value)}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                style: { fontSize: '1.5rem', textAlign: 'center' }
              }}
            />
            {efectivoRecibido !== '' && (
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: cambio >= 0 ? '#e8f5e9' : '#ffebee', borderRadius: 2 }}>
                <Typography variant="subtitle1" color="text.secondary">Cambio a entregar:</Typography>
                <Typography variant="h4" fontWeight="bold" color={cambio >= 0 ? 'success.main' : 'error.main'}>
                  {cambio >= 0 ? `$${cambio.toFixed(2)}` : 'Falta dinero'}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
          <Button onClick={() => setModalCobro(false)} color="inherit" size="large">
            Regresar
          </Button>
          <Button 
            onClick={procesarVentaEfectivo} 
            variant="contained" 
            color="success" 
            size="large"
            disabled={!efectivoRecibido || cambio < 0}
          >
            Confirmar Pago
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- MODAL DE PAGO CON DEUDA --- */}
      <Dialog open={modalDeuda} onClose={() => setModalDeuda(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'warning.dark' }}>
          Registrar Venta a Deuda
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Monto total a registrar como adeudo: <b>${totalTicket.toFixed(2)}</b>
            </Typography>
            <TextField
              label="Nombre del Empleado / Deudor"
              fullWidth
              autoFocus
              variant="outlined"
              value={nombreDeudor}
              onChange={(e) => setNombreDeudor(e.target.value)}
              placeholder="Ej. Juan Pérez (Área de Recursos Humanos)"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
          <Button onClick={() => setModalDeuda(false)} color="inherit" size="large">
            Cancelar
          </Button>
          <Button 
            onClick={procesarVentaDeuda} 
            variant="contained" 
            color="warning" 
            size="large"
            disabled={!nombreDeudor.trim()}
            sx={{ color: 'white', fontWeight: 'bold' }}
          >
            Guardar Adeudo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}