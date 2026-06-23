import api from './api';

export const candidatePipelineAPI = {
  getCandidatePipeline: async (candidateId) => {
    const response = await api.get(`/candidatePipeline/${candidateId}`);
    return response.data;
  },

  initializePipeline: async (candidateId) => {
    await api.post(`/candidatePipeline/${candidateId}`);
  },
};

export default candidatePipelineAPI;
