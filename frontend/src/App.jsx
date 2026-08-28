import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthContext, AuthProvider } from './context/AuthContext.jsx';
import theme from './theme/theme';

// Componentes y Vistas
import MainLayout from "./components/MainLayout.jsx";
import Login from "./pages/Login/Login.jsx";

// Componente auxiliar para proteger rutas privadas
function PrivateRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null; // O un indicador de carga mientras verifica la sesión
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Ruta pública del Login (es la primera en verse al iniciar) */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />

            {/* Rutas privadas protegidas con el menú lateral */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <MainLayout>
                  <div style={{ padding: '20px' }}>
                    <h1>Bienvenido al Sistema</h1>
                    <p>El menú lateral se construirá según los permisos de tu usuario.</p>
                  </div>
                </MainLayout>
              </PrivateRoute>
            } />

            {/* Redirección por defecto si la URL no existe */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}