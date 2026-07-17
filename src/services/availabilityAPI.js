// src/services/availabilityAPI.js
import api from './api';
import { formatLocalDateTime } from '@/lib/calendarUtils';
import { InterviewRequestStatus } from '@/lib/statusConstants';

// ── Local datetime formatter (no timezone suffix) ──────────────────────────
export const availabilityAPI = {
  // ── Read ──────────────────────────────────────────────────────────────────

  /** All availability slots for the current interviewer */
  getMyAvailability: async () => {
    const response = await api.get('/availability');
    return response.data;
  },

  /** Availability slots in a date range */
  getAvailabilityByDateRange: async (start, end, page = 0, size = 200) => {
    const response = await api.get('/availability/range', {
      params: {
        start: formatLocalDateTime(start),
        end:   formatLocalDateTime(end),
        page,
        size,
      },
    });
    return response.data?.items || response.data;
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
   * TODO: Backend — POST /api/interviewer/interviews/schedules/{scheduleId}/propose-time
   * Payload: { availabilitySlotId, proposedStartDateTime, proposedEndDateTime, notes? }
   */
  proposeAlternativeTime: async (payload) => {
    console.info('[STUB] proposeAlternativeTime', payload);
    return { status: InterviewRequestStatus.PENDING, ...payload };
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
