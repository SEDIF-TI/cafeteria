import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Chip, Grid, IconButton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import api from '../../api/axiosClient';

export default function Inventario() {
  const [inventario, setInventario] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openStockDialog, setOpenStockDialog] = useState(false);
  const [editId, setEditId] = useState(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [stockExtra, setStockExtra] = useState('');
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    categoriaId: '',
    esDirecto: true,
    cantidad: '',
    stockMinimo: '',
    unidadVisual: 'Piezas'
  });

  const unidadesVisuales = ['Piezas', 'Litros', 'Mililitros', 'Kilos', 'Gramos'];

  const cargarDatos = async () => {
    try {
      const resProd = await api.get('/productos');
      setInventario(resProd.data);

      const resCat = await api.get('/categorias');
      setCategorias(resCat.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const formatearUnidad = (valor, item) => {
    const cantidad = parseFloat(valor) || 0;
    const inv = item?.inventario || item || {};
    let uni = (inv.unidadMedida || inv.unidad_medida || '').toString().toUpperCase();
    
    if (!uni || uni === 'UNDEFINED' || uni === 'NULL') {
      const esDirecto = item?.esDirecto ?? true;
      uni = esDirecto ? 'UNIDAD' : 'GRAMOS';
    }

    if (uni.includes('MILILITRO') || uni.includes('LITRO')) {
      return cantidad >= 1000 ? `${Number((cantidad / 1000).toFixed(2))} L` : `${cantidad} ml`;
    }
    if (uni.includes('GRAMO') || uni.includes('KILO')) {
      return cantidad >= 1000 ? `${Number((cantidad / 1000).toFixed(2))} Kg` : `${cantidad} g`;
    }
    
    return `${Math.floor(cantidad)} unidades`;
  };

  const handleOpenCreate = () => {
    setEditId(null);
    setFormData({ 
      nombre: '', descripcion: '', precio: '', categoriaId: '', 
      esDirecto: true, cantidad: '', stockMinimo: '', unidadVisual: 'Piezas' 
    });
    setOpenDialog(true);
  };

  const handleTipoRegistroChange = (e) => {
    const esDirectoVal = e.target.value === 'true' || e.target.value === true;
    setFormData((prev) => ({
      ...prev,
      esDirecto: esDirectoVal,
      unidadVisual: esDirectoVal ? 'Piezas' : (prev.unidadVisual === 'Piezas' ? 'Gramos' : prev.unidadVisual),
      precio: esDirectoVal ? prev.precio : 0
    }));
  };

  const handleEdit = (item) => {
    const inv = item.inventario || item;
    const stockAct = inv.stockActual ?? item.stockActual ?? 0;
    const stockMin = inv.stockMinimo ?? item.stockMinimo ?? 0;
    const esDirectoVal = item.esDirecto ?? true;
    
    let uniMed = (inv.unidadMedida ?? item.unidadMedida ?? '').toString().toUpperCase();
    if (!uniMed) uniMed = (!esDirectoVal) ? 'GRAMOS' : 'UNIDAD';

    let cant = parseFloat(stockAct) || 0;
    let min = parseFloat(stockMin) || 0;
    let uniVisual = 'Piezas';

    if (esDirectoVal) {
      uniVisual = 'Piezas';
    } else {
      if (uniMed.includes('MILILITRO') || uniMed.includes('LITRO')) {
        if (cant >= 1000 || min >= 1000) { 
          uniVisual = 'Litros'; 
          cant /= 1000; 
          min /= 1000; 
        } else { 
          uniVisual = 'Mililitros'; 
        }
      } else if (uniMed.includes('GRAMO') || uniMed.includes('KILO')) {
        if (cant >= 1000 || min >= 1000) { 
          uniVisual = 'Kilos'; 
          cant /= 1000; 
          min /= 1000; 
        } else { 
          uniVisual = 'Gramos'; 
        }
      } else {
        uniVisual = 'Piezas';
      }
    }

    setFormData({
      nombre: item.nombre || '',
      descripcion: item.descripcion || '',
      precio: item.precio || 0,
      categoriaId: item.categoria?.id || item.categoriaId || '',
      esDirecto: esDirectoVal,
      cantidad: cant,
      stockMinimo: min,
      unidadVisual: uniVisual
    });
    
    setEditId(item.id);
    setOpenDialog(true);
  };

  const handleOpenSumarStock = (item) => {
    setProductoSeleccionado(item);
    setStockExtra('');
    setOpenStockDialog(true);
  };

  const handleKeyDownNumerico = (e, permiteDecimales) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
    if (!permiteDecimales && (e.key === '.' || e.key === ',')) {
      e.preventDefault();
    }
  };

  const handleGuardarStockExtra = async () => {
    if (!productoSeleccionado) return;

    const extraVal = parseFloat(stockExtra);

    if (isNaN(extraVal) || extraVal <= 0) {
      alert("Por favor ingresa una cantidad válida y mayor a cero.");
      return;
    }

    const inv = productoSeleccionado.inventario || productoSeleccionado;
    const stockActualVal = parseFloat(inv.stockActual ?? productoSeleccionado.stockActual ?? 0) || 0;
    
    let uniMedStr = (inv.unidadMedida ?? productoSeleccionado.unidadMedida ?? '').toString().toUpperCase();
    if (!uniMedStr) uniMedStr = productoSeleccionado.esDirecto === false ? 'GRAMOS' : 'UNIDAD';

    let uniMedEnum = 'UNIDAD';
    if (uniMedStr.includes('GRAMO') || uniMedStr.includes('KILO')) uniMedEnum = 'GRAMOS';
    else if (uniMedStr.includes('LITRO') || uniMedStr.includes('MILILITRO')) uniMedEnum = 'MILILITROS';

    const esPieza = productoSeleccionado.esDirecto || uniMedEnum === 'UNIDAD';

    if (esPieza && !Number.isInteger(extraVal)) {
      alert("Para productos en Venta Directa o Piezas solo se permiten números enteros.");
      return;
    }

    let extraBase = extraVal;
    if (uniMedEnum === 'GRAMOS' || uniMedEnum === 'MILILITROS') {
      extraBase *= 1000;
    }

    const nuevoStockTotal = stockActualVal + extraBase;
    const idCat = productoSeleccionado.categoria?.id || productoSeleccionado.categoriaId;

    const payload = {
      nombre: productoSeleccionado.nombre,
      descripcion: productoSeleccionado.descripcion || '',
      precio: productoSeleccionado.esDirecto ? (parseFloat(productoSeleccionado.precio) || 0) : 0,
      esDirecto: Boolean(productoSeleccionado.esDirecto),
      categoriaId: idCat,
      stock: nuevoStockTotal,
      stockMinimo: parseFloat(inv.stockMinimo ?? productoSeleccionado.stockMinimo ?? 0),
      unidadMedida: uniMedEnum
    };

    try {
      await api.put(`/productos/${productoSeleccionado.id}`, payload);
      setOpenStockDialog(false);
      setProductoSeleccionado(null);
      setStockExtra('');
      cargarDatos();
    } catch (error) {
      const errorData = error.response?.data;
      const msjValidacion = errorData?.message || JSON.stringify(errorData) || error.message;
      alert(`El servidor rechazó la petición:\n${msjValidacion}`);
    }
  };

  const handleGuardar = async () => {
    if (!formData.nombre.trim()) {
      alert("El nombre del producto es obligatorio.");
      return;
    }

    let cantidadVal = parseFloat(formData.cantidad);
    let minimoVal = parseFloat(formData.stockMinimo);
    let precioVal = parseFloat(formData.precio);

    if (isNaN(cantidadVal) || cantidadVal < 0) {
      alert("El stock inicial debe ser un número mayor o igual a 0.");
      return;
    }

    if (isNaN(minimoVal) || minimoVal < 0) {
      alert("El stock mínimo debe ser un número mayor o igual a 0.");
      return;
    }

    if (formData.esDirecto && (isNaN(precioVal) || precioVal < 0)) {
      alert("El precio de venta debe ser un valor válido mayor o igual a 0.");
      return;
    }

    const esPieza = formData.esDirecto || formData.unidadVisual === 'Piezas';

    if (esPieza && (!Number.isInteger(cantidadVal) || !Number.isInteger(minimoVal))) {
      alert("Los productos registrados por Pieza / Venta Directa deben ser números enteros.");
      return;
    }

    let cantidadFinal = cantidadVal;
    let minimoFinal = minimoVal;
    let unidadBase = 'UNIDAD';

    if (esPieza) {
      unidadBase = 'UNIDAD';
    } else {
      switch (formData.unidadVisual) {
        case 'Litros': 
          cantidadFinal *= 1000; 
          minimoFinal *= 1000; 
          unidadBase = 'MILILITROS'; 
          break;
        case 'Mililitros': 
          unidadBase = 'MILILITROS'; 
          break;
        case 'Kilos': 
          cantidadFinal *= 1000; 
          minimoFinal *= 1000; 
          unidadBase = 'GRAMOS'; 
          break;
        case 'Gramos': 
          unidadBase = 'GRAMOS'; 
          break;
        default: 
          unidadBase = 'UNIDAD';
          break;
      }
    }

    const idCat = formData.categoriaId ? parseInt(formData.categoriaId, 10) : null;

    const payload = {
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion || '',
      precio: formData.esDirecto ? precioVal : 0,
      esDirecto: Boolean(formData.esDirecto),
      categoriaId: idCat,
      stock: cantidadFinal,
      stockMinimo: minimoFinal,
      unidadMedida: unidadBase
    };

    try {
      if (editId) {
        await api.put(`/productos/${editId}`, payload);
      } else {
        await api.post('/productos', payload);
      }
      setOpenDialog(false);
      setEditId(null);
      cargarDatos();
    } catch (error) {
      const errorData = error.response?.data;
      const msjValidacion = errorData?.message || JSON.stringify(errorData) || error.message;
      alert(`Error al guardar:\n${msjValidacion}`);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditId(null);
  };

  const permiteDecimales = !formData.esDirecto && formData.unidadVisual !== 'Piezas';

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Control de Inventario y Productos</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={handleOpenCreate}
          sx={{ backgroundColor: '#691c32' }}
        >
          Nuevo Producto
        </Button>
      </Box>

      <Paper elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><b>Producto</b></TableCell>
              <TableCell><b>Descripción</b></TableCell>
              <TableCell><b>Categoría</b></TableCell>
              <TableCell><b>Precio</b></TableCell>
              <TableCell><b>Tipo</b></TableCell>
              <TableCell align="center"><b>Stock Disponible</b></TableCell>
              <TableCell align="center"><b>Stock Mínimo</b></TableCell>
              <TableCell align="center"><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventario.map((item) => {
              const inv = item.inventario || item;
              const stockActualVal = inv.stockActual ?? item.stockActual ?? 0;
              const stockMinimoVal = inv.stockMinimo ?? item.stockMinimo ?? 0;
              const esDirectoVal = item.esDirecto ?? true;

              return (
                <TableRow key={item.id}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{item.nombre}</TableCell>
                  <TableCell>{item.descripcion || '-'}</TableCell>
                  <TableCell>{item.categoria?.nombre || '-'}</TableCell>
                  <TableCell>${Number(item.precio || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={esDirectoVal ? 'Venta Directa' : 'Materia Prima'} 
                      color={esDirectoVal ? 'info' : 'secondary'} 
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={formatearUnidad(stockActualVal, item)} 
                      size="small"
                      sx={{ backgroundColor: '#f5f5f5', color: '#555', fontWeight: '500' }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'text.secondary' }}>
                    {formatearUnidad(stockMinimoVal, item)}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Reabastecer / Sumar Stock">
                      <IconButton onClick={() => handleOpenSumarStock(item)} sx={{ color: '#2e7d32' }}>
                        <Inventory2Icon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar Producto">
                      <IconButton onClick={() => handleEdit(item)} sx={{ color: '#691c32' }}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {inventario.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  No hay productos o insumos registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? 'Editar Registro' : 'Nuevo Registro'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nombre del Producto/Insumo"
                fullWidth
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Tipo de Registro"
                fullWidth
                value={formData.esDirecto}
                onChange={handleTipoRegistroChange}
              >
                <MenuItem value={true}>Venta Directa (Ej. Papas, Agua)</MenuItem>
                <MenuItem value={false}>Materia Prima (Ej. Leche, Café)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Descripción"
                fullWidth
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Categoría"
                fullWidth
                value={formData.categoriaId}
                onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
              >
                <MenuItem value=""><em>Sin categoría</em></MenuItem>
                {categorias.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.nombre}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Precio de Venta ($)"
                type="number"
                fullWidth
                onKeyDown={(e) => handleKeyDownNumerico(e, true)}
                inputProps={{ min: 0, step: "0.01" }}
                disabled={!formData.esDirecto}
                helperText={!formData.esDirecto ? "La materia prima no tiene precio directo" : ""}
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Stock Inicial"
                type="number"
                fullWidth
                onKeyDown={(e) => handleKeyDownNumerico(e, permiteDecimales)}
                inputProps={{ min: 0, step: permiteDecimales ? "any" : "1" }}
                helperText={!permiteDecimales ? "Solo números enteros" : "Soporta decimales"}
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Stock Mínimo"
                type="number"
                fullWidth
                onKeyDown={(e) => handleKeyDownNumerico(e, permiteDecimales)}
                inputProps={{ min: 0, step: permiteDecimales ? "any" : "1" }}
                helperText={!permiteDecimales ? "Solo números enteros" : "Soporta decimales"}
                value={formData.stockMinimo}
                onChange={(e) => setFormData({ ...formData, stockMinimo: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Unidad de Medida"
                fullWidth
                disabled={formData.esDirecto}
                helperText={formData.esDirecto ? "Venta directa solo permite Piezas" : ""}
                value={formData.esDirecto ? 'Piezas' : formData.unidadVisual}
                onChange={(e) => setFormData({ ...formData, unidadVisual: e.target.value })}
              >
                {unidadesVisuales.map((uni) => (
                  <MenuItem key={uni} value={uni}>{uni}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardar} sx={{ backgroundColor: '#691c32' }}>
            {editId ? 'Guardar Cambios' : 'Crear Registro'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openStockDialog} onClose={() => setOpenStockDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reabastecer Stock</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Producto: <b>{productoSeleccionado?.nombre}</b>
            </Typography>
            <TextField
              label="Cantidad a sumar"
              type="number"
              fullWidth
              autoFocus
              sx={{ mt: 2 }}
              onKeyDown={(e) => handleKeyDownNumerico(e, !productoSeleccionado?.esDirecto && productoSeleccionado?.unidadMedida !== 'UNIDAD')}
              inputProps={{ 
                min: 0, 
                step: (productoSeleccionado?.esDirecto || productoSeleccionado?.unidadMedida === 'UNIDAD') ? "1" : "any" 
              }}
              value={stockExtra}
              onChange={(e) => setStockExtra(e.target.value)}
              helperText={
                (productoSeleccionado?.esDirecto || productoSeleccionado?.unidadMedida === 'UNIDAD')
                  ? "Ingresa números enteros únicamente." 
                  : "Se sumará al stock disponible actual."
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStockDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardarStockExtra} sx={{ backgroundColor: '#2e7d32' }}>
            Sumar Stock
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}