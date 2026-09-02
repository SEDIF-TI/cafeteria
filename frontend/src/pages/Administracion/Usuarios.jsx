import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Switch,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    username: '',
    rol: 'CAJERO'
  });
  
  const [passwordCreada, setPasswordCreada] = useState(null);

  // Función auxiliar para obtener el token
  const getToken = () => localStorage.getItem('token'); // Asegúrate de que tu login guarda el token con esta clave

  const fetchUsuarios = async () => {
    try {
      const response = await fetch('/api/v1/usuarios', {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsuarios(data);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/v1/usuarios', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const nuevoUsuario = await response.json();
        setOpenDialog(false);
        setFormData({ nombre: '', username: '', rol: 'CAJERO' });
        
        setPasswordCreada({
          nombre: nuevoUsuario.nombre,
          password: nuevoUsuario.passwordTemporal
        });

        fetchUsuarios();
      } else {
        console.error('Error del servidor:', response.status);
      }
    } catch (error) {
      console.error('Error de red al crear usuario:', error);
    }
  };

  const handleToggleEstado = async (id, activoActual) => {
    try {
      const response = await fetch(`/api/v1/usuarios/${id}/estado`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(!activoActual)
      });
      if (response.ok) {
        fetchUsuarios();
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
          Gestión de Personal
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setPasswordCreada(null); setOpenDialog(true); }}
          sx={{ backgroundColor: '#691c32', '&:hover': { backgroundColor: '#501525' } }}
        >
          Nuevo Usuario
        </Button>
      </Box>

      {passwordCreada && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setPasswordCreada(null)}>
          ¡Usuario <strong>{passwordCreada.nombre}</strong> creado exitosamente! Su contraseña temporal es: <strong>{passwordCreada.password}</strong> (Cópiala ahora, no se volverá a mostrar).
        </Alert>
      )}

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Usuario</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Rol</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.nombre}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell>
                  <Chip label={u.rol} size="small" color={u.rol === 'ADMIN' ? 'error' : 'primary'} />
                </TableCell>
                <TableCell>
                  <Chip label={u.activo ? 'Activo' : 'Inactivo'} size="small" color={u.activo ? 'success' : 'default'} />
                </TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <Switch
                    checked={u.activo}
                    onChange={() => handleToggleEstado(u.id, u.activo)}
                    color="success"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Registrar Nuevo Personal</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Nombre Completo"
            fullWidth
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          />
          <TextField
            label="Nombre de Usuario"
            fullWidth
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
          <TextField
            select
            label="Rol"
            fullWidth
            value={formData.rol}
            onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
          >
            <MenuItem value="ADMIN">Administrador</MenuItem>
            <MenuItem value="CAJERO">Cajero</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleCreate} variant="contained" sx={{ backgroundColor: '#691c32' }}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}