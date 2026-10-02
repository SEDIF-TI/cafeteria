import { createContext, useState, useEffect } from 'react';
import api from '../api/axiosClient'; // Ajustado a axiosClient

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const login = async (identificador, password) => {
        const response = await api.post('/auth/login', { 
            identificador: identificador, 
            password: password 
        });
        
        const userData = response.data.data ? response.data.data : response.data; 
        
        // Extracción flexible del token por si viene con distinto nombre
        const token = userData.token || userData.jwt || userData.accessToken || response.data.token;

        if (!token) {
            console.error("El backend no devolvió un token JWT válido:", response.data);
            throw new Error("No se recibió el token de autenticación.");
        }

        userData.vistasPermitidas = userData.vistas || [];
        userData.passwordTemporal = userData.passwordTemporal || false;

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);

        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};