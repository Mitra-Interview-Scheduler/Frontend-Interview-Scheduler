import api from './api';

export const hrAvailabilityAPI = {
  /**
   * Get all available interviewer slots, with optional filters.
   * If filters are provided, uses POST /hr/availability/filter
   * Otherwise falls back to GET /hr/availability
   * @param {Object|null} filters - AvailabilityFilterDto fields (optional)
   * @returns {Promise<Array>} List of available slots
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
   * Supports sub-slot booking (backend handles slot splitting).
   * @param {Object} data - CreateInterviewRequestDto
   * @returns {Promise<Object>} Created interview request
   */
  createInterviewRequest: async (data) => {
    const response = await api.post('/hr/interviews', data);
    return response.data;
  },

  /**
   * Cancel a single-interviewer interview request.
   * Backend restores the slot to AVAILABLE status.
   * @param {string|number} requestId 
   */
  cancelInterviewRequest: async (requestId) => {
    await api.delete(`/hr/interviews/${requestId}`);
    // no content expected → no return
  },

  /**
   * Get all interview requests created by the current HR user.
   * @returns {Promise<Array>} List of interview requests
   */
  getHRRequests: async () => {
    const response = await api.get('/hr/interviews/my-requests');
    return response.data;
  },

  /**
   * Create a panel interview (one candidate, multiple interviewers, same time slot).
   * @param {Object} data - CreatePanelInterviewDto
   * @returns {Promise<Object>} Created panel interview
   */
  createPanelInterview: async (data) => {
    const response = await api.post('/hr/panels', data);
    return response.data;
  },

  /**
   * Cancel a panel interview.
   * Cancels all associated single requests and restores slots.
   * @param {string|number} panelId 
   */
  cancelPanelInterview: async (panelId) => {
    await api.delete(`/hr/panels/${panelId}`);
    // no content expected
  },

  /**
   * Get all panel interviews created by the current HR user.
   * @returns {Promise<Array>} List of panel interviews
   */
  getMyPanels: async () => {
    const response = await api.get('/hr/panels/my-panels');
    return response.data;
  },

  /**
   * Get all panel interviews for a specific candidate.
   * @param {string|number} candidateId 
   * @returns {Promise<Array>} List of panels for this candidate
   */
  getPanelsByCandidateId: async (candidateId) => {
    const response = await api.get(`/hr/panels/candidate/${candidateId}`);
    return response.data;
  },

  /**
   * Get all interview requests (both single and panel-derived) for a candidate.
   * @param {string|number} candidateId 
   * @returns {Promise<Array>} List of interviews for this candidate
   */
  getInterviewsForCandidate: async (candidateId) => {
    const response = await api.get(`/hr/interviews/candidate/${candidateId}`);
    return response.data;
  },
};

export default hrAvailabilityAPI;