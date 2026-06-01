import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.hostname.endsWith('.azurestaticapps.net')
    ? 'https://friendbook-25r0.onrender.com/api'
    : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('friendbook_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
