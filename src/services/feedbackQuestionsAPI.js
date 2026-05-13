import api from './api';

export const feedbackQuestionsAPI = {
  getAll: async () => {
    const response = await api.get('/admin/feedback-questions');
    return response.data;
  },

  save: async (payload) => {
    const response = await api.post('/admin/feedback-questions', payload);
    return response.data;
  },

  update: async (id, payload) => {
    const response = await api.put(`/admin/feedback-questions/${id}`, payload);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/admin/feedback-questions/${id}`);
  },
};

export default feedbackQuestionsAPI;