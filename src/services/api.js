import axios from 'axios';

const API_BASE_URL = process.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  verify: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },
};

// You'll need to add GET /api/admin/users and DELETE /api/admin/users/{id}
// and PATCH /api/admin/users/{id}/status to your Spring Boot AdminController
export const usersAPI = {
  getAll: async () => {
    const response = await api.get('/admin/users');
    return response.data; // expects List<UserDto>
  },
  toggleStatus: async (id) => {
    const response = await api.patch(`/admin/users/${id}/status`);
    return response.data;
  },
  delete: async (id) => {
    await api.delete(`/admin/users/${id}`);
  },
};

export default api;