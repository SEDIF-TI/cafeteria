import api from '../api/api'; // Asegúrate de que la ruta coincida con tu carpeta api

export const authService = {
    login: async (identificador, password) => {
        const response = await api.post('/v1/auth/login', { identificador, password });
        return response.data;
    }
};