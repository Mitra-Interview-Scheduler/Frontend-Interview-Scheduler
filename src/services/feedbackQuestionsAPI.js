import api from './api';

export const feedbackQuestionsAPI = {
  // List all forms
  getAll: async () => {
    const response = await api.get('/feedback/forms');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/feedback/forms/${id}`);
    return response.data;
  },

  // Create a new form (with questions)
  save: async (payload) => {
    const response = await api.post('/feedback/forms', payload);
    return response.data;
  },

  update: async (id, payload) => {
    const response = await api.put(`/feedback/forms/${id}`, payload);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/feedback/forms/${id}`);
  },
};

export default feedbackQuestionsAPI;