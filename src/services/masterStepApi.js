import api from './api';

export const masterStepAPI = {
  getCandidateSteps: async () => {
    const response = await api.get('/masterSteps');
    return response.data;
  },
  getClosingSteps: async () => {
    const response = await api.get('/masterSteps/closing');
    return response.data;
  },
};

export default masterStepAPI;
