import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1'
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    // Validar que el token exista y no sea la palabra "undefined" o "null"
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