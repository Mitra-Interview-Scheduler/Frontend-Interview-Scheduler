// src/services/availabilityAPI.js
import api from './api';

// ── Local datetime formatter (no timezone suffix) ──────────────────────────
const formatLocalDateTime = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
         `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const availabilityAPI = {
  // ── Read ──────────────────────────────────────────────────────────────────

  /** All availability slots for the current interviewer */
  getMyAvailability: async () => {
    const response = await api.get('/availability');
    return response.data;
  },

  /** Availability slots in a date range */
  getAvailabilityByDateRange: async (start, end) => {
    const response = await api.get('/availability/range', {
      params: {
        start: formatLocalDateTime(start),
        end:   formatLocalDateTime(end),
      },
    });
    return response.data;
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

  // ── Write ─────────────────────────────────────────────────────────────────

  /** Create a single availability slot */
  createAvailabilitySlot: async (slotData) => {
    const response = await api.post('/availability', {
      startDateTime: formatLocalDateTime(slotData.startDateTime),
      endDateTime:   formatLocalDateTime(slotData.endDateTime),
      currentTime:   formatLocalDateTime(slotData.currentTime),
      description:   slotData.description || null,
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
      })),
    });
    return response.data;
  },

  /**
   * Update an existing AVAILABLE slot's time range / description.
   * The backend rejects BOOKED slots with a 400.
   */
  updateAvailabilitySlot: async (slotId, slotData) => {
    const response = await api.put(`/availability/${slotId}`, {
      startDateTime: formatLocalDateTime(slotData.startDateTime),
      endDateTime:   formatLocalDateTime(slotData.endDateTime),
      currentTime:   formatLocalDateTime(slotData.currentTime),
      description:   slotData.description ?? null,
    });
    return response.data;
  },

  /** Soft-delete (deactivate) an AVAILABLE slot */
  deleteAvailabilitySlot: async (slotId) => {
    await api.delete(`/availability/${slotId}`);
  },
};

export default availabilityAPI;