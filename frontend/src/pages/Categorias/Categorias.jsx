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
  Chip
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// --- DATOS SIMULADOS (MOCKS) ---
const CATEGORIAS_INICIALES = [
  { id: 1, nombre: 'Bebidas Calientes', descripcion: 'Cafés, tés e infusiones', activa: true },
  { id: 2, nombre: 'Bebidas Frías', descripcion: 'Refrescos, jugos y aguas de sabor', activa: true },
  { id: 3, nombre: 'Comida Rápida', descripcion: 'Sándwiches, tortas y molletes', activa: true },
  { id: 4, nombre: 'Postres', descripcion: 'Pasteles, galletas y pan dulce', activa: true },
];

export default function Categorias() {
  const [categorias, setCategorias] = useState(CATEGORIAS_INICIALES);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  });

  const [modalMensaje, setModalMensaje] = useState({
    open: false,
    titulo: '',
    texto: '',
    esError: false
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ nombre: '', descripcion: '' });
    setOpenDialog(true);
  };

  const handleOpenEdit = (categoria) => {
    setEditingId(categoria.id);
    setFormData({
      nombre: categoria.nombre || '',
      descripcion: categoria.descripcion || ''
    });
    setOpenDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.nombre.trim()) {
      setModalMensaje({
        open: true,
        titulo: 'Atención',
        texto: 'El nombre de la categoría es obligatorio.',
        esError: true
      });
      return;
    }

    if (editingId) {
      // Editar existente (Simulación)
      setCategorias(prev => prev.map(cat => 
        cat.id === editingId ? { ...cat, ...formData } : cat
      ));
      setModalMensaje({
        open: true,
        titulo: 'Éxito',
        texto: 'La categoría se ha actualizado correctamente.',
        esError: false
      });
    } else {
      // Crear nueva (Simulación)
      const nuevaCategoria = {
        id: Date.now(),
        ...formData,
        activa: true
      };
      setCategorias(prev => [...prev, nuevaCategoria]);
      setModalMensaje({
        open: true,
        titulo: 'Éxito',
        texto: 'La categoría se ha creado exitosamente.',
        esError: false
      });
    }

    setOpenDialog(false);
  };

  const handleDelete = (id) => {
    setCategorias(prev => prev.filter(cat => cat.id !== id));
    setModalMensaje({
      open: true,
      titulo: 'Eliminado',
      texto: 'La categoría ha sido eliminada.',
      esError: false
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Encabezado */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" fontWeight="bold" color="text.primary">
          Gestión de Categorías
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleOpenCreate}
          sx={{ py: 1, px: 3, fontWeight: 'bold' }} 
        >
          Nueva Categoría
        </Button>
      </Box>

      {/* Tabla de Categorías */}
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><b>Nombre</b></TableCell>
              <TableCell><b>Descripción</b></TableCell>
              <TableCell align="center"><b>Estado</b></TableCell>
              <TableCell align="center" sx={{ width: '150px' }}><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categorias.map((categoria) => (
              <TableRow key={categoria.id} hover>
                <TableCell>{categoria.nombre}</TableCell>
                <TableCell>{categoria.descripcion}</TableCell>
                <TableCell align="center">
                  <Chip 
                    label={categoria.activa ? 'Activa' : 'Inactiva'} 
                    color={categoria.activa ? 'success' : 'default'}
                    size="small"
                    sx={{ minWidth: '80px', fontWeight: 'bold' }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                    <IconButton 
                      color="primary"
                      onClick={() => handleOpenEdit(categoria)}
                      title="Editar"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      color="error"
                      onClick={() => handleDelete(categoria.id)}
                      title="Eliminar"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            
            {categorias.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No hay categorías registradas.
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
          {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} mt={2}>
            <TextField
              label="Nombre de la Categoría"
              fullWidth
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
            <TextField
              label="Descripción"
              fullWidth
              multiline
              rows={3}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
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