import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
  Alert
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

import logoPuebla from '../../assets/logo-puebla.png';

const Login = () => {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event) => event.preventDefault();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(identificador, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciales incorrectas o error de conexión al servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          padding: { xs: 3, md: 5 },
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
          textAlign: 'center',
        }}
      >
        <Box sx={{ mb: 3 }}>
          <img
            src={logoPuebla}
            alt="Gobierno del Estado"
            style={{ maxHeight: '120px', objectFit: 'contain' }}
          />
        </Box>

        <Typography
          variant="h5"
          component="h1"
          sx={{ fontWeight: 600, color: '#0f172a', mb: 1, fontFamily: 'sans-serif' }}
        >
          Sistema de Cafetería
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
          Ingresa tus credenciales para continuar
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, textAlign: 'left', borderRadius: '8px' }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Correo electrónico o usuario *"
            variant="outlined"
            margin="normal"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            disabled={isLoading}
            sx={{ 
              mb: 2, 
              '& .MuiOutlinedInput-root': { borderRadius: '8px' } 
            }}
          />

          <TextField
            fullWidth
            label="Contraseña *"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            sx={{ 
              mb: 3, 
              '& .MuiOutlinedInput-root': { borderRadius: '8px' } 
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                      sx={{ color: '#64748b' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{
              backgroundColor: '#691c32',
              color: 'white',
              padding: '12px',
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '8px',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#521526',
                boxShadow: 'none',
              },
            }}
          >
            {isLoading ? 'Iniciando...' : 'Iniciar sesión'}
          </Button>
        </form>
      </Paper>

      <Typography variant="caption" sx={{ mt: 3, color: '#94a3b8' }}>
        SEDIF · Sistema de Cafetería
      </Typography>
    </Box>
  );
};

export default Login;