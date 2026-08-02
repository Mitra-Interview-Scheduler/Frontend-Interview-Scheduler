// src/services/availabilityAPI.js
import api from './api';
import { formatLocalDateTime } from '@/lib/calendarUtils';

// ── Local datetime formatter (no timezone suffix) ──────────────────────────
export const availabilityAPI = {
  // ── Read ──────────────────────────────────────────────────────────────────

  /** All availability slots for the current interviewer */
  getMyAvailability: async () => {
    const response = await api.get('/availability');
    return response.data;
  },

  /** Availability slots in a date range, optionally with read-only Google Calendar events */
  getAvailabilityByDateRange: async (start, end, page = 0, size = 200, includeGoogleEvents = true) => {
    const response = await api.get('/availability/range', {
      params: {
        start: formatLocalDateTime(start),
        end:   formatLocalDateTime(end),
        page,
        size,
        includeGoogleEvents,
      },
    });
    const data = response.data;
    if (data && Array.isArray(data.items)) {
      return {
        items: data.items,
        googleExternalEvents: data.googleExternalEvents || [],
      };
    }
    return {
      items: data || [],
      googleExternalEvents: [],
    };
  },

  /** Available + booked slot counts */
  getAvailabilityStats: async () => {
    const response = await api.get('/availability/stats');
    return response.data;
  },

  /** Get full interview details for a booked slot by interviewScheduleId */
  getInterviewDetails: async (interviewScheduleId) => {
    try {
      const response = await api.get(`interviewer/interviews/bookedInterviews/${interviewScheduleId}`);
      console.log('Fetched interview details:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching interview details for ID ${interviewScheduleId}:`, {
        status: error.response?.status,
        message: error.response?.statusText,
        data: error.response?.data,
      });
      throw error; // Re-throw so caller knows the request failed
    }
  },

  completeInterview: async (interviewScheduleId) => {
    const response = await api.patch(`interviewer/interviews/schedules/${interviewScheduleId}/complete`);
    return response.data;
  },

  /**
   * Interviewer proposes an alternative time for a scheduled interview.
   * Creates a postpone request and notifies HR / candidate coordinator.
   */
  proposeAlternativeTime: async ({
    interviewScheduleId,
    proposedStartDateTime,
    proposedEndDateTime,
    reason,
  }) => {
    const payload = {
      reason: reason?.trim()
        || undefined,
    };
    if (proposedStartDateTime && proposedEndDateTime) {
      payload.preferredStartDateTime = formatLocalDateTime(proposedStartDateTime);
      payload.preferredEndDateTime = formatLocalDateTime(proposedEndDateTime);
      if (!payload.reason) {
        payload.reason = 'Interviewer proposed an alternative time for this scheduled interview.';
      }
    }
    const response = await api.post(
      `/interviewer/interviews/schedules/${interviewScheduleId}/postpone-requests`,
      payload,
    );
    return response.data;
  },

  getPanelCommonFreeWindows: async (interviewScheduleId) => {
    const response = await api.get(
      `/interviewer/interviews/schedules/${interviewScheduleId}/panel-common-windows`,
    );
    return response.data;
  },

  getPendingPostponeRequest: async (interviewScheduleId) => {
    const response = await api.get(
      `/interviewer/interviews/schedules/${interviewScheduleId}/postpone-requests/pending`,
    );
    return response.data;
  },

  withdrawPostponeRequest: async (postponeRequestId) => {
    const response = await api.delete(
      `/interviewer/interviews/postpone-requests/${postponeRequestId}`,
    );
    return response.data;
  },

  // ── Write ─────────────────────────────────────────────────────────────────

  /** Create a single availability slot */
  createAvailabilitySlot: async (slotData) => {
    const response = await api.post('/availability', {
      startDateTime: formatLocalDateTime(slotData.startDateTime),
      endDateTime:   formatLocalDateTime(slotData.endDateTime),
      currentTime:   formatLocalDateTime(slotData.currentTime),
      description:   slotData.description || null,
      recurrenceGroupId: slotData.recurrenceGroupId || null,
    });
    return response.data;
  },

  /** Create multiple availability slots at once */
  createBulkAvailabilitySlots: async (slots) => {
    const response = await api.post('/availability/bulk', {
      slots: slots.map((slot) => ({
        startDateTime: formatLocalDateTime(slot.startDateTime),
        endDateTime:   formatLocalDateTime(slot.endDateTime),
        currentTime:   formatLocalDateTime(slot.currentTime),
        description:   slot.description || null,
        recurrenceGroupId: slot.recurrenceGroupId || null,
      })),
    });
    return response.data;
  },

  /**
   * Update an existing AVAILABLE slot's time range / description.
   * The backend rejects BOOKED slots with a 400.
   */
  updateAvailabilitySlot: async (slotId, slotData, scope = 'SINGLE') => {
    const response = await api.put(`/availability/${slotId}`, {
      startDateTime: formatLocalDateTime(slotData.startDateTime),
      endDateTime:   formatLocalDateTime(slotData.endDateTime),
      currentTime:   formatLocalDateTime(slotData.currentTime),
      description:   slotData.description ?? null,
    }, {
      params: { scope },
    });
    return response.data;
  },

  /** Soft-delete (deactivate) an AVAILABLE slot */
  deleteAvailabilitySlot: async (slotId, scope = 'SINGLE') => {
    await api.delete(`/availability/${slotId}`, {
      params: { scope },
    });
  },
};

export default availabilityAPI;
