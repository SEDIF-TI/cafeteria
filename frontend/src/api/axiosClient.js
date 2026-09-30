import axios from 'axios';

// Detecta automáticamente si estás en localhost o en la IP de red
const currentHost = window.location.hostname; // Retornará 'localhost' o '192.168.1.141'

const api = axios.create({
  baseURL: `http://${currentHost}:8080/api/v1`
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;