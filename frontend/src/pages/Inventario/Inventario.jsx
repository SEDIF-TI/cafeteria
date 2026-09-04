import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Stack,
  Chip,
  InputAdornment
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import SearchIcon from '@mui/icons-material/Search';
import Inventory2Icon from '@mui/icons-material/Inventory2';

// --- DATOS SIMULADOS (MOCKS) ---
const INVENTARIO_INICIAL = [
  { id: 1, codigo: 'CAF-001', nombre: 'Café Americano (Taza)', stock: 45, stockMinimo: 10, precioVenta: 25.00 },
  { id: 2, codigo: 'CAF-002', nombre: 'Capuchino', stock: 30, stockMinimo: 8, precioVenta: 35.00 },
  { id: 3, codigo: 'BEB-001', nombre: 'Refresco de Cola 600ml', stock: 12, stockMinimo: 15, precioVenta: 22.00 }, // Stock bajo de ejemplo
  { id: 4, codigo: 'COM-001', nombre: 'Sándwich de Jamón', stock: 8, stockMinimo: 5, precioVenta: 45.00 },
  { id: 5, codigo: 'POS-001', nombre: 'Rebanada de Pastel de Chocolate', stock: 4, stockMinimo: 6, precioVenta: 40.00 }, // Stock bajo
];

export default function Inventario() {
  const [inventario, setInventario] = useState(INVENTARIO_INICIAL);
  const [busqueda, setBusqueda] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    stock: '',
    stockMinimo: '',
    precioVenta: ''
  });

  const [modalMensaje, setModalMensaje] = useState({
    open: false,
    titulo: '',
    texto: '',
    esError: false
  });

  // Filtrar productos por búsqueda
  const productosFiltrados = inventario.filter(item => 
    item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    item.codigo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ codigo: '', nombre: '', stock: '', stockMinimo: '', precioVenta: '' });
    setOpenDialog(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item.id);
    setFormData({
      codigo: item.codigo,
      nombre: item.nombre,
      stock: item.stock,
      stockMinimo: item.stockMinimo,
      precioVenta: item.precioVenta
    });
    setOpenDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.nombre.trim() || !formData.codigo.trim()) {
      setModalMensaje({
        open: true,
        titulo: 'Atención',
        texto: 'El código y el nombre del producto son obligatorios.',
        esError: true
      });
      return;
    }

    if (editingItem) {
      setInventario(prev => prev.map(item => 
        item.id === editingItem ? { ...item, ...formData, stock: Number(formData.stock), stockMinimo: Number(formData.stockMinimo), precioVenta: Number(formData.precioVenta) } : item
      ));
      setModalMensaje({
        open: true,
        titulo: 'Éxito',
        texto: 'El producto se ha actualizado correctamente.',
        esError: false
      });
    } else {
      const nuevoProducto = {
        id: Date.now(),
        ...formData,
        stock: Number(formData.stock),
        stockMinimo: Number(formData.stockMinimo),
        precioVenta: Number(formData.precioVenta)
      };
      setInventario(prev => [...prev, nuevoProducto]);
      setModalMensaje({
        open: true,
        titulo: 'Éxito',
        texto: 'El producto se ha agregado al inventario.',
        esError: false
      });
    }

    setOpenDialog(false);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Encabezado y Buscador */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
        <Typography variant="h4" component="h1" fontWeight="bold" color="text.primary">
          Control de Inventario
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            placeholder="Buscar por código o nombre..."
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
            sx={{ backgroundColor: 'white', borderRadius: 1, width: '250px' }}
          />
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleOpenCreate}
            startIcon={<Inventory2Icon />}
            sx={{ py: 1, px: 3, fontWeight: 'bold' }} 
          >
            Nuevo Artículo
          </Button>
        </Box>
      </Box>

      {/* Tabla de Inventario */}
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><b>Código</b></TableCell>
              <TableCell><b>Producto</b></TableCell>
              <TableCell align="center"><b>Stock Actual</b></TableCell>
              <TableCell align="center"><b>Stock Mínimo</b></TableCell>
              <TableCell align="right"><b>Precio Venta</b></TableCell>
              <TableCell align="center"><b>Estado Stock</b></TableCell>
              <TableCell align="center" sx={{ width: '120px' }}><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {productosFiltrados.map((item) => {
              const esStockBajo = item.stock <= item.stockMinimo;
              return (
                <TableRow key={item.id} hover>
                  <TableCell>{item.codigo}</TableCell>
                  <TableCell>{item.nombre}</TableCell>
                  <TableCell align="center">
                    <Typography fontWeight="bold" color={esStockBajo ? 'error.main' : 'text.primary'}>
                      {item.stock}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{item.stockMinimo}</TableCell>
                  <TableCell align="right">${item.precioVenta.toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={esStockBajo ? 'Stock Bajo' : 'Óptimo'} 
                      color={esStockBajo ? 'error' : 'success'}
                      size="small"
                      variant={esStockBajo ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                      <IconButton 
                        color="primary"
                        onClick={() => handleOpenEdit(item)}
                        title="Editar Artículo"
                      >
                        <EditIcon />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {productosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No se encontraron productos en el inventario.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal de Creación / Edición */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {editingItem ? 'Editar Artículo' : 'Nuevo Artículo en Inventario'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} mt={2}>
            <TextField
              label="Código del Producto"
              fullWidth
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
            />
            <TextField
              label="Nombre del Producto"
              fullWidth
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
            <Box display="flex" gap={2}>
              <TextField
                label="Stock Actual"
                type="number"
                fullWidth
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              />
              <TextField
                label="Stock Mínimo de Alerta"
                type="number"
                fullWidth
                value={formData.stockMinimo}
                onChange={(e) => setFormData({ ...formData, stockMinimo: e.target.value })}
              />
            </Box>
            <TextField
                label="Precio de Venta ($)"
                type="number"
                fullWidth
                value={formData.precioVenta}
                onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit" sx={{ fontWeight: 'bold' }}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary" sx={{ fontWeight: 'bold' }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Mensajes */}
      <Dialog 
        open={modalMensaje.open} 
        onClose={() => setModalMensaje({ ...modalMensaje, open: false })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: modalMensaje.esError ? 'error.main' : 'success.main', fontWeight: 'bold' }}>
          {modalMensaje.titulo}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mt: 1, color: 'text.primary', fontSize: '1.1rem' }}>
            {modalMensaje.texto}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setModalMensaje({ ...modalMensaje, open: false })} 
            variant="contained" 
            color={modalMensaje.esError ? 'error' : 'primary'}
            autoFocus
          >
            Aceptar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}