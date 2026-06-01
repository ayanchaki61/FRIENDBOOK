import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhostxxx:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('friendbook_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
