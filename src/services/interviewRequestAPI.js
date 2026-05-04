// src/services/interviewRequestAPI.js
import api from './api';

export const interviewRequestAPI = {
  // Create interview request (auto-accepted)
  createRequest: async (requestData) => {
    const response = await api.post('/interview-requests', requestData);
    return response.data;
  },

  // Get interviewer's all interviews
  getMyInterviews: async () => {
    const response = await api.get('/interview-requests/my-interviews');
    return response.data;
  },

  // Get upcoming interviews for interviewer
  getUpcomingInterviews: async (params = null) => {
    const query = new URLSearchParams();
    if (params?.size !== undefined) query.append('size', params.size);
    const queryString = query.toString();
    const response = await api.get(queryString ? `/interview-requests/upcoming?${queryString}` : '/interview-requests/upcoming');
    return response.data;
  },

  // Get HR's created requests
  getHRRequests: async () => {
    const response = await api.get('/interview-requests/hr-requests');
    return response.data;
  },

  // Cancel interview request (HR only)
  cancelRequest: async (requestId) => {
    const response = await api.delete(`/interview-requests/${requestId}/cancel`);
    return response.data;
  },

  // Get statistics
  getStats: async () => {
    const response = await api.get('/interview-requests/stats');
    return response.data;
  },
};

export default interviewRequestAPI;