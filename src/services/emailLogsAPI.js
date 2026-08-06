import api from './api';

// Same request shape as usersAPI — do not pass a custom config object that can
// interfere with axios header merging for cross-origin Bearer auth.
export const emailLogsAPI = {
  getAll: async ({ page = 0, size = 20, search, status } = {}) => {
    const params = {};
    params.page = page;
    params.size = size;
    if (search) params.search = search;
    if (status && status !== 'ALL') params.status = status;
    const response = await api.get('/admin/delivery-logs', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/admin/delivery-logs/${id}`);
    return response.data;
  },

  getMeta: async () => {
    const response = await api.get('/admin/delivery-logs/meta');
    return response.data;
  },
};
