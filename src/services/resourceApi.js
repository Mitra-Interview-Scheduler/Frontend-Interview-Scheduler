import api from './api';

export const createResourceApi = (basePath) => ({
  getAll: async () => {
    const response = await api.get(basePath);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`${basePath}/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post(basePath, data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`${basePath}/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`${basePath}/${id}`);
  },
});
