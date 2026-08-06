import api from './api';

const withAuthGuard = { _skipAuthRedirect: true };

// Use /admin/delivery-logs (not "email-logs") — many privacy/ad blockers
// strip or block requests whose URL contains "email", which surfaces as a 401.
export const emailLogsAPI = {
  getAll: async ({ page = 0, size = 20, search, status } = {}) => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('size', String(size));
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);
    const response = await api.get(`/admin/delivery-logs?${params.toString()}`, withAuthGuard);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/admin/delivery-logs/${id}`, withAuthGuard);
    return response.data;
  },

  getMeta: async () => {
    const response = await api.get('/admin/delivery-logs/meta', withAuthGuard);
    return response.data;
  },
};
