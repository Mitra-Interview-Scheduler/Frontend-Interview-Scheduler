// src/services/hrAvailabilityAPI.js
import api from './api';

export const hrAvailabilityAPI = {
  /**
   * Get all available interviewer slots, with optional filters.
   */
  getAllAvailability: async (filters = null) => {
    if (filters && Object.values(filters).some(v => v !== null && v !== undefined)) {
      const response = await api.post('/hr/availability/filter', filters);
      return response.data;
    }
    const response = await api.get('/hr/availability');
    return response.data;
  },

  /**
   * Schedule a single-interviewer interview.
   */
  createInterviewRequest: async (data) => {
    const response = await api.post('/hr/interviews', data);
    return response.data;
  },

  /**
   * Cancel a single-interviewer interview request.
   * Backend: DELETE /api/hr/interviews/{requestId}
   * This restores the slot to AVAILABLE and notifies the interviewer.
   */
  cancelInterviewRequest: async (requestId) => {
    await api.delete(`/hr/interviews/${requestId}`);
  },

  /**
   * Get all interview requests created by the current HR user.
   */
  getHRRequests: async () => {
    const response = await api.get('/hr/interviews/my-requests');
    return response.data;
  },

  /**
   * Create a panel interview.
   */
  createPanelInterview: async (data) => {
    const response = await api.post('/hr/panels', data);
    return response.data;
  },

  /**
   * Cancel a panel interview.
   * Backend: DELETE /api/hr/panels/{panelId}
   * Cancels all associated requests and restores all slots.
   */
  cancelPanelInterview: async (panelId) => {
    await api.delete(`/hr/panels/${panelId}`);
  },

  /**
   * Get all panel interviews created by the current HR user.
   */
  getMyPanels: async () => {
    const response = await api.get('/hr/panels/my-panels');
    return response.data;
  },

  /**
   * Get all panel interviews for a specific candidate.
   */
  getPanelsByCandidateId: async (candidateId) => {
    const response = await api.get(`/hr/panels/candidate/${candidateId}`);
    return response.data;
  },

  /**
   * Get all interview requests for a candidate.
   */
  getInterviewsForCandidate: async (candidateId) => {
    const response = await api.get(`/hr/interviews/candidate/${candidateId}`);
    return response.data;
  },
};

export default hrAvailabilityAPI;