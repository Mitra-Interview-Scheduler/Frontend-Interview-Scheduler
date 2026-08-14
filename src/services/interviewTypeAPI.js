// src/services/interviewTypeAPI.js
import api from './api';

export const interviewTypeAPI = {
  /** All interview types (admin management). Pass activeOnly=true for scheduling dropdowns. */
  getAll: async (activeOnly = false) => {
    const response = await api.get('/interview-types', { params: { activeOnly } });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/interview-types', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/interview-types/${id}`, data);
    return response.data;
  },

  reactivate: async (id) => {
    const response = await api.patch(`/interview-types/${id}/reactivate`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/interview-types/${id}`);
    return response.data;
  },

  getDeletePreview: async (id) => {
    const response = await api.get(`/interview-types/${id}/delete-preview`);
    return response.data;
  },

  /** Resolve interviewer filters for a candidate + interview type. */
  resolveFilters: async (code, candidateId) => {
    const response = await api.get('/interview-types/resolve-filters', {
      params: { code, candidateId },
    });
    return response.data;
  },
};

export default interviewTypeAPI;
