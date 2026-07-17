// src/services/hrAvailabilityAPI.js
import api from './api';
import { withQuery } from './queryParams';

export const hrAvailabilityAPI = {
  /**
   * Get all available interviewer slots, with optional filters.
   */
  getAllAvailability: async (filters = null) => {
    if (filters && Object.values(filters).some(v => v !== null && v !== undefined)) {
      const response = await api.post('/hr/availability/filter', filters);
      const data = response.data;
      // Support paged response: { items, total, page, size }
      if (data && data.items) return data.items;
      return data;
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
   * Check the selected interviewer(s)' Google Calendars for events that overlap
   * the proposed interview window. Returns an array of
   * { interviewerId, interviewerName, conflicts: [{ title, startDateTime, endDateTime, calendarName, allDay }] }.
   * An empty array means no conflicts. Advisory only — HR may still schedule.
   */
  checkConflicts: async ({ interviewerIds, startDateTime, endDateTime }) => {
    const response = await api.post('/hr/interviews/conflict-check', {
      interviewerIds,
      startDateTime,
      endDateTime,
    });
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
  getHRRequests: async (filters = null, params = null) => {
    // filters: { departmentIds: [...], minTierId }
    const query = {
      size: params?.size,
      departmentId: filters?.departmentIds?.length > 0 ? filters.departmentIds[0] : null,
      minTierId: filters?.minTierId ?? null,
      exactTierId: filters?.exactTierId ?? null,
    };
    const response = await api.get(withQuery('/hr/interviews/my-requests', query));
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
  getMyPanels: async (filters = null, params = null) => {
    const query = {
      size: params?.size,
      departmentId: filters?.departmentIds?.length > 0 ? filters.departmentIds[0] : null,
      minTierId: filters?.minTierId ?? null,
      exactTierId: filters?.exactTierId ?? null,
    };
    const response = await api.get(withQuery('/hr/panels/my-panels', query));
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

  /**
   * Match interviewers to a candidate by technologies and domains (profile-based).
   */
  getMatchingInterviewers: async (payload) => {
    const response = await api.post('/hr/availability/match', payload);
    return response.data;
  },

  /**
   * Get an interviewer's slots within a date range (for match detail free-time view).
   */
  getInterviewerSlots: async (interviewerId, { startDateTime, endDateTime } = {}) => {
    const response = await api.get(
      withQuery(`/hr/availability/interviewers/${interviewerId}/slots`, {
        startDateTime,
        endDateTime,
      }),
    );
    return response.data;
  },
};

export default hrAvailabilityAPI;
