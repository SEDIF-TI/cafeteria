import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Paper, Typography, Box, Card, CardContent, CardActionArea,
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import EmailIcon from '@mui/icons-material/Email';
import api from '../../api/axiosClient';

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [ventaExitosa, setVentaExitosa] = useState(null);
  const [emailCliente, setEmailCliente] = useState('');
  const [mensajeEnvio, setMensajeEnvio] = useState(null);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const response = await api.get('/productos');
      setProductos(response.data.filter(p => p.stock > 0));
    } catch (error) {
      console.error('Error al cargar catálogo de ventas:', error);
    }
  };

  const agregarAlCarrito = (producto) => {
    const existe = carrito.find(item => item.id === producto.id);
    if (existe) {
      if (existe.cantidad >= producto.stock) return;
      setCarrito(carrito.map(item => 
        item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const removerDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
  };

  const calcularTotal = () => {
    return carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  };

  const procesarVenta = async () => {
    if (carrito.length === 0) return;

    const payload = {
      items: carrito.map(item => ({
        productoId: item.id,
        cantidad: item.cantidad,
        precioUnitario: item.precio
      })),
      total: calcularTotal()
    };

    try {
      const response = await api.post('/ventas', payload);
      setVentaExitosa(response.data);
      setCarrito([]);
      cargarProductos(); // Actualiza el stock visual en tiempo real
    } catch (error) {
      console.error('Error al registrar la venta:', error);
    }
  };

  const handleEnviarCorreo = async () => {
    if (!emailCliente || !ventaExitosa) return;
    try {
      await api.post(`/ventas/${ventaExitosa.id}/enviar-ticket`, { email: emailCliente });
      setMensajeEnvio({ tipo: 'success', texto: 'Ticket enviado exitosamente al correo.' });
    } catch (error) {
      setMensajeEnvio({ tipo: 'error', texto: 'No se pudo enviar el correo del ticket.' });
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Catálogo de Productos */}
        <Grid item xs={12} md={7}>
          <Typography variant="h6" fontWeight="bold" mb={2}>Productos Disponibles</Typography>
          <Grid container spacing={2}>
            {productos.map((prod) => (
              <Grid item xs={6} sm={4} key={prod.id}>
                <Card elevation={2}>
                  <CardActionArea onClick={() => agregarAlCarrito(prod)}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" noWrap>{prod.nombre}</Typography>
                      <Typography variant="body2" color="text.secondary">${Number(prod.precio).toFixed(2)}</Typography>
                      <Typography variant="caption" color="primary">Stock: {prod.stock}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Resumen de Venta / Carrito */}
        <Grid item xs={12} md={5}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>Orden Actual</Typography>
            
            <TableContainer sx={{ maxHeight: 320 }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#fafafa' }}>
                  <TableRow>
                    <TableCell>Prod.</TableCell>
                    <TableCell align="center">Cant.</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {carrito.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.nombre}</TableCell>
                      <TableCell align="center">{item.cantidad}</TableCell>
                      <TableCell align="right">${(item.precio * item.cantidad).toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => removerDelCarrito(item.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box mt={3} pt={2} borderTop="1px solid #e0e0e0">
              <Typography variant="h5" fontWeight="bold" align="right" mb={2}>
                Total: ${calcularTotal().toFixed(2)}
              </Typography>
              <Button 
                variant="contained" 
                color="success" 
                fullWidth 
                size="large"
                startIcon={<PointOfSaleIcon />}
                disabled={carrito.length === 0}
                onClick={procesarVenta}
              >
                Cobrar Venta
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Modal post-venta para enviar ticket por email */}
      <Dialog open={Boolean(ventaExitosa)} onClose={() => setVentaExitosa(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: 'success.main', fontWeight: 'bold' }}>¡Venta Completada!</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            Folio registrado correctamente. Si el cliente desea su comprobante, ingresa su correo electrónico a continuación:
          </Typography>

          {mensajeEnvio && (
            <Alert severity={mensajeEnvio.tipo} sx={{ mb: 2 }}>{mensajeEnvio.texto}</Alert>
          )}

          <TextField
            label="Correo Electrónico"
            type="email"
            fullWidth
            value={emailCliente}
            onChange={(e) => setEmailCliente(e.target.value)}
            placeholder="ejemplo@correo.com"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setVentaExitosa(null); setMensajeEnvio(null); setEmailCliente(''); }}>
            Cerrar
          </Button>
          <Button 
            variant="contained" 
            startIcon={<EmailIcon />} 
            onClick={handleEnviarCorreo}
            disabled={!emailCliente}
          >
            Enviar Ticket
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}