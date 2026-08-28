import { useState, useContext } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { AuthContext } from '../../context/AuthContext.jsx';
import logoPuebla from '../../assets/logo-puebla.png';

export default function Login() {
    const [identificador, setIdentificador] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setCargando(true);
        
        try {
            const userData = await login(identificador, password);
            if (userData.passwordTemporal) {
                navigate('/cambiar-password');
            } else {
                navigate('/dashboard'); // Redirige al menú principal tras autenticarse
            }
        } catch (err) {
            setError('Credenciales incorrectas o error de conexión al servidor.');
        } finally {
            setCargando(false);
        }
    };

    return (
        <Box 
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                padding: 2,
            }}
        >
            <Paper 
                elevation={3} 
                sx={{
                    padding: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    maxWidth: 400,
                    width: '100%',
                    borderRadius: 3,
                }}
            >
                <Box sx={{ marginBottom: 3, textAlign: 'center' }}>
                    <Box component="img" src={logoPuebla} alt="Logotipo" sx={{ maxHeight: 60, width: 'auto', objectFit: 'contain' }} />
                </Box>
                
                <Typography variant="h5" align="center" gutterBottom fontWeight="bold" color="primary">
                    Iniciar Sesión
                </Typography>
                
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                
                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    <TextField
                        fullWidth
                        label="Usuario o Correo"
                        variant="outlined"
                        margin="normal"
                        value={identificador}
                        onChange={(e) => setIdentificador(e.target.value)}
                        required
                        autoFocus
                    />
                    <TextField
                        fullWidth
                        label="Contraseña"
                        type="password"
                        variant="outlined"
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        color="primary"
                        sx={{ mt: 3, mb: 2, paddingY: 1.2, fontWeight: 'bold' }}
                        disabled={cargando}
                    >
                        {cargando ? 'Verificando...' : 'Entrar'}
                    </Button>
                </form>
            </Paper>
        </Box>
    );
}