import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, Typography, Box, Card, CardContent, CardActionArea,
  Button, IconButton, TextField, MenuItem, Dialog, DialogTitle, 
  DialogContent, DialogActions, Chip, Alert, Stack, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import api from '../../api/axiosClient';

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [openCobroDialog, setOpenCobroDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const cargarCatalogos = async () => {
    try {
      const resProd = await api.get('/productos');
      const productosVenta = resProd.data.filter((p) => Number(p.precio) > 0);
      setProductos(productosVenta);
    } catch (error) {
      console.error('Error al cargar productos para venta:', error);
    }
  };

  useEffect(() => {
    cargarCatalogos();
  }, []);

  const agregarAlCarrito = (producto) => {
    const existe = carrito.find((item) => item.productoId === producto.id);
    const stockDisp = Number(producto.stockDisponible) || 0;

    if (existe) {
      if (existe.cantidad + 1 > stockDisp) {
        alert(`Stock insuficiente. Disponibilidad máxima estimada: ${stockDisp} porciones.`);
        return;
      }
      setCarrito(
        carrito.map((item) =>
          item.productoId === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      );
    } else {
      if (stockDisp < 1) {
        alert('Este producto no cuenta con insumos/stock suficiente para prepararse.');
        return;
      }
      setCarrito([
        ...carrito,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          precio: parseFloat(producto.precio) || 0,
          cantidad: 1
        }
      ]);
    }
  };

  const cambiarCantidad = (productoId, delta) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.productoId === productoId) {
            const nuevaCant = item.cantidad + delta;
            return nuevaCant > 0 ? { ...item, cantidad: nuevaCant } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const eliminarDelCarrito = (productoId) => {
    setCarrito(carrito.filter((item) => item.productoId !== productoId));
  };

  const totalVenta = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  const cambio = parseFloat(montoRecibido) ? Math.max(0, parseFloat(montoRecibido) - totalVenta) : 0;

  const handleProcesarVenta = async () => {
    if (carrito.length === 0) return;

    if (metodoPago === 'EFECTIVO' && (parseFloat(montoRecibido) < totalVenta || isNaN(parseFloat(montoRecibido)))) {
      alert('El monto ingresado es menor al total de la compra.');
      return;
    }

    setLoading(true);

    const payload = {
      metodoPago,
      total: totalVenta,
      montoRecibido: metodoPago === 'EFECTIVO' ? parseFloat(montoRecibido) : totalVenta,
      cambio: metodoPago === 'EFECTIVO' ? cambio : 0,
      detalles: carrito.map((item) => ({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precio,
        subtotal: item.precio * item.cantidad
      }))
    };

    try {
      await api.post('/ventas', payload);
      alert('¡Venta realizada con éxito!');
      setCarrito([]);
      setMontoRecibido('');
      setOpenCobroDialog(false);
      cargarCatalogos();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Ocurrió un error al procesar la venta.';
      alert(`Error en caja:\n${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        width: '100%', 
        minHeight: '100vh',
        bgcolor: '#f4f6f8',
        gap: { xs: 3, lg: 4 }, 
        p: { xs: 2, md: 4 }, 
        boxSizing: 'border-box',
        alignItems: 'flex-start'
      }}
    >
      {/* ================= COLUMNA IZQUIERDA: CATÁLOGO ================= */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box mb={4}>
          <Typography variant="h4" fontWeight="900" color="text.primary" gutterBottom>
            Punto de Venta
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Selecciona los productos para agregarlos al ticket de venta.
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          {productos.map((prod) => {
            const stock = Number(prod.stockDisponible) || 0;
            const agotado = stock <= 0;

            return (
              <Grid item xs={12} sm={6} md={6} lg={4} xl={3} key={prod.id}>
                <Card 
                  elevation={0} 
                  sx={{ 
                    height: '100%',
                    minHeight: '140px',
                    border: '2px solid',
                    borderColor: agotado ? '#e0e0e0' : 'transparent',
                    boxShadow: agotado ? 'none' : '0 4px 16px rgba(0,0,0,0.06)',
                    opacity: agotado ? 0.6 : 1,
                    transition: 'all 0.2s',
                    borderRadius: 4,
                    bgcolor: '#ffffff',
                    '&:hover': {
                      borderColor: agotado ? '#e0e0e0' : '#691c32',
                      transform: agotado ? 'none' : 'translateY(-4px)',
                      boxShadow: agotado ? 'none' : '0 10px 24px rgba(105, 28, 50, 0.15)',
                    }
                  }}
                >
                  <CardActionArea 
                    onClick={() => !agotado && agregarAlCarrito(prod)} 
                    disabled={agotado}
                    sx={{ height: '100%', p: 2.5 }}
                  >
                    <CardContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                      <Box mb={2}>
                        <Typography 
                          variant="h6" 
                          fontWeight="bold" 
                          sx={{ lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        >
                          {prod.nombre}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-end">
                        <Typography variant="h5" fontWeight="900" color="#691c32">
                          ${Number(prod.precio).toFixed(2)}
                        </Typography>
                        <Chip
                          label={agotado ? 'Agotado' : `${stock} disp.`}
                          color={agotado ? 'default' : 'success'}
                          size="small"
                          sx={{ fontWeight: 'bold', borderRadius: 2 }}
                        />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* ================= COLUMNA DERECHA: TICKET DE VENTA ================= */}
      <Box sx={{ 
        width: { xs: '100%', md: '450px', lg: '500px', xl: '35%' }, 
        flexShrink: 0, 
        position: { md: 'sticky' }, 
        top: 24 
      }}>
        <Paper 
          elevation={4} 
          sx={{ 
            width: '100%', 
            borderRadius: 4, 
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 48px)',
            maxHeight: '900px',
            overflow: 'hidden',
            bgcolor: '#ffffff',
            border: '1px solid #e9ecef'
          }}
        >
          {/* Cabecera del Ticket */}
          <Stack 
            direction="row" 
            spacing={2} 
            alignItems="center" 
            justifyContent="space-between"
            sx={{ p: 3, bgcolor: '#ffffff', borderBottom: '1px solid #e9ecef' }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ShoppingCartIcon sx={{ color: '#691c32', fontSize: 32 }} />
              <Typography variant="h5" fontWeight="800" color="text.primary" sx={{ m: 0 }}>
                Ticket de Venta
              </Typography>
            </Stack>
            <Chip 
              label={`${carrito.reduce((acc, i) => acc + i.cantidad, 0)} arts.`} 
              sx={{ fontWeight: 'bold', bgcolor: '#f1f3f5', fontSize: '1rem', color: '#495057' }} 
            />
          </Stack>

          {carrito.length === 0 ? (
            // ESTADO VACÍO CENTRADO CORRECTAMENTE
            <Box 
              sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                p: 4, 
                bgcolor: '#fafafa',
                width: '100%',
                minHeight: '300px'
              }}
            >
              <RemoveShoppingCartIcon sx={{ fontSize: 80, color: '#dee2e6', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" align="center" fontWeight="500">
                El ticket está vacío.
              </Typography>
              <Typography variant="body1" color="text.secondary" align="center" mt={1}>
                Selecciona productos del catálogo para comenzar.
              </Typography>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" flex={1} overflow="hidden">
              
              {/* Encabezados del Ticket */}
              <Stack 
                direction="row" 
                alignItems="center" 
                sx={{ px: 3, py: 1.5, bgcolor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}
              >
                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ flex: 1 }}>PRODUCTO</Typography>
                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ width: '120px', textAlign: 'center' }}>CANTIDAD</Typography>
                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ width: '90px', textAlign: 'right' }}>SUBTOTAL</Typography>
                <Box sx={{ width: '40px' }}></Box>
              </Stack>

              {/* Lista de Productos */}
              <Box flex={1} overflow="auto" sx={{ '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { bgcolor: '#ced4da', borderRadius: '4px' } }}>
                {carrito.map((item) => (
                  <Stack 
                    key={item.productoId} 
                    direction="row" 
                    alignItems="center" 
                    sx={{ 
                      px: 3, py: 2.5, 
                      borderBottom: '1px solid #f1f3f5',
                      '&:hover': { bgcolor: '#fdfdfd' } 
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0, pr: 2 }}>
                      <Typography 
                        variant="subtitle1" 
                        fontWeight="700" 
                        color="text.primary"
                        sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {item.nombre}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight="500">
                        ${item.precio.toFixed(2)} c/u
                      </Typography>
                    </Box>

                    <Box sx={{ width: '120px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                      <Stack 
                        direction="row" 
                        alignItems="center" 
                        sx={{ border: '1px solid #dee2e6', borderRadius: 2, overflow: 'hidden', bgcolor: '#ffffff' }}
                      >
                        <IconButton 
                          onClick={() => cambiarCantidad(item.productoId, -1)} 
                          sx={{ color: 'text.secondary', p: 1, borderRadius: 0, bgcolor: '#f8f9fa', '&:hover': { bgcolor: '#e9ecef' } }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ width: '36px', textAlign: 'center' }}>
                          {item.cantidad}
                        </Typography>
                        <IconButton 
                          onClick={() => cambiarCantidad(item.productoId, 1)} 
                          sx={{ color: 'text.primary', p: 1, borderRadius: 0, bgcolor: '#f8f9fa', '&:hover': { bgcolor: '#e9ecef' } }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>

                    <Box sx={{ width: '90px', textAlign: 'right', flexShrink: 0 }}>
                      <Typography variant="subtitle1" fontWeight="900" color="text.primary">
                        ${(item.precio * item.cantidad).toFixed(2)}
                      </Typography>
                    </Box>

                    <Box sx={{ width: '40px', textAlign: 'right', pl: 1, flexShrink: 0 }}>
                      <IconButton color="error" onClick={() => eliminarDelCarrito(item.productoId)} sx={{ p: 1 }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Stack>
                ))}
              </Box>

              {/* Footer del Ticket */}
              <Box sx={{ p: 3, bgcolor: '#ffffff', borderTop: '1px solid #e9ecef', boxShadow: '0 -4px 20px rgba(0,0,0,0.03)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3, p: 2.5, bgcolor: '#f8f9fa', borderRadius: 3 }}>
                  <Typography variant="h6" fontWeight="700" color="text.secondary">
                    TOTAL A PAGAR
                  </Typography>
                  <Typography variant="h3" fontWeight="900" color="#691c32">
                    ${totalVenta.toFixed(2)}
                  </Typography>
                </Stack>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<PointOfSaleIcon sx={{ fontSize: '1.8rem !important' }} />}
                  onClick={() => setOpenCobroDialog(true)}
                  sx={{ 
                    backgroundColor: '#691c32', 
                    py: 2,
                    borderRadius: 3,
                    fontWeight: '800',
                    fontSize: '1.2rem',
                    textTransform: 'none',
                    boxShadow: '0 6px 16px rgba(105, 28, 50, 0.25)',
                    '&:hover': { backgroundColor: '#4a1323', boxShadow: '0 8px 24px rgba(105, 28, 50, 0.35)' }
                  }}
                >
                  Cobrar Venta
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      {/* ================= MODAL PARA CONFIRMAR COBRO ================= */}
      <Dialog open={openCobroDialog} onClose={() => setOpenCobroDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: '800', fontSize: '1.5rem', pb: 1, textAlign: 'center' }}>Confirmar Pago</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h3" textAlign="center" fontWeight="900" color="#691c32" sx={{ mb: 4 }}>
              Total: ${totalVenta.toFixed(2)}
            </Typography>
            <Divider sx={{ mb: 4 }} />
            
            <TextField 
              select 
              label="Método de Pago" 
              fullWidth 
              value={metodoPago} 
              onChange={(e) => setMetodoPago(e.target.value)}
              InputProps={{ sx: { fontSize: '1.1rem', borderRadius: 2 } }}
            >
              <MenuItem value="EFECTIVO" sx={{ fontSize: '1.1rem', py: 1.5 }}>Efectivo</MenuItem>
              <MenuItem value="TARJETA" sx={{ fontSize: '1.1rem', py: 1.5 }}>Tarjeta de Débito / Crédito</MenuItem>
              <MenuItem value="TRANSFERENCIA" sx={{ fontSize: '1.1rem', py: 1.5 }}>Transferencia</MenuItem>
            </TextField>

            {metodoPago === 'EFECTIVO' && (
              <Box sx={{ mt: 3 }}>
                <TextField 
                  label="Monto Recibido ($)" 
                  type="number" 
                  fullWidth 
                  value={montoRecibido} 
                  onChange={(e) => setMontoRecibido(e.target.value)} 
                  autoFocus 
                  InputProps={{ sx: { fontSize: '1.3rem', fontWeight: 'bold', borderRadius: 2, height: '60px' } }}
                />
                {parseFloat(montoRecibido) >= totalVenta && (
                  <Alert severity="success" sx={{ mt: 3, fontWeight: 'bold', fontSize: '1.1rem', borderRadius: 2, alignItems: 'center' }}>
                    Cambio a entregar: ${cambio.toFixed(2)}
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, justifyContent: 'space-between' }}>
          <Button onClick={() => setOpenCobroDialog(false)} disabled={loading} size="large" sx={{ fontSize: '1.1rem', color: 'text.secondary', fontWeight: 'bold' }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleProcesarVenta} disabled={loading} size="large" sx={{ backgroundColor: '#2e7d32', px: 4, py: 1.5, fontSize: '1.1rem', fontWeight: 'bold', borderRadius: 2 }}>
            {loading ? 'Procesando...' : 'Finalizar Venta'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}