import { createContext, useState, useEffect } from 'react';
import api from '../services/api'; // Ajusta la ruta si tu api.js está en otro lado

// 1. Exportación obligatoria del contexto
export const AuthContext = createContext();

// 2. Exportación del Provider
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    // Cargar sesión guardada al iniciar
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const login = async (identificador, password) => {
        // 1. Restauramos el nombre del campo a "identificador" tal como lo exige el LoginRequest de Java
        const response = await api.post('/api/v1/auth/login', { 
            identificador: identificador, 
            password: password 
        });
        
        // 2. Extraemos la información. 
        // Como tu AuthController devuelve un ApiResponse.ok(respuesta, ...), los datos vienen dentro de "data"
        const userData = response.data.data ? response.data.data : response.data; 
        
        userData.vistasPermitidas = userData.vistas || [];
        userData.passwordTemporal = userData.passwordTemporal || false;

        // 3. Guardamos la sesión
        localStorage.setItem('user', JSON.stringify(userData));
        if (userData.token) {
            localStorage.setItem('token', userData.token);
        }

        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
    };

    // 🚨 ESTA ES LA CLAVE PARA EVITAR LA PANTALLA BLANCA 🚨
    // Debes retornar el Provider y dentro de él, a los children
    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};