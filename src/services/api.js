import axios from 'axios';
import { env } from '@/config/env';
import { formatLocalDateTime } from '@/lib/calendarUtils';

const API_BASE_URL = env.API_BASE_URL;
let accessToken = null;
let refreshPromise = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const clearAccessToken = () => {
  accessToken = null;
};

export const getAccessToken = () => accessToken;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = refreshClient.post('/auth/refresh')
      .then((response) => {
        setAccessToken(response.data?.token || null);
        return response.data;
      })
      .catch((error) => {
        clearAccessToken();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      if (typeof config.headers?.set === 'function') {
        config.headers.set('Authorization', `Bearer ${accessToken}`);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    const selectedTimeZone =
      localStorage.getItem('preferredTimeZone') ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC';
    if (typeof config.headers?.set === 'function') {
      config.headers.set('X-Timezone', selectedTimeZone);
    } else {
      config.headers = config.headers || {};
      config.headers['X-Timezone'] = selectedTimeZone;
    }
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
  async (error) => {
    const originalRequest = error.config || {};
    const requestUrl = originalRequest.url || '';

    if (error.response?.status === 401
      && !originalRequest._retry
      && !requestUrl.includes('/auth/refresh')
      && !requestUrl.includes('/auth/login')
      && !requestUrl.includes('/auth/register')
      && !requestUrl.includes('/auth/google')) {
      originalRequest._retry = true;
      try {
        await refreshAccessToken();
        return api(originalRequest);
      } catch (refreshError) {
        clearAccessToken();
      }
    }

    if (error.config?._skipAuthRedirect) {
      // Caller opted out of the global 401 logout/redirect (see _skipAuthRedirect on request config).
      return Promise.reject(error);
    }
    // Only expired/invalid sessions should force re-login. A 403 means the user
    // is authenticated but lacks permission — redirecting to login is misleading.
    if (error.response?.status === 401) {
      const isAuthRequest = requestUrl.includes('/auth/login')
        || requestUrl.includes('/auth/register')
        || requestUrl.includes('/auth/google')
        || requestUrl.includes('/auth/refresh');
      const isCalendarIntegrationRequest = requestUrl.includes('/integrations/google-calendar');
      // Delivery logs is admin-only; a 401 here must not wipe the whole session
      // (production CORS/auth edge cases were logging users out on navigation).
      const isEmailLogsRequest = requestUrl.includes('/admin/delivery-logs')
        || requestUrl.includes('/admin/email-logs');
      const hadAuthHeader = Boolean(
        error.config?.headers?.get?.('Authorization')
        || error.config?.headers?.Authorization
        || error.config?.headers?.authorization
      );
      if (!isAuthRequest && !isCalendarIntegrationRequest && !isEmailLogsRequest && hadAuthHeader) {
        clearAccessToken();
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
    setAccessToken(response.data?.token || null);
    return response.data;
  },
  googleLogin: async (token) => {
    const response = await api.post('/auth/google', { token });
    setAccessToken(response.data?.token || null);
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    setAccessToken(response.data?.token || null);
    return response.data;
  },
  refresh: async () => refreshAccessToken(),
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAccessToken();
    }
  },
  verify: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },
};

// You'll need to add GET /api/admin/users and DELETE /api/admin/users/{id} (soft-deactivate)
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
    // Soft-deactivates the user (backend sets isActive=false)
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },
};

export const userSettingsAPI = {
  updateSettings: async (timezone, preferredDateFormat, preferredTimeFormat, emailNotificationsEnabled) => {
    const response = await api.put('/profile/settings', {
      timezone,
      preferredDateFormat,
      preferredTimeFormat,
      emailNotificationsEnabled,
    });
    return response.data;
  },


  getSettings: async () => {
    const response = await api.get('/profile/settings');
    return response.data;
  }
};

export const googleCalendarAPI = {
  getStatus: async () => {
    const response = await api.get('/integrations/google-calendar/status');
    return response.data;
  },
  connect: async (returnTo) => {
    const response = await api.get('/integrations/google-calendar/connect', {
      params: returnTo ? { returnTo } : undefined,
    });
    return response.data;
  },
  disconnect: async () => {
    await api.delete('/integrations/google-calendar');
  },
  syncAvailability: async () => {
    const response = await api.post('/integrations/google-calendar/sync-availability');
    return response.data;
  },
  getExternalEvents: async (start, end) => {
    const response = await api.get('/integrations/google-calendar/external-events', {
      params: {
        start: formatLocalDateTime(start),
        end: formatLocalDateTime(end),
      },
    });
    return response.data;
  },
  listCalendars: async () => {
    const response = await api.get('/integrations/google-calendar/calendars');
    return response.data;
  },
  saveCalendarSelection: async (calendarIds) => {
    const response = await api.put('/integrations/google-calendar/calendars/selection', {
      calendarIds,
    });
    return response.data;
  },
};

export default api;