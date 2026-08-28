import axios from 'axios';

// Configuración centralizada de Axios para las peticiones al backend
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080', // Ajusta el puerto de tu backend si es necesario
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para inyectar automáticamente el token en cada petición protegida
api.interceptors.request.use(
    (config) => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user?.token) {
                config.headers.Authorization = `Bearer ${user.token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;