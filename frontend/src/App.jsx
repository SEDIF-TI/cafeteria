import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/MainLayout';
import Usuarios from './pages/Administracion/Usuarios'; 
import Login from './pages/Login/Login';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<Login />} />

          {/* Redirección automática al entrar a /dashboard */}
          <Route path="/dashboard" element={<Navigate to="/dashboard/usuarios" replace />} />

          {/* Ruta del módulo de usuarios */}
          <Route path="/dashboard/usuarios" element={
            <MainLayout>
              <Usuarios />
            </MainLayout>
          } />
          
          {/* Si la ruta no existe, redirige al login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;