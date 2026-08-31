import { createContext, useState, useEffect } from 'react';
// Ajusta esta ruta dependiendo de dónde esté tu configuración de axios (ej. '../services/api' o '../api/api')
import api from '../api/axiosClient'; // Asegúrate de que esta ruta sea correcta según tu estructura de proyecto

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
        setLoading(false);
    }, []);

    const login = async (identificador, password) => {
        const response = await api.post('/auth/login', { identificador, password });
        const userData = response.data; 
        
        userData.vistasPermitidas = userData.vistas || [];
        userData.passwordTemporal = userData.passwordTemporal || false;

        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const actualizarVistas = (vistas) => {
        setUser((actual) => {
            if (!actual) return actual;
            const actualizado = { ...actual, vistasPermitidas: vistas ?? [] };
            localStorage.setItem('user', JSON.stringify(actualizado));
            return actualizado;
        });
    };

    const marcarPasswordCambiada = () => {
        if (user) {
            const usuarioActualizado = { ...user, passwordTemporal: false };
            localStorage.setItem('user', JSON.stringify(usuarioActualizado));
            setUser(usuarioActualizado);
        }
    };

    const logout = () => {
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, marcarPasswordCambiada, actualizarVistas }}>
            {children}
        </AuthContext.Provider>
    );
};