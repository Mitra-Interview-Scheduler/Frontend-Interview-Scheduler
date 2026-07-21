import api from './api';

export const masterStepAPI = {
  getCandidateSteps: async () => {
    const response = await api.get('/masterSteps');
    return response.data;
  },
  /** All active steps including invisible ones — for admin mapping UIs. */
  getAllActiveSteps: async () => {
    const response = await api.get('/masterSteps/all');
    return response.data;
  },
  getClosingSteps: async () => {
    const response = await api.get('/masterSteps/closing');
    return response.data;
  },
};

export default masterStepAPI;
