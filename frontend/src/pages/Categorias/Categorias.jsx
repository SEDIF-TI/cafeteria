import React, { useState, useEffect } from 'react';
import api from '../../api/axiosClient';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el Modal de Agregar
  const [openAddModal, setOpenAddModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Estados para la Alerta de Confirmación (Borrado Lógico)
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);

  const fetchCategorias = async () => {
    try {
      const response = await api.get('/api/v1/categorias');
      setCategorias(response.data);
    } catch (error) {
      console.error('Error al cargar las categorías:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  const handleCrearCategoria = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/v1/categorias', { nombre, descripcion });
      setNombre('');
      setDescripcion('');
      setOpenAddModal(false);
      fetchCategorias();
    } catch (error) {
      console.error('Error al crear categoría:', error);
      alert(error.response?.data?.message || 'Error al guardar la categoría');
    }
  };

  const handleOpenConfirm = (categoria) => {
    setCategoriaSeleccionada(categoria);
    setOpenConfirmDialog(true);
  };

  const handleToggleEstado = async () => {
    if (!categoriaSeleccionada) return;
    try {
      await api.patch(`/api/v1/categorias/${categoriaSeleccionada.id}/estado`);
      setOpenConfirmDialog(false);
      setCategoriaSeleccionada(null);
      fetchCategorias();
    } catch (error) {
      console.error('Error al cambiar el estado:', error);
    }
  };

  if (loading) return <Typography sx={{ p: 3 }}>Cargando categorías...</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1e293b' }}>
          Gestión de Categorías
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenAddModal(true)}
          sx={{
            backgroundColor: '#691c32',
            '&:hover': { backgroundColor: '#501525' },
            textTransform: 'none',
            borderRadius: '8px',
            fontWeight: 600
          }}
        >
          Nueva Categoría
        </Button>
      </Box>

      <Paper sx={{ p: 2, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {categorias.length === 0 ? (
          <Typography sx={{ py: 3, textAlign: 'center', color: '#64748b' }}>
            No hay categorías registradas en la base de datos.
          </Typography>
        ) : (
          <List>
            {categorias.map((cat) => (
              <ListItem key={cat.id} divider sx={{ py: 2 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '1rem', color: '#1e293b' }}>
                        {cat.nombre}
                      </Typography>
                      <Chip
                        label={cat.activo ? 'Activa' : 'Inactiva'}
                        size="small"
                        color={cat.activo ? 'success' : 'default'}
                        sx={{ fontWeight: 500, height: '22px' }}
                      />
                    </Box>
                  }
                  secondary={cat.descripcion || 'Sin descripción'}
                  secondaryTypographyProps={{ sx: { color: '#64748b', mt: 0.5 } }}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="cambiar estado"
                    onClick={() => handleOpenConfirm(cat)}
                    color={cat.activo ? 'error' : 'success'}
                    title={cat.activo ? 'Desactivar categoría' : 'Activar categoría'}
                  >
                    {cat.activo ? <DeleteIcon /> : <CheckCircleIcon />}
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Modal para Crear Categoría */}
      <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCrearCategoria}>
          <DialogTitle sx={{ fontWeight: 600, color: '#691c32' }}>Registrar Nueva Categoría</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nombre de la categoría"
              type="text"
              fullWidth
              required
              variant="outlined"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              margin="dense"
              label="Descripción"
              type="text"
              fullWidth
              multiline
              rows={2}
              variant="outlined"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setOpenAddModal(false)} sx={{ color: '#64748b', textTransform: 'none' }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{ backgroundColor: '#691c32', '&:hover': { backgroundColor: '#501525' }, textTransform: 'none' }}
            >
              Guardar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Diálogo de Alerta para Confirmar Cambio de Estado / Borrado Lógico */}
      <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
        <DialogTitle sx={{ fontWeight: 600, color: '#1e2932' }}>
          {categoriaSeleccionada?.activo ? '¿Desactivar categoría?' : '¿Activar categoría?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#475569' }}>
            {categoriaSeleccionada?.activo
              ? `Estás a punto de desactivar la categoría "${categoriaSeleccionada?.nombre}". Esto evitará que se use en nuevos registros sin afectar el historial en cascada.`
              : `Estás a punto de volver a activar la categoría "${categoriaSeleccionada?.nombre}".`}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenConfirmDialog(false)} sx={{ color: '#64748b', textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleToggleEstado}
            variant="contained"
            color={categoriaSeleccionada?.activo ? 'error' : 'success'}
            sx={{ textTransform: 'none' }}
          >
            {categoriaSeleccionada?.activo ? 'Sí, desactivar' : 'Sí, activar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}