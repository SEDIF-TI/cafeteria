import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, Typography, Box, Card, CardContent, CardActionArea,
  Button, IconButton, TextField, MenuItem, Dialog, DialogTitle, 
  DialogContent, DialogActions, Chip, Alert, Stack, Divider, Autocomplete
} from '@mui/material';
import api from '../../api/axiosClient';
import ModalQRCliente from "../registro-cliente/ModalQRCliente";

// Iconos SVG nativos para evitar fallos de importación
const ShoppingCartIcon = () => (
  <Box component="svg" viewBox="0 0 24 24" fill="currentColor" sx={{ width: 28, height: 28, color: '#691c32' }}>
    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
  </Box>
);

const QrCodeIcon = () => (
  <Box component="svg" viewBox="0 0 24 24" fill="currentColor" sx={{ width: 20, height: 20 }}>
    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13-2h-2v2h2v-2zm1 2h2v2h-2v-2zm-3 2h2v2h-2v-2zm1 2h2v2h-2v-2zm2-2h2v2h-2v-2z"/>
  </Box>
);

const DeleteIcon = () => (
  <Box component="svg" viewBox="0 0 24 24" fill="currentColor" sx={{ width: 20, height: 20 }}>
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </Box>
);

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [carrito, setCarrito] = useState([]);
  
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  
  const [openCobroDialog, setOpenCobroDialog] = useState(false);
  const [openQRModal, setOpenQRModal] = useState(false); 
  const [loading, setLoading] = useState(false);

  const cargarCatalogos = async () => {
    // 1. Cargar Productos de forma independiente
    try {
      let resProd;
      try {
        resProd = await api.get('/productos');
      } catch {
        resProd = await api.get('/api/v1/productos');
      }

      const rawProds = Array.isArray(resProd.data) 
        ? resProd.data 
        : (resProd.data?.content || resProd.data?.data || []);
      
      setProductos(rawProds.filter((p) => Number(p.precio) > 0));
    } catch (errProd) {
      console.error('Error al obtener productos:', errProd);
      setProductos([]);
    }

    // 2. Cargar Clientes de forma independiente
    try {
      let resCli;
      try {
        resCli = await api.get('/clientes');
      } catch {
        resCli = await api.get('/api/v1/clientes');
      }

      const rawClientes = Array.isArray(resCli.data) 
        ? resCli.data 
        : (resCli.data?.content || resCli.data?.data || []);
      
      setClientes(rawClientes);
    } catch (errCli) {
      console.error('Error al obtener clientes:', errCli);
      setClientes([]);
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
        alert(`Stock insuficiente. Disponibilidad estimada: ${stockDisp} porciones.`);
        return;
      }
      setCarrito(
        carrito.map((item) =>
          item.productoId === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      );
    } else {
      if (stockDisp < 1) {
        alert('Este producto no cuenta con insumos o stock suficiente.');
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
      alert('El monto recibido es menor al total de la compra.');
      return;
    }

    if (metodoPago === 'NOMINA' && !clienteSeleccionado) {
      alert('Selecciona un empleado para aplicar el Descuento por Nómina.');
      return;
    }

    setLoading(true);

    const payload = {
      usuarioId: 1,
      clienteId: clienteSeleccionado ? clienteSeleccionado.id : null,
      estadoPago: metodoPago === 'NOMINA' ? 'PENDIENTE' : 'PAGADO',
      items: carrito.map((item) => ({
        productoId: item.productoId,
        cantidad: item.cantidad
      }))
    };

    try {
      await api.post('/ventas', payload).catch(() => api.post('/api/v1/ventas', payload));
      alert('¡Venta registrada con éxito!');
      setCarrito([]);
      setMontoRecibido('');
      setClienteSeleccionado(null);
      setOpenCobroDialog(false);
      cargarCatalogos();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data || 'Error al procesar la venta.';
      alert(`Error en caja:\n${typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}`);
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
      {/* Panel Izquierdo: Catálogo */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="900" color="text.primary" gutterBottom>
              Punto de Venta
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Selecciona productos para estructurar la comanda.
            </Typography>
          </Box>
          <Button 
            variant="outlined" 
            startIcon={<QrCodeIcon />} 
            onClick={() => setOpenQRModal(true)}
            sx={{ 
              borderColor: '#691c32', 
              color: '#691c32',
              fontWeight: 'bold',
              '&:hover': { borderColor: '#4a1323', backgroundColor: 'rgba(105, 28, 50, 0.04)' }
            }}
          >
            QR Registro Cliente
          </Button>
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
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
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

      {/* Panel Derecho: Ticket */}
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
          <Stack 
            direction="row" 
            spacing={2} 
            alignItems="center" 
            justifyContent="space-between"
            sx={{ p: 3, bgcolor: '#ffffff', borderBottom: '1px solid #e9ecef' }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ShoppingCartIcon />
              <Typography variant="h5" fontWeight="800" color="text.primary" sx={{ m: 0 }}>
                Ticket de Venta
              </Typography>
            </Stack>
            <Chip 
              label={`${carrito.reduce((acc, i) => acc + i.cantidad, 0)} arts.`} 
              sx={{ fontWeight: 'bold', bgcolor: '#f1f3f5', fontSize: '1rem', color: '#495057' }} 
            />
          </Stack>

          {/* Autocomplete con búsqueda por Número de Control */}
          <Box sx={{ p: 2, px: 3, bgcolor: '#fafafa', borderBottom: '1px solid #e9ecef' }}>
            <Autocomplete
              options={clientes}
              value={clienteSeleccionado}
              onChange={(_, newValue) => setClienteSeleccionado(newValue)}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              getOptionLabel={(option) => {
                if (!option) return '';
                const ctrl = option.numeroControlEmpleado || option.numeroControl || 'S/N';
                return `[${ctrl}] ${option.nombre || ''}`;
              }}
              filterOptions={(options, { inputValue }) => {
                const query = inputValue.toLowerCase().trim();
                return options.filter((item) => {
                  const ctrl = String(item.numeroControlEmpleado || item.numeroControl || '').toLowerCase();
                  const nom = String(item.nombre || '').toLowerCase();
                  return ctrl.includes(query) || nom.includes(query);
                });
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Empleado (Nº Control o Nombre)" 
                  size="small"
                  placeholder="Escribe el nº de control..."
                />
              )}
            />
            {clienteSeleccionado && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Deuda actual: <strong>${Number(clienteSeleccionado.saldoDeudor || 0).toFixed(2)}</strong>
              </Typography>
            )}
          </Box>

          {/* Lista de productos en el carrito */}
          {carrito.length === 0 ? (
            <Box 
              sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                p: 4, 
                bgcolor: '#ffffff',
                width: '100%',
                minHeight: '300px'
              }}
            >
              <Typography variant="h6" color="text.secondary" align="center" fontWeight="500">
                El ticket está vacío.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <Stack 
                direction="row" 
                alignItems="center" 
                sx={{ px: 3, py: 1.5, bgcolor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}
              >
                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ flex: 1 }}>PRODUCTO</Typography>
                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ width: '110px', textAlign: 'center' }}>CANT</Typography>
                <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ width: '80px', textAlign: 'right' }}>SUBTOTAL</Typography>
                <Box sx={{ width: '36px' }}></Box>
              </Stack>

              <Box flex={1} overflow="auto">
                {carrito.map((item) => (
                  <Stack 
                    key={item.productoId} 
                    direction="row" 
                    alignItems="center" 
                    sx={{ px: 3, py: 2, borderBottom: '1px solid #f1f3f5' }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0, pr: 1 }}>
                      <Typography variant="subtitle2" fontWeight="700" noWrap>
                        {item.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ${item.precio.toFixed(2)} c/u
                      </Typography>
                    </Box>

                    <Box sx={{ width: '110px', display: 'flex', justifyContent: 'center' }}>
                      <Stack direction="row" alignItems="center" sx={{ border: '1px solid #dee2e6', borderRadius: 1 }}>
                        <Button size="small" onClick={() => cambiarCantidad(item.productoId, -1)} sx={{ minWidth: 28, p: 0 }}>-</Button>
                        <Typography variant="body2" fontWeight="bold" sx={{ px: 1 }}>{item.cantidad}</Typography>
                        <Button size="small" onClick={() => cambiarCantidad(item.productoId, 1)} sx={{ minWidth: 28, p: 0 }}>+</Button>
                      </Stack>
                    </Box>

                    <Box sx={{ width: '80px', textAlign: 'right' }}>
                      <Typography variant="subtitle2" fontWeight="800">
                        ${(item.precio * item.cantidad).toFixed(2)}
                      </Typography>
                    </Box>

                    <Box sx={{ width: '36px', textAlign: 'right' }}>
                      <IconButton color="error" size="small" onClick={() => eliminarDelCarrito(item.productoId)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Stack>
                ))}
              </Box>

              <Box sx={{ p: 3, bgcolor: '#ffffff', borderTop: '1px solid #e9ecef' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight="700" color="text.secondary">TOTAL</Typography>
                  <Typography variant="h4" fontWeight="900" color="#691c32">${totalVenta.toFixed(2)}</Typography>
                </Stack>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={() => setOpenCobroDialog(true)}
                  sx={{ 
                    backgroundColor: '#691c32', 
                    py: 1.8,
                    borderRadius: 2,
                    fontWeight: '800',
                    fontSize: '1.1rem',
                    '&:hover': { backgroundColor: '#4a1323' }
                  }}
                >
                  Procesar Cobro
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Modal de Cobro */}
      <Dialog open={openCobroDialog} onClose={() => setOpenCobroDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: '800', fontSize: '1.4rem', textAlign: 'center' }}>Cobro de Venta</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="h3" textAlign="center" fontWeight="900" color="#691c32" sx={{ mb: 3 }}>
              Total: ${totalVenta.toFixed(2)}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <TextField 
              select 
              label="Método de Pago" 
              fullWidth 
              value={metodoPago} 
              onChange={(e) => setMetodoPago(e.target.value)}
              sx={{ mb: 3 }}
            >
              <MenuItem value="EFECTIVO">Efectivo</MenuItem>
              <MenuItem value="TARJETA">Tarjeta Débito / Crédito</MenuItem>
              <MenuItem value="TRANSFERENCIA">Transferencia SPEI</MenuItem>
              <MenuItem value="NOMINA">Descuento por Nómina (Fiado / Cuenta)</MenuItem>
            </TextField>

            {metodoPago === 'EFECTIVO' && (
              <Box>
                <TextField 
                  label="Monto Recibido ($)" 
                  type="number" 
                  fullWidth 
                  value={montoRecibido} 
                  onChange={(e) => setMontoRecibido(e.target.value)} 
                  autoFocus 
                  InputProps={{ sx: { fontSize: '1.2rem', fontWeight: 'bold' } }}
                />
                {parseFloat(montoRecibido) >= totalVenta && (
                  <Alert severity="success" sx={{ mt: 2, fontWeight: 'bold' }}>
                    Cambio: ${cambio.toFixed(2)}
                  </Alert>
                )}
              </Box>
            )}

            {metodoPago === 'NOMINA' && (
              <Alert severity={clienteSeleccionado ? "info" : "warning"} sx={{ borderRadius: 2 }}>
                {clienteSeleccionado 
                  ? `Se asignará un adeudo de $${totalVenta.toFixed(2)} al empleado [${clienteSeleccionado.numeroControlEmpleado || 'S/N'}] ${clienteSeleccionado.nombre}.`
                  : 'Selecciona un empleado en el ticket antes de cobrar por nómina.'}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
          <Button onClick={() => setOpenCobroDialog(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleProcesarVenta} 
            disabled={loading || (metodoPago === 'NOMINA' && !clienteSeleccionado)}
            sx={{ backgroundColor: '#2e7d32', px: 3, fontWeight: 'bold' }}
          >
            {loading ? 'Guardando...' : 'Finalizar Venta'}
          </Button>
        </DialogActions>
      </Dialog>

      <ModalQRCliente open={openQRModal} onClose={() => setOpenQRModal(false)} />
    </Box>
  );
}