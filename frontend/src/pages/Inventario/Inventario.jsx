import React, { useState, useEffect } from 'react';
import {
  Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Typography, Box, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Chip, IconButton, FormControlLabel, Switch
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddBoxIcon from '@mui/icons-material/AddBox';
import api from '../../api/axiosClient';

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const estadoInicialForm = {
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    stockMinimo: '',
    categoriaId: '',
    esDirecto: true
  };

  const [formData, setFormData] = useState(estadoInicialForm);

  const cargarDatos = async () => {
    try {
      const [resProd, resCat] = await Promise.all([
        api.get('/productos'),
        api.get('/categorias')
      ]);
      setProductos(resProd.data);
      setCategorias(resCat.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleOpenModal = (producto = null) => {
    if (producto) {
      setEditingId(producto.id);
      setFormData({
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        precio: producto.precio || '',
        stock: producto.inventario?.stockActual ?? 0,
        stockMinimo: producto.inventario?.stockMinimo ?? 0,
        categoriaId: producto.categoria?.id || '',
        esDirecto: producto.esDirecto ?? true
      });
    } else {
      setEditingId(null);
      setFormData(estadoInicialForm);
    }
    setOpenDialog(true);
  };

  const handleGuardar = async () => {
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        descripcion: (formData.descripcion || '').trim(),
        precio: parseFloat(formData.precio),
        categoriaId: Number(formData.categoriaId),
        esDirecto: formData.esDirecto,
        stock: formData.esDirecto ? parseFloat(formData.stock || 0) : 0,
        stockMinimo: formData.esDirecto ? parseFloat(formData.stockMinimo || 0) : 0
      };

      if (editingId) {
        await api.put(`/productos/${editingId}`, payload);
      } else {
        await api.post('/productos', payload);
      }

      setOpenDialog(false);
      cargarDatos();
    } catch (error) {
      console.error('Error al guardar producto:', error.response?.data || error.message);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Control de Inventario y Productos</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddBoxIcon />} 
          onClick={() => handleOpenModal()}
          sx={{ backgroundColor: '#691c32', '&:hover': { backgroundColor: '#501525' } }}
        >
          Nuevo Producto
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><b>Producto</b></TableCell>
              <TableCell><b>Descripción</b></TableCell>
              <TableCell><b>Categoría</b></TableCell>
              <TableCell align="right"><b>Precio</b></TableCell>
              <TableCell align="center"><b>Tipo</b></TableCell>
              <TableCell align="center"><b>Stock Disponible</b></TableCell>
              <TableCell align="center"><b>Stock Mínimo</b></TableCell>
              <TableCell align="center"><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {productos.map((p) => {
              const stockActual = p.inventario?.stockActual ?? 0;
              const stockMin = p.inventario?.stockMinimo ?? 0;
              const bajoStock = p.esDirecto && stockActual <= stockMin;

              return (
                <TableRow key={p.id} hover>
                  <TableCell><b>{p.nombre}</b></TableCell>
                  
                  {/* Celda insertada para alinear las 8 columnas */}
                  <TableCell>{p.descripcion || '-'}</TableCell>
                  
                  <TableCell>{p.categoria?.nombre || 'Sin Categoría'}</TableCell>
                  <TableCell align="right">${Number(p.precio).toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={p.esDirecto ? 'Venta Directa' : 'Preparado'} 
                      color={p.esDirecto ? 'info' : 'secondary'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={
                        p.esDirecto 
                          ? `${stockActual} unidades` 
                          : 'N/A (Receta)'
                      } 
                      color={bajoStock ? 'error' : 'default'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell align="center">
                    {p.esDirecto ? `${stockMin} unidades` : 'N/A'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" onClick={() => handleOpenModal(p)}>
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingId ? 'Editar Producto' : 'Registrar Producto'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField 
              label="Nombre del Producto" 
              fullWidth 
              value={formData.nombre} 
              onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
            />
            
            <TextField 
              label="Precio" 
              type="number" 
              fullWidth 
              value={formData.precio} 
              onChange={(e) => setFormData({...formData, precio: e.target.value})} 
            />

            <TextField 
              select 
              label="Categoría Comercial" 
              fullWidth 
              value={formData.categoriaId} 
              onChange={(e) => setFormData({...formData, categoriaId: e.target.value})}
            >
              {categorias.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
              ))}
            </TextField>

            <TextField 
              label="Descripción" 
              multiline 
              rows={2} 
              fullWidth 
              value={formData.descripcion} 
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})} 
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.esDirecto}
                  onChange={(e) => setFormData({ ...formData, esDirecto: e.target.checked })}
                  color="primary"
                />
              }
              label="Producto de venta directa (Stock en tienda)"
            />

            {formData.esDirecto && (
              <Box display="flex" gap={2}>
                <TextField 
                  label="Stock Inicial" 
                  type="number" 
                  fullWidth 
                  value={formData.stock} 
                  onChange={(e) => setFormData({...formData, stock: e.target.value})} 
                />
                <TextField 
                  label="Stock Mínimo (Alerta)" 
                  type="number" 
                  fullWidth 
                  value={formData.stockMinimo} 
                  onChange={(e) => setFormData({...formData, stockMinimo: e.target.value})} 
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardar} sx={{ backgroundColor: '#691c32' }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}