import React, { useState, useEffect, useMemo } from 'react';
import {
  Container, Typography, Box, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Chip, Grid, IconButton, Tooltip,
  InputAdornment, Autocomplete, Divider, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import BuildIcon from '@mui/icons-material/Build';
import api from '../../api/axiosClient';
import { useFeedback } from '../../components/FeedbackProvider';
import usePaginacion from '../../hooks/usePaginacion';
import PaginacionTabla from '../../components/PaginacionTabla';

// Devuelve el tipo de un producto ('DIRECTO' | 'PREPARADO' | 'MATERIA_PRIMA').
// Usa tipoProducto (nuevo); si faltara (dato viejo), lo deduce del esDirecto/inventario.
const tipoDe = (item) => {
  if (item?.tipoProducto) return item.tipoProducto;
  if (item?.esDirecto === false) return item?.inventario ? 'MATERIA_PRIMA' : 'PREPARADO';
  return 'DIRECTO';
};

// Unidad base del insumo (la receta siempre se captura en g, ml o piezas).
const unidadInsumo = (insumo) => {
  const uni = String(insumo?.inventario?.unidadMedida || '').toUpperCase();
  if (uni.includes('GRAMO')) return { sufijo: 'g', esPieza: false, porMil: true };
  if (uni.includes('MILILITRO')) return { sufijo: 'ml', esPieza: false, porMil: true };
  return { sufijo: 'pza', esPieza: true, porMil: false };
};

export default function Inventario() {
  const { notificar } = useFeedback();
  const [inventario, setInventario] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openStockDialog, setOpenStockDialog] = useState(false);

  const [openAjusteDialog, setOpenAjusteDialog] = useState(false);
  const [productoAjuste, setProductoAjuste] = useState(null);
  const [nuevoStockAjuste, setNuevoStockAjuste] = useState('');
  const [motivoAjuste, setMotivoAjuste] = useState('');

  const [editId, setEditId] = useState(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [stockExtra, setStockExtra] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    costo: '',
    categoriaId: '',
    tipoProducto: 'DIRECTO',
    cantidad: '',
    stockMinimo: '',
    unidadVisual: 'Piezas'
  });

  // Receta del producto PREPARADO, capturada en el mismo diálogo: [{ insumoId, cantidad }]
  const [ingredientes, setIngredientes] = useState([]);
  const [cargandoReceta, setCargandoReceta] = useState(false);

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
      uni = tipoDe(item) === 'DIRECTO' ? 'UNIDAD' : 'GRAMOS';
    }

    if (uni.includes('MILILITRO') || uni.includes('LITRO')) {
      return cantidad >= 1000 ? `${Number((cantidad / 1000).toFixed(2))} L` : `${cantidad} ml`;
    }
    if (uni.includes('GRAMO') || uni.includes('KILO')) {
      return cantidad >= 1000 ? `${Number((cantidad / 1000).toFixed(2))} Kg` : `${cantidad} g`;
    }

    return `${Math.floor(cantidad)} unidades`;
  };

  const obtenerDetallesUnidad = (item) => {
    if (!item) return { esPieza: true, unidadMedEnum: 'UNIDAD', unidadTexto: 'Piezas', sufijo: 'pza', factor: 1 };

    const inv = item.inventario || item;
    let uniMedStr = (inv.unidadMedida ?? inv.unidad_medida ?? item.unidadMedida ?? '').toString().toUpperCase();

    if (!uniMedStr) uniMedStr = tipoDe(item) === 'DIRECTO' ? 'UNIDAD' : 'GRAMOS';

    if (uniMedStr.includes('GRAMO') || uniMedStr.includes('KILO')) {
      return { esPieza: false, unidadMedEnum: 'GRAMOS', unidadTexto: 'Kilos (Kg)', sufijo: 'Kg', factor: 1000 };
    }
    if (uniMedStr.includes('LITRO') || uniMedStr.includes('MILILITRO')) {
      return { esPieza: false, unidadMedEnum: 'MILILITROS', unidadTexto: 'Litros (L)', sufijo: 'L', factor: 1000 };
    }
    return { esPieza: true, unidadMedEnum: 'UNIDAD', unidadTexto: 'Piezas / Unidades', sufijo: 'pza', factor: 1 };
  };

  const handleOpenCreate = () => {
    setEditId(null);
    setFormData({
      nombre: '', descripcion: '', precio: '', costo: '', categoriaId: '',
      tipoProducto: 'DIRECTO', cantidad: '', stockMinimo: '', unidadVisual: 'Piezas'
    });
    setIngredientes([]);
    setOpenDialog(true);
  };

  const handleTipoRegistroChange = (e) => {
    const tipo = e.target.value; // 'DIRECTO' | 'PREPARADO' | 'MATERIA_PRIMA'
    if (tipo === 'PREPARADO' && ingredientes.length === 0) {
      setIngredientes([{ insumoId: '', cantidad: '' }]);
    }
    setFormData((prev) => ({
      ...prev,
      tipoProducto: tipo,
      unidadVisual: tipo === 'DIRECTO' ? 'Piezas' : (prev.unidadVisual === 'Piezas' ? 'Gramos' : prev.unidadVisual),
      // La materia prima no se vende -> precio 0. Directo y Preparado conservan precio.
      precio: tipo === 'MATERIA_PRIMA' ? 0 : prev.precio
    }));
  };

  const handleEdit = (item) => {
    const inv = item.inventario || item;
    const stockAct = inv.stockActual ?? item.stockActual ?? 0;
    const stockMin = inv.stockMinimo ?? item.stockMinimo ?? 0;
    const tipoVal = tipoDe(item);
    const esDir = tipoVal === 'DIRECTO';

    let uniMed = (inv.unidadMedida ?? item.unidadMedida ?? '').toString().toUpperCase();
    if (!uniMed) uniMed = esDir ? 'UNIDAD' : 'GRAMOS';

    let cant = parseFloat(stockAct) || 0;
    let min = parseFloat(stockMin) || 0;
    let uniVisual = 'Piezas';

    if (esDir || tipoVal === 'PREPARADO') {
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
      costo: item.costo || 0,
      categoriaId: item.categoria?.id || item.categoriaId || '',
      tipoProducto: tipoVal,
      cantidad: cant,
      stockMinimo: min,
      unidadVisual: uniVisual
    });

    setEditId(item.id);
    setIngredientes([]);
    setOpenDialog(true);

    if (tipoVal === 'PREPARADO') {
      cargarReceta(item.id);
    }
  };

  const cargarReceta = async (productoId) => {
    setCargandoReceta(true);
    try {
      const res = await api.get(`/recetas/producto/${productoId}`);
      const filas = (res.data || []).map((r) => ({ insumoId: Number(r.insumoId), cantidad: r.cantidad }));
      setIngredientes(filas.length > 0 ? filas : [{ insumoId: '', cantidad: '' }]);
    } catch (error) {
      console.error('Error al cargar la receta:', error);
      notificar('No se pudo cargar la receta del producto.', 'error');
    } finally {
      setCargandoReceta(false);
    }
  };

  const handleIngredienteChange = (index, campo, valor) => {
    setIngredientes((prev) => prev.map((fila, i) => {
      if (i !== index) return fila;
      // Al cambiar de insumo se limpia la cantidad: la unidad puede ser otra.
      return campo === 'insumoId' ? { insumoId: valor, cantidad: '' } : { ...fila, [campo]: valor };
    }));
  };

  const handleOpenSumarStock = (item) => {
    setProductoSeleccionado(item);
    setStockExtra('');
    setOpenStockDialog(true);
  };

  const handleOpenAjuste = (item) => {
    const inv = item.inventario || item;
    setProductoAjuste(item);

    const detalles = obtenerDetallesUnidad(item);
    const stockActualBase = parseFloat(inv.stockActual ?? item.stockActual ?? 0) || 0;

    const stockVisual = detalles.esPieza ? stockActualBase : (stockActualBase / detalles.factor);

    setNuevoStockAjuste(stockVisual);
    setMotivoAjuste('');
    setOpenAjusteDialog(true);
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
      notificar("Por favor ingresa una cantidad válida y mayor a cero.", 'warning');
      return;
    }

    const inv = productoSeleccionado.inventario || productoSeleccionado;
    const stockActualVal = parseFloat(inv.stockActual ?? productoSeleccionado.stockActual ?? 0) || 0;

    const detalles = obtenerDetallesUnidad(productoSeleccionado);

    if (detalles.esPieza && !Number.isInteger(extraVal)) {
      notificar("Para productos en Venta Directa o Piezas solo se permiten números enteros.", 'warning');
      return;
    }

    const extraBase = detalles.esPieza ? extraVal : extraVal * detalles.factor;
    const nuevoStockTotal = stockActualVal + extraBase;
    const idCat = productoSeleccionado.categoria?.id || productoSeleccionado.categoriaId;
    const tipo = tipoDe(productoSeleccionado);

    const payload = {
      nombre: productoSeleccionado.nombre,
      descripcion: productoSeleccionado.descripcion || '',
      precio: tipo === 'DIRECTO' ? (parseFloat(productoSeleccionado.precio) || 0) : 0,
      costo: parseFloat(productoSeleccionado.costo) || 0,
      tipoProducto: tipo,
      categoriaId: idCat,
      stock: nuevoStockTotal,
      stockMinimo: parseFloat(inv.stockMinimo ?? productoSeleccionado.stockMinimo ?? 0),
      unidadMedida: detalles.unidadMedEnum
    };

    try {
      await api.put(`/productos/${productoSeleccionado.id}`, payload);
      setOpenStockDialog(false);
      setProductoSeleccionado(null);
      setStockExtra('');
      cargarDatos();
      notificar('Stock agregado correctamente.', 'success');
    } catch (error) {
      const errorData = error.response?.data;
      const msjValidacion = errorData?.message || JSON.stringify(errorData) || error.message;
      notificar(`El servidor rechazó la petición: ${msjValidacion}`, 'error');
    }
  };

  const handleGuardarAjuste = async () => {
    if (!productoAjuste) return;

    const nuevaCantidadVal = parseFloat(nuevoStockAjuste);

    if (isNaN(nuevaCantidadVal) || nuevaCantidadVal < 0) {
      notificar("Por favor ingresa una cantidad válida (mayor o igual a cero).", 'warning');
      return;
    }

    const detalles = obtenerDetallesUnidad(productoAjuste);

    if (detalles.esPieza && !Number.isInteger(nuevaCantidadVal)) {
      notificar("Para productos en Venta Directa o Piezas solo se permiten números enteros.", 'warning');
      return;
    }

    const cantidadBase = detalles.esPieza ? nuevaCantidadVal : (nuevaCantidadVal * detalles.factor);
    const invId = productoAjuste.inventario?.id || productoAjuste.id;

    try {
      await api.put(`/inventario/${invId}/ajustar`, {
        nuevaCantidad: cantidadBase,
        motivoAjuste: motivoAjuste
      });

      setOpenAjusteDialog(false);
      setProductoAjuste(null);
      setNuevoStockAjuste('');
      setMotivoAjuste('');
      cargarDatos();
      notificar('Inventario ajustado correctamente.', 'success');
    } catch (error) {
      const errorData = error.response?.data;
      const msjValidacion = errorData?.message || JSON.stringify(errorData) || error.message;
      notificar(`Error al ajustar el inventario: ${msjValidacion}`, 'error');
    }
  };

  const handleGuardar = async () => {
    if (!formData.nombre.trim()) {
      notificar("El nombre del producto es obligatorio.", 'warning');
      return;
    }

    const tipo = formData.tipoProducto;
    const seVende = tipo === 'DIRECTO' || tipo === 'PREPARADO';
    const tieneStock = tipo === 'DIRECTO' || tipo === 'MATERIA_PRIMA';

    let precioVal = parseFloat(formData.precio);
    let costoVal = parseFloat(formData.costo);

    if (seVende && (isNaN(precioVal) || precioVal < 0)) {
      notificar("El precio de venta debe ser un valor válido mayor o igual a 0.", 'warning');
      return;
    }

    if (isNaN(costoVal) || costoVal < 0) {
      costoVal = 0;
    }
    if (tipo === 'PREPARADO') {
      costoVal = Number(costoReceta.toFixed(2)); // el servidor lo recalcula al guardar la receta
    }

    let cantidadFinal = 0;
    let minimoFinal = 0;
    let unidadBase = 'UNIDAD';

    if (tieneStock) {
      const cantidadVal = parseFloat(formData.cantidad);
      const minimoVal = parseFloat(formData.stockMinimo);

      if (isNaN(cantidadVal) || cantidadVal < 0) {
        notificar("El stock inicial debe ser un número mayor o igual a 0.", 'warning');
        return;
      }
      if (isNaN(minimoVal) || minimoVal < 0) {
        notificar("El stock mínimo debe ser un número mayor o igual a 0.", 'warning');
        return;
      }

      const esPieza = tipo === 'DIRECTO' || formData.unidadVisual === 'Piezas';

      if (esPieza && (!Number.isInteger(cantidadVal) || !Number.isInteger(minimoVal))) {
        notificar("Los productos registrados por Pieza / Venta Directa deben ser números enteros.", 'warning');
        return;
      }

      cantidadFinal = cantidadVal;
      minimoFinal = minimoVal;

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
    }

    let ingredientesPayload;
    if (tipo === 'PREPARADO') {
      if (ingredientes.length === 0) {
        notificar('Agrega al menos un insumo a la receta.', 'warning');
        return;
      }
      for (const fila of ingredientes) {
        const insumo = insumosDisponibles.find((i) => Number(i.id) === Number(fila.insumoId));
        const cant = parseFloat(fila.cantidad);
        if (!insumo || isNaN(cant) || cant <= 0) {
          notificar('Cada insumo de la receta debe estar seleccionado y con cantidad mayor a 0.', 'warning');
          return;
        }
        if (unidadInsumo(insumo).esPieza && !Number.isInteger(cant)) {
          notificar(`La cantidad de "${insumo.nombre}" va en piezas: usa un número entero.`, 'warning');
          return;
        }
      }
      ingredientesPayload = ingredientes.map((f) => ({ insumoId: Number(f.insumoId), cantidad: parseFloat(f.cantidad) }));
    }

    const idCat = formData.categoriaId ? parseInt(formData.categoriaId, 10) : null;

    const payload = {
      ingredientes: ingredientesPayload,
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion || '',
      precio: seVende ? (precioVal || 0) : 0,
      costo: costoVal,
      tipoProducto: tipo,
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
      notificar(editId ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.', 'success');
    } catch (error) {
      const errorData = error.response?.data;
      const msjValidacion = errorData?.message || JSON.stringify(errorData) || error.message;
      notificar(`Error al guardar: ${msjValidacion}`, 'error');
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditId(null);
  };

  // Productos ordenados alfabéticamente (sin importar su tipo/estado) + paginación.
  const inventarioOrdenado = useMemo(
    () => [...inventario].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })),
    [inventario]
  );
  const pag = usePaginacion(inventarioOrdenado);

  // Insumos que pueden entrar en una receta (materia prima activa).
  const insumosDisponibles = useMemo(
    () => inventarioOrdenado.filter((p) => tipoDe(p) === 'MATERIA_PRIMA' && p.activo !== false),
    [inventarioOrdenado]
  );

  const esPreparadoForm = formData.tipoProducto === 'PREPARADO';
  const esMateriaPrimaForm = formData.tipoProducto === 'MATERIA_PRIMA';

  // Costo estimado de una porción: el costo del insumo es por Kg / L / pieza.
  const costoReceta = ingredientes.reduce((total, fila) => {
    const insumo = insumosDisponibles.find((i) => Number(i.id) === Number(fila.insumoId));
    const cant = parseFloat(fila.cantidad);
    if (!insumo || isNaN(cant)) return total;
    const costo = Number(insumo.costo || 0);
    return total + (unidadInsumo(insumo).porMil ? (costo / 1000) * cant : costo * cant);
  }, 0);
  const permiteDecimales = esMateriaPrimaForm && formData.unidadVisual !== 'Piezas';
  const detallesStockDialog = obtenerDetallesUnidad(productoSeleccionado);
  const detallesAjusteDialog = obtenerDetallesUnidad(productoAjuste);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography
        variant="h5"
        sx={{
          fontWeight: "bold",
          mb: 4
        }}>
        Control de Inventario y Productos
      </Typography>
      <Box sx={{ mt: 2, mb: 5 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ backgroundColor: 'primary.main', py: 1, px: 3, fontWeight: 'bold' }}
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
              <TableCell><b>Costo ($)</b></TableCell>
              <TableCell><b>Precio ($)</b></TableCell>
              <TableCell><b>Tipo</b></TableCell>
              <TableCell align="center"><b>Stock Disponible</b></TableCell>
              <TableCell align="center"><b>Stock Mínimo</b></TableCell>
              <TableCell align="center" sx={{ minWidth: 150, whiteSpace: 'nowrap' }}><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pag.pagina.map((item) => {
              const inv = item.inventario || item;
              const stockActualVal = inv.stockActual ?? item.stockActual ?? 0;
              const stockMinimoVal = inv.stockMinimo ?? item.stockMinimo ?? 0;
              const tipoVal = tipoDe(item);
              // Preparado: se arma por receta (sin inventario físico propio).
              const esPreparado = tipoVal === 'PREPARADO';

              const tipoLabel = tipoVal === 'DIRECTO' ? 'Venta Directa'
                : tipoVal === 'PREPARADO' ? 'Preparado' : 'Materia Prima';
              const tipoColor = tipoVal === 'DIRECTO' ? 'info'
                : tipoVal === 'PREPARADO' ? 'success' : 'secondary';

              return (
                <TableRow key={item.id}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{item.nombre}</TableCell>
                  <TableCell>{item.descripcion || '-'}</TableCell>
                  <TableCell>{item.categoria?.nombre || '-'}</TableCell>
                  <TableCell sx={{ color: '#d32f2f', fontWeight: '500' }}>
                    ${Number(item.costo || 0).toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ color: '#2e7d32', fontWeight: '500' }}>
                    ${Number(item.precio || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Chip label={tipoLabel} color={tipoColor} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={esPreparado
                        ? `${Number(item.stockDisponible || 0)} porciones`
                        : formatearUnidad(stockActualVal, item)}
                      size="small"
                      sx={{ backgroundColor: '#f5f5f5', color: '#555', fontWeight: '500' }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'text.secondary' }}>
                    {esPreparado ? '— (según receta)' : formatearUnidad(stockMinimoVal, item)}
                  </TableCell>

                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
                      {!esPreparado && (
                        <>
                          <Tooltip title="Reabastecer / Sumar Stock">
                            <IconButton size="small" onClick={() => handleOpenSumarStock(item)} sx={{ color: '#2e7d32' }}>
                              <Inventory2Icon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Ajustar / Forzar Stock Exacto">
                            <IconButton size="small" onClick={() => handleOpenAjuste(item)} sx={{ color: '#ed6c02' }}>
                              <BuildIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}

                      <Tooltip title="Editar Producto">
                        <IconButton size="small" onClick={() => handleEdit(item)} sx={{ color: 'primary.main' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            {inventarioOrdenado.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  No hay productos o insumos registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {inventarioOrdenado.length > 0 && <PaginacionTabla pag={pag} />}
      </Paper>

      {/* Modal 1: Crear / Editar */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? 'Editar Registro' : 'Nuevo Registro'}</DialogTitle>
        <DialogContent>
          <Grid container columnSpacing={2.5} rowSpacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Nombre del Producto/Insumo"
                fullWidth
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                label="Tipo de Registro"
                fullWidth
                value={formData.tipoProducto}
                onChange={handleTipoRegistroChange}
              >
                <MenuItem value="DIRECTO">Venta Directa (Ej. Papas, Agua)</MenuItem>
                <MenuItem value="PREPARADO">Producto Preparado (Ej. Sándwich — usa receta)</MenuItem>
                <MenuItem value="MATERIA_PRIMA">Materia Prima / Insumo (Ej. Leche, Café)</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Descripción"
                fullWidth
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
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
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Costo ($)"
                type="number"
                fullWidth
                onKeyDown={(e) => handleKeyDownNumerico(e, true)}
                disabled={esPreparadoForm}
                helperText={esMateriaPrimaForm ? "Costo por Kilo / Litro / Pieza de insumo"
                  : (esPreparadoForm ? "Se calcula con la receta" : "Costo de compra / preparación")}
                value={esPreparadoForm ? costoReceta.toFixed(2) : formData.costo}
                onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                slotProps={{
                  htmlInput: { min: 0, step: "0.01" }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Precio de Venta ($)"
                type="number"
                fullWidth
                onKeyDown={(e) => handleKeyDownNumerico(e, true)}
                disabled={esMateriaPrimaForm}
                helperText={esMateriaPrimaForm ? "La materia prima no se vende directamente" : ""}
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                slotProps={{
                  htmlInput: { min: 0, step: "0.01" }
                }}
              />
            </Grid>

            {/* Stock: solo para Directo y Materia Prima (el Preparado se calcula de la receta) */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Stock Inicial"
                type="number"
                fullWidth
                disabled={esPreparadoForm}
                onKeyDown={(e) => handleKeyDownNumerico(e, permiteDecimales)}
                helperText={esPreparadoForm ? "El stock se calcula de la receta" : (!permiteDecimales ? "Solo números enteros" : "Soporta decimales")}
                value={esPreparadoForm ? '' : formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                slotProps={{
                  htmlInput: { min: 0, step: permiteDecimales ? "any" : "1" }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Stock Mínimo"
                type="number"
                fullWidth
                disabled={esPreparadoForm}
                onKeyDown={(e) => handleKeyDownNumerico(e, permiteDecimales)}
                helperText={esPreparadoForm ? "No aplica" : (!permiteDecimales ? "Solo números enteros" : "Soporta decimales")}
                value={esPreparadoForm ? '' : formData.stockMinimo}
                onChange={(e) => setFormData({ ...formData, stockMinimo: e.target.value })}
                slotProps={{
                  htmlInput: { min: 0, step: permiteDecimales ? "any" : "1" }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                label="Unidad de Medida"
                fullWidth
                disabled={formData.tipoProducto === 'DIRECTO' || esPreparadoForm}
                helperText={formData.tipoProducto === 'DIRECTO' ? "Venta directa solo permite Piezas" : (esPreparadoForm ? "No aplica" : "")}
                value={formData.tipoProducto === 'DIRECTO' ? 'Piezas' : formData.unidadVisual}
                onChange={(e) => setFormData({ ...formData, unidadVisual: e.target.value })}
              >
                {unidadesVisuales.map((uni) => (
                  <MenuItem key={uni} value={uni}>{uni}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {/* Receta: solo PREPARADO. Se guarda junto con el producto. */}
          {esPreparadoForm && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Receta (insumos por porción)
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Lo que se descuenta del inventario cada vez que se vende una porción.
              </Typography>

              {cargandoReceta ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                ingredientes.map((fila, index) => {
                  const insumo = insumosDisponibles.find((i) => Number(i.id) === Number(fila.insumoId)) || null;
                  const unidad = unidadInsumo(insumo);
                  return (
                    <Grid container spacing={2} key={index} sx={{ mb: 1.5, alignItems: 'center' }}>
                      <Grid size={{ xs: 12, sm: 7 }}>
                        <Autocomplete
                          options={insumosDisponibles}
                          getOptionLabel={(o) => o?.nombre || ''}
                          isOptionEqualToValue={(o, v) => Number(o.id) === Number(v?.id)}
                          value={insumo}
                          onChange={(e, nuevo) => handleIngredienteChange(index, 'insumoId', nuevo ? Number(nuevo.id) : '')}
                          noOptionsText="No hay materia prima registrada"
                          renderInput={(params) => <TextField {...params} label="Insumo" size="small" />}
                        />
                      </Grid>
                      <Grid size={{ xs: 9, sm: 4 }}>
                        <TextField
                          label="Cantidad"
                          type="number"
                          size="small"
                          fullWidth
                          disabled={!insumo}
                          value={fila.cantidad}
                          onKeyDown={(e) => handleKeyDownNumerico(e, !unidad.esPieza)}
                          onChange={(e) => handleIngredienteChange(index, 'cantidad', e.target.value)}
                          slotProps={{
                            input: {
                              endAdornment: insumo ? <InputAdornment position="end">{unidad.sufijo}</InputAdornment> : null
                            },
                            htmlInput: { min: 0, step: unidad.esPieza ? '1' : 'any' }
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 3, sm: 1 }} sx={{ textAlign: 'center' }}>
                        <Tooltip title="Quitar insumo">
                          <IconButton color="error" onClick={() => setIngredientes((prev) => prev.filter((_, i) => i !== index))}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Grid>
                    </Grid>
                  );
                })
              )}

              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                disabled={cargandoReceta}
                onClick={() => setIngredientes((prev) => [...prev, { insumoId: '', cantidad: '' }])}
              >
                Agregar insumo
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" color="error" onClick={handleCloseDialog}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleGuardar}>
            {editId ? 'Guardar Cambios' : 'Crear Registro'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 2: Reabastecer Stock */}
      <Dialog open={openStockDialog} onClose={() => setOpenStockDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reabastecer Stock</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" gutterBottom sx={{
              color: "text.secondary"
            }}>
              Producto: <b>{productoSeleccionado?.nombre}</b>
            </Typography>
            <TextField
              label={`Cantidad a sumar (${detallesStockDialog.sufijo})`}
              type="number"
              fullWidth
              autoFocus
              sx={{ mt: 2 }}
              onKeyDown={(e) => handleKeyDownNumerico(e, !detallesStockDialog.esPieza)}
              value={stockExtra}
              onChange={(e) => setStockExtra(e.target.value)}
              helperText={
                detallesStockDialog.esPieza
                  ? "Ingresa números enteros únicamente."
                  : `Ingresa la cantidad en ${detallesStockDialog.unidadTexto}.`
              }
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
                        {detallesStockDialog.sufijo}
                      </Typography>
                    </InputAdornment>
                  )
                },

                htmlInput: { min: 0, step: detallesStockDialog.esPieza ? "1" : "any" }
              }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="error" onClick={() => setOpenStockDialog(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleGuardarStockExtra}>
            Sumar Stock
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 3: Ajustar Inventario */}
      <Dialog open={openAjusteDialog} onClose={() => setOpenAjusteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Ajuste de Inventario</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" gutterBottom sx={{
              color: "text.secondary"
            }}>
              Producto a ajustar: <b>{productoAjuste?.nombre}</b>
            </Typography>
            <Typography variant="caption" color="error" gutterBottom sx={{ display: 'block' }}>
              Atención: Esta acción sobreescribirá la cantidad actual en el sistema.
            </Typography>

            <TextField
              label={`Nueva Cantidad Exacta (${detallesAjusteDialog.sufijo})`}
              type="number"
              fullWidth
              autoFocus
              sx={{ mt: 2 }}
              onKeyDown={(e) => handleKeyDownNumerico(e, !detallesAjusteDialog.esPieza)}
              value={nuevoStockAjuste}
              onChange={(e) => setNuevoStockAjuste(e.target.value)}
              helperText="Indica la cantidad real que hay actualmente en almacén."
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
                        {detallesAjusteDialog.sufijo}
                      </Typography>
                    </InputAdornment>
                  )
                },

                htmlInput: { min: 0, step: detallesAjusteDialog.esPieza ? "1" : "any" }
              }} />

            <TextField
              label="Motivo del Ajuste (Opcional)"
              fullWidth
              sx={{ mt: 3 }}
              placeholder="Ej. Merma, caducidad, conteo físico..."
              value={motivoAjuste}
              onChange={(e) => setMotivoAjuste(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="error" onClick={() => setOpenAjusteDialog(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleGuardarAjuste}>
            Confirmar Ajuste
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
}
