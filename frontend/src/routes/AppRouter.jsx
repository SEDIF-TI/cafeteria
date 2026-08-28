import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';

import { AuthContext } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import LoginPage from '../pages/LoginPage';

// Componente guardián para proteger las rutas privadas
const RutaProtegida = ({ children }) => {
    const { user, loading } = useContext(AuthContext);

    // Mientras verifica localStorage, no mostramos nada para evitar parpadeos
    if (loading) return null; 
    
    // Si no hay sesión, al login
    if (!user) return <Navigate to="/login" replace />;
    
    // Si la contraseña es temporal, forzamos el cambio antes de dejarle ver el sistema
    if (user.passwordTemporal) return <Navigate to="/cambiar-password" replace />;

    return <MainLayout>{children}</MainLayout>;
};

export default function AppRouter() {
    return (
        <Routes>
            {/* Rutas Públicas */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Ruta semi-privada (requiere sesión, pero no layout) */}
            <Route path="/cambiar-password" element={<div>Vista de cambio de contraseña (pendiente)</div>} />

            {/* Rutas Privadas envueltas en el Layout */}
            <Route
                path="/*"
                element={
                    <RutaProtegida>
                        <Routes>
                            {/* Aquí irán las vistas de tu sistema */}
                            <Route path="/" element={<h2>Tablero de Tickets (Próximamente)</h2>} />
                            <Route path="/perfil" element={<h2>Mi Perfil</h2>} />
                        </Routes>
                    </RutaProtegida>
                }
            />
        </Routes>
    );
}