import api from './api';

export const candidatePipelineAPI = {
    getCandidatePipeline: async (candidateId) => {
        const response = await api.get(`/candidatePipeline/${candidateId}`);
        console.log('Pipeline data for candidate', candidateId, response.data);
        return response.data;
    },


    // Pipeline initilaization is done when a candidate is created, so we don't need to create a separate API call for it.




};