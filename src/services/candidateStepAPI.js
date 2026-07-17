import api from './api';

export const candidateStepAPI = {
  getCandidateSteps: async () => {
    const response = await api.get('/candidate-steps');
    return response.data;
  },
};

export default candidateStepAPI;
