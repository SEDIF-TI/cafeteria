import React, { useState, useEffect } from "react";
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
  MenuItem,
  Chip,
  Stack
} from '@mui/material';
import api from '../../api/axiosClient'; // Ajusta la ruta si es necesario

import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    username: '',
    rol: 'ADMIN'
  });

  const [passwordCreada, setPasswordCreada] = useState(null);
  
  const [modalMensaje, setModalMensaje] = useState({
    open: false,
    titulo: '',
    texto: '',
    esError: false
  });

  const fetchUsuarios = async () => {
    try {
      const response = await api.get('/usuarios');
      setUsuarios(response.data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleOpenCreate = () => {
    setEditingUserId(null);
    setFormData({ nombre: '', username: '', rol: 'ADMIN' });
    setOpenDialog(true);
  };

  const handleOpenEdit = (usuario) => {
    setEditingUserId(usuario.id);
    setFormData({
      nombre: usuario.nombre || '',
      username: usuario.username || '',
      rol: usuario.rol || 'ADMIN'
    });
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      let response;
      let mensajeExito = '';

      if (editingUserId) {
        const payload = { ...formData, id: editingUserId };
        response = await api.put(`/usuarios/${editingUserId}`, payload);
        mensajeExito = 'El usuario se ha actualizado correctamente.';
      } else {
        response = await api.post('/usuarios', formData);
        mensajeExito = 'El usuario se ha creado exitosamente.';
      }
      
      const data = response.data.data || response.data;
      setOpenDialog(false);
      
      if (!editingUserId && data && data.passwordTemporal) {
        setPasswordCreada({
          nombre: data.nombre,
          password: data.passwordTemporal
        });
      } else {
        setModalMensaje({
          open: true,
          titulo: 'Éxito',
          texto: mensajeExito,
          esError: false
        });
      }

      fetchUsuarios();
    } catch (error) {
      console.error('Error del servidor al guardar usuario:', error);
      const errorMensaje = error.response?.data?.message || 
                           error.response?.data?.error || 
                           'Ocurrió un error al procesar la solicitud.';

      setModalMensaje({
        open: true,
        titulo: 'Atención',
        texto: errorMensaje,
        esError: true
      });
    }
  };

  // Función para cambiar el estado del usuario
  const handleToggleEstado = async (usuario) => {
    try {
      const nuevoEstado = !usuario.activo;
      await api.put(`/usuarios/${usuario.id}/estado`, nuevoEstado, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      setModalMensaje({
        open: true,
        titulo: 'Estado Actualizado',
        texto: `El usuario ahora se encuentra ${nuevoEstado ? 'Activo' : 'Inactivo'}.`,
        esError: false
      });
      
      fetchUsuarios();
    } catch (error) {
      console.error('Error al cambiar el estado:', error);
      setModalMensaje({
        open: true,
        titulo: 'Error',
        texto: 'No se pudo actualizar el estado del usuario.',
        esError: true
      });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Encabezado: Título a la izquierda, Botón a la derecha */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Button 
          variant="contained" 
          color="primary"
          align="left"
          onClick={handleOpenCreate}
          sx={{ py: 1, px: 3, fontWeight: 'bold' }} 
        >
          Nuevo Usuario
        </Button>
      </Box>

      <br />

      {/* Tabla */}
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><b>Nombre</b></TableCell>
              <TableCell><b>Usuario</b></TableCell>
              <TableCell><b>Rol</b></TableCell>
              <TableCell align="center"><b>Estado</b></TableCell>
              <TableCell align="center" sx={{ width: '150px' }}><b>Acciones</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((usuario) => (
              <TableRow key={usuario.id} hover>
                <TableCell>{usuario.nombre}</TableCell>
                <TableCell>{usuario.username}</TableCell>
                <TableCell>{usuario.rol}</TableCell>
                <TableCell align="center">
                  <Chip 
                    label={usuario.activo ? 'Activo' : 'Inactivo'} 
                    color={usuario.activo ? 'success' : 'default'}
                    variant={usuario.activo ? 'filled' : 'outlined'}
                    size="small"
                    sx={{ minWidth: '80px', fontWeight: 'bold' }}
                  />
                </TableCell>
                <TableCell align="center">
                  {/* Contenedor Stack para alinear y centrar perfectamente los iconos */}
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                    <IconButton 
                      color="primary"
                      onClick={() => handleOpenEdit(usuario)}
                      title="Editar"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      color={usuario.activo ? 'error' : 'success'}
                      onClick={() => handleToggleEstado(usuario)}
                      title={usuario.activo ? 'Desactivar' : 'Activar'}
                    >
                      {usuario.activo ? <PersonOffIcon /> : <PersonAddIcon />}
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            
            {usuarios.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No hay usuarios registrados.
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
          {editingUserId ? 'Editar Usuario' : 'Nuevo Usuario'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} mt={2}>
            <TextField
              label="Nombre Completo"
              fullWidth
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
            <TextField
              label="Nombre de Usuario (Login)"
              fullWidth
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
            <TextField
              select
              label="Rol del Sistema"
              fullWidth
              value={formData.rol}
              onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
            >
              <MenuItem value="ADMIN">ADMIN</MenuItem>
              <MenuItem value="CAJERO">CAJERO</MenuItem>
              <MenuItem value="OPERADOR">OPERADOR</MenuItem>
            </TextField>
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

      {/* Modal General para Confirmaciones y Errores */}
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

      {/* Modal específico para la contraseña temporal en la creación */}
      {passwordCreada && (
        <Dialog open={true} onClose={() => setPasswordCreada(null)}>
          <DialogTitle sx={{ color: 'success.main', fontWeight: 'bold' }}>
            Usuario Creado Exitosamente
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: 'text.primary', mt: 1 }}>
              El usuario <b>{passwordCreada.nombre}</b> se ha creado correctamente.<br /><br />
              Su contraseña temporal es: 
              <Typography variant="h6" component="span" sx={{ display: 'block', my: 2, textAlign: 'center', p: 1, backgroundColor: '#f0f0f0', borderRadius: 1, letterSpacing: 2 }}>
                {passwordCreada.password}
              </Typography>
              <i>Asegúrese de copiarla y compartirla con el usuario, ya que no se volverá a mostrar por motivos de seguridad.</i>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordCreada(null)} variant="contained" color="primary">
              Entendido
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
}