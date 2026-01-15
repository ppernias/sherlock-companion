import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth
export const verifyPin = (pin) => api.post('/auth/pin', { pin });
export const adminLogin = (email, password) => api.post('/auth/login', { email, password });
export const verifyToken = () => api.get('/auth/verify');

// Characters
export const getCharacters = (params) => api.get('/characters', { params });
export const getCharacter = (id) => api.get(`/characters/${id}`);
export const createCharacter = (data) => api.post('/characters', data);
export const updateCharacter = (id, data) => api.put(`/characters/${id}`, data);
export const deleteCharacter = (id) => api.delete(`/characters/${id}`);

// Cases
export const getCases = () => api.get('/cases');
export const getCaseCharacters = (caso) => api.get(`/cases/${caso}/characters`);

// Import/Export
export const importCSV = (formData) => api.post('/import', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const exportAll = () => api.get('/export', { responseType: 'blob' });
export const exportCase = (caso) => api.get(`/export/${caso}`, { responseType: 'blob' });

// Upload
export const uploadImage = (formData) => api.post('/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const deleteImage = (filename) => api.delete(`/upload/${filename}`);

// Settings
export const getPin = () => api.get('/settings/pin');
export const updatePin = (pin) => api.put('/settings/pin', { pin });
export const changePassword = (currentPassword, newPassword) =>
  api.put('/settings/password', { currentPassword, newPassword });
export const getStats = () => api.get('/settings/stats');

// Admin management
export const getAdmins = () => api.get('/settings/admins');
export const createAdmin = (email, password) => api.post('/settings/admins', { email, password });
export const deleteAdmin = (id) => api.delete(`/settings/admins/${id}`);

// OpenAI
export const generatePrompt = (descripcion, currentPrompt) =>
  api.post('/openai/generate-prompt', { descripcion, currentPrompt });

export const generateImage = (prompt) =>
  api.post('/openai/generate-image', { prompt });

export default api;
