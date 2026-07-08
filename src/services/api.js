import axios from 'axios';
import { env } from '@/config/env';

const API_BASE_URL = env.API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const selectedTimeZone =
      localStorage.getItem('preferredTimeZone') ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC';
    config.headers['X-Timezone'] = selectedTimeZone;
    // Let the browser set multipart boundary; axios must not send application/json.
    if (config.data instanceof FormData) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else {
        delete config.headers['Content-Type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.config?._skipAuthRedirect) {
      // Caller opted out of the global 401 logout/redirect (see _skipAuthRedirect on request config).
      return Promise.reject(error);
    }
    // Only expired/invalid sessions should force re-login. A 403 means the user
    // is authenticated but lacks permission — redirecting to login is misleading.
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthRequest = requestUrl.includes('/auth/login')
        || requestUrl.includes('/auth/register')
        || requestUrl.includes('/auth/google');
      const hadAuthHeader = Boolean(error.config?.headers?.Authorization);
      if (!isAuthRequest && hadAuthHeader) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    console.log('Login response:', response.data);
    return response.data;
  },
  googleLogin: async (token) => {
    const response = await api.post('/auth/google', { token });
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
  getAll: async (pagination = null, filters = null) => {
    const params = new URLSearchParams();
    if (pagination?.page !== undefined) params.append('page', pagination.page);
    if (pagination?.size !== undefined) params.append('size', pagination.size);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.role && filters.role !== 'ALL') params.append('role', filters.role);
    if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
    const queryString = params.toString();
    const response = await api.get(queryString ? `/admin/users?${queryString}` : '/admin/users');
    return response.data; // expects List<UserDto>
  },
  updateProfessionalDetails: async (id, professionalData) => {
    const response = await api.put(`/admin/users/${id}/professional-details`, professionalData);
    return response.data;
  },
  updateBasicInfo: async (id, basicInfo) => {
    const response = await api.put(`/admin/users/${id}/basic-info`, basicInfo);
    return response.data;
  },
  updateRole: async (id, role) => {
    const response = await api.patch(`/admin/users/${id}/role`, { role });
    return response.data;
  },
  updateRoles: async (id, roles) => {
    const response = await api.put(`/admin/users/${id}/roles`, { roles });
    console.log('Update roles response:', response.data);
    return response.data;
  },
  toggleStatus: async (id) => {
    const response = await api.patch(`/admin/users/${id}/status`);
    return response.data;
  },
  delete: async (id) => {
    await api.delete(`/admin/users/${id}`);
  },
};

export const userSettingsAPI = {
  updateSettings: async (timezone, preferredDateFormat, preferredTimeFormat) => {
    const response = await api.put('/profile/settings', {
      timezone,
      preferredDateFormat,
      preferredTimeFormat,
    });
    return response.data;
  },


  getSettings: async () => {
    const response = await api.get('/profile/settings');
    return response.data;
  }
};

export default api;