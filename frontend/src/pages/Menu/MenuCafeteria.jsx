import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Grid, Card, CardContent, CardActions,
  Chip, Switch, Button, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Table, TableBody, TableCell,
  TableHead, TableRow, IconButton, Divider
} from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlined";
import api from '../../api/axiosClient';

export default function MenuCafeteria() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [insumosInventario, setInsumosInventario] = useState([]);
  
  // Categoría seleccionada (-1 = Todas)
  const [categoriaSel, setCategoriaSel] = useState(-1);

  // Estados para Modal de Receta
  const [openRecetaDialog, setOpenRecetaDialog] = useState(false);
  const [productoSel, setProductoSel] = useState(null);
  const [recetaActual, setRecetaActual] = useState([]);
  const [nuevoInsumo, setNuevoInsumo] = useState({ inventarioId: '', cantidad: '' });

  const cargarDatos = async () => {
    try {
      const [resProd, resCat, resInv] = await Promise.all([
        api.get('/productos'),
        api.get('/categorias'),
        api.get('/inventario')
      ]);
      setProductos(resProd.data);
      setCategorias(resCat.data);
      setInsumosInventario(resInv.data);
    } catch (error) {
      console.error('Error al cargar datos del menú:', error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Cambiar visibilidad/disponibilidad en la carta usando el endpoint existente
  const handleToggleDisponible = async (producto) => {
    try {
      // Tu backend usa /{id}/estado y no requiere body (lo invierte automáticamente)
      await api.patch(`/productos/${producto.id}/estado`);
      
      // Actualizamos el estado local de React cambiando 'activo'
      setProductos(prev => prev.map(p => 
        p.id === producto.id ? { ...p, activo: !p.activo } : p
      ));
    } catch (error) {
      console.error('Error al cambiar disponibilidad:', error);
    }
  };

  // Abrir modal de recetas para productos preparados
  const handleOpenReceta = async (producto) => {
    setProductoSel(producto);
    try {
      const res = await api.get(`/productos/${producto.id}/receta`);
      setRecetaActual(res.data || []);
    } catch {
      setRecetaActual([]);
    }
    setOpenRecetaDialog(true);
  };

  const handleAgregarInsumo = () => {
    if (!nuevoInsumo.inventarioId || !nuevoInsumo.cantidad) return;
    const itemInv = insumosInventario.find(i => i.id === Number(nuevoInsumo.inventarioId));
    setRecetaActual([
      ...recetaActual,
      {
        inventarioId: itemInv.id,
        nombre: itemInv.nombre,
        unidadMedida: itemInv.unidadMedida || 'unidades',
        cantidad: parseFloat(nuevoInsumo.cantidad)
      }
    ]);
    setNuevoInsumo({ inventarioId: '', cantidad: '' });
  };

  const handleEliminarInsumo = (index) => {
    setRecetaActual(recetaActual.filter((_, i) => i !== index));
  };

  const handleGuardarReceta = async () => {
    try {
      await api.post(`/productos/${productoSel.id}/receta`, { ingredientes: recetaActual });
      setOpenRecetaDialog(false);
    } catch (error) {
      console.error('Error al guardar receta:', error);
    }
  };

  // Filtrado de productos por pestaña
  const productosFiltrados = categoriaSel === -1 
    ? productos 
    : productos.filter(p => p.categoria?.id === categoriaSel);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box mb={3}>
        <Typography variant="h5" fontWeight="bold">Menú y Carta de Cafetería</Typography>
        <Typography variant="body2" color="text.secondary">
          Activa o pausa la visibilidad de los platillos en la caja y gestiona la composición de insumos.
        </Typography>
      </Box>

      {/* Pestañas de Filtro por Categoría */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={categoriaSel} 
          onChange={(_, val) => setCategoriaSel(val)}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="Todos los Platillos" value={-1} />
          {categorias.map((cat) => (
            <Tab key={cat.id} label={cat.nombre} value={cat.id} />
          ))}
        </Tabs>
      </Box>

      {/* Grid de Tarjetas del Menú */}
      <Grid container spacing={3}>
        {productosFiltrados.map((prod) => (
          <Grid item xs={12} sm={6} md={4} key={prod.id}>
            <Card 
              elevation={2} 
              sx={{ 
                // Usamos prod.activo en lugar de prod.disponible
                opacity: prod.activo ? 1 : 0.6,
                borderLeft: prod.activo ? '4px solid #2e7d32' : '4px solid #d32f2f'
              }}
            >
              <CardContent sx={{ pb: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="h6" fontWeight="bold">{prod.nombre}</Typography>
                  <Typography variant="h6" color="primary" fontWeight="bold">
                    ${Number(prod.precio).toFixed(2)}
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40, my: 1 }}>
                  {prod.descripcion || 'Sin descripción'}
                </Typography>

                <Box display="flex" gap={1} flexWrap="wrap">
                  <Chip 
                    label={prod.categoria?.nombre || 'General'} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={prod.esDirecto ? 'Venta Directa' : 'Preparado'} 
                    color={prod.esDirecto ? 'info' : 'secondary'} 
                    size="small" 
                  />
                </Box>
              </CardContent>

              <Divider />

              <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                {/* Switch de disponibilidad rápida */}
                <Box display="flex" alignItems="center">
                  <Switch 
                    checked={Boolean(prod.activo)} // Leemos activo
                    onChange={() => handleToggleDisponible(prod)}
                    color="success"
                    size="small"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {prod.activo ? 'En Carta' : 'Pausado'}
                  </Typography>
                </Box>

                {/* Botón de Receta para productos preparados */}
                {!prod.esDirecto && (
                  <Button 
                    size="small" 
                    startIcon={<RestaurantMenuIcon />}
                    onClick={() => handleOpenReceta(prod)}
                    sx={{ color: '#691c32' }}
                  >
                    Receta
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dialog para Configurar Receta de Insumos */}
      <Dialog open={openRecetaDialog} onClose={() => setOpenRecetaDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Receta: {productoSel?.nombre}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Indica los insumos que se descontarán del inventario por cada unidad vendida.
          </Typography>

          {/* Formulario para agregar insumo */}
          <Box display="flex" gap={1} mb={3}>
            <TextField
              select
              label="Insumo de Inventario"
              fullWidth
              size="small"
              value={nuevoInsumo.inventarioId}
              onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, inventarioId: e.target.value })}
            >
              {insumosInventario.map((ins) => (
                <MenuItem key={ins.id} value={ins.id}>{ins.nombre}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Cantidad"
              type="number"
              size="small"
              sx={{ width: 130 }}
              value={nuevoInsumo.cantidad}
              onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, cantidad: e.target.value })}
            />

            <Button 
              variant="contained" 
              onClick={handleAgregarInsumo}
              sx={{ backgroundColor: '#691c32' }}
            >
              <AddCircleOutlineIcon />
            </Button>
          </Box>

          {/* Tabla de Insumos asignados */}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Insumo</TableCell>
                <TableCell align="right">Cantidad</TableCell>
                <TableCell align="center">Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recetaActual.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.nombre}</TableCell>
                  <TableCell align="right">{item.cantidad} {item.unidadMedida}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="error" onClick={() => handleEliminarInsumo(idx)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenRecetaDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardarReceta} sx={{ backgroundColor: '#691c32' }}>
            Guardar Receta
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}