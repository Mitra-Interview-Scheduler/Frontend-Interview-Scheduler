import axios from 'axios';
import { env } from '@/config/env';
import { formatLocalDateTime } from '@/lib/calendarUtils';
import {
  clearAccessToken,
  getAccessToken,
  getCsrfToken,
  setAccessToken,
  setCsrfToken,
} from '@/lib/authSession';

const API_BASE_URL = env.API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: { 'Content-Type': 'application/json' },
});

const isCsrfUrl = (url = '') => url.includes('/auth/csrf');
const isRefreshUrl = (url = '') => url.includes('/auth/refresh');
const isAuthSessionUrl = (url = '') =>
  url.includes('/auth/login')
  || url.includes('/auth/register')
  || url.includes('/auth/google')
  || url.includes('/auth/refresh')
  || url.includes('/auth/logout')
  || url.includes('/auth/csrf');

let csrfPromise = null;
let refreshPromise = null;

export const ensureCsrfToken = async () => {
  const existing = getCsrfToken();
  if (existing) return existing;
  if (!csrfPromise) {
    csrfPromise = api.get('/auth/csrf')
      .then((response) => {
        const token = response.data?.token;
        if (token) setCsrfToken(token);
        return getCsrfToken();
      })
      .finally(() => {
        csrfPromise = null;
      });
  }
  return csrfPromise;
};

const applyHeader = (config, name, value) => {
  if (typeof config.headers?.set === 'function') {
    config.headers.set(name, value);
  } else {
    config.headers = config.headers || {};
    config.headers[name] = value;
  }
};

api.interceptors.request.use(
  async (config) => {
    const requestUrl = config.url || '';
    if (!isCsrfUrl(requestUrl) && !getCsrfToken()) {
      await ensureCsrfToken();
    }

    const csrf = getCsrfToken();
    if (csrf) {
      applyHeader(config, 'X-XSRF-TOKEN', csrf);
    }

    const token = getAccessToken();
    if (token && !isAuthSessionUrl(requestUrl)) {
      applyHeader(config, 'Authorization', `Bearer ${token}`);
    }

    const selectedTimeZone =
      localStorage.getItem('preferredTimeZone') ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC';
    applyHeader(config, 'X-Timezone', selectedTimeZone);

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

const redirectToLogin = () => {
  clearAccessToken();
  localStorage.removeItem('user');
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
};

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = api.post('/auth/refresh')
      .then((response) => {
        const nextToken = response.data?.token;
        if (!nextToken) {
          throw new Error('Refresh did not return an access token');
        }
        setAccessToken(nextToken);
        return nextToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => {
    const token = response.data?.token;
    if (typeof token === 'string' && isAuthSessionUrl(response.config?.url || '')) {
      setAccessToken(token);
    }
    return response;
  },
  async (error) => {
    const original = error.config;
    if (!original || original._skipAuthRedirect) {
      return Promise.reject(error);
    }

    const requestUrl = original.url || '';
    const status = error.response?.status;

    if (status === 401 && !original._retry && !isAuthSessionUrl(requestUrl)) {
      original._retry = true;
      try {
        const nextToken = await refreshAccessToken();
        applyHeader(original, 'Authorization', `Bearer ${nextToken}`);
        return api(original);
      } catch (refreshError) {
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    if (status === 401 && isRefreshUrl(requestUrl)) {
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    await ensureCsrfToken();
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  googleLogin: async (token) => {
    await ensureCsrfToken();
    const response = await api.post('/auth/google', { token });
    return response.data;
  },
  register: async (userData) => {
    await ensureCsrfToken();
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  verify: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },
  refresh: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },
  logout: async () => {
    try {
      await ensureCsrfToken();
      await api.post('/auth/logout');
    } catch {
      // Cookie clear is best-effort; local session is always dropped.
    }
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
