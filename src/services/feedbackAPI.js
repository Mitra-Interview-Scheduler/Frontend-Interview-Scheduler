import api from './api';
import mockFeedbackQuestions from '@/data/mockFeedbackQuestions.json';

const feedbackAPI = {
  /**
   * Fetch feedback questions from the backend.
   * Falls back to mock data if the API is unavailable or returns no data.
   */
  async getFeedbackQuestions() {
    
    try {
      const response = await api.get('/feedback/questions');
      if (response.data && response.data.questions && response.data.questions.length > 0) {
        return response.data;
      }
      // Fallback to mock if empty response
      console.warn('No feedback questions from API, using mock data');
      return mockFeedbackQuestions;
    } catch (error) {
      console.warn('Failed to fetch feedback questions from API, using mock data:', error.message);
      return mockFeedbackQuestions;
    }
    
  },

  /**
   * Submit feedback for an interview.
   * POST to /feedback/responses with interviewScheduleId and responses JSON.
   */
  async submitFeedback(interviewScheduleId, responses, feedbackFormId = null) {
    try {
      const payload = {
        interviewScheduleId,
        feedbackFormId,
        responses,
        submittedAt: new Date().toISOString(),
      };
      const response = await api.post('/feedback/responses', payload);
      return response.data;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      console.warn('Feedback submission failed (no backend), logging responses:', responses);
      return {
        id: Date.now(),
        interviewScheduleId,
        feedbackFormId,
        responses,
        submittedAt: new Date().toISOString(),
        message: 'Feedback logged (no persistence without backend)',
      };
    }
  },

  /**
   * Fetch existing feedback for an interview (if editing).
   * GET /feedback/responses/{interviewScheduleId}
   */
  async getFeedbackForInterview(interviewScheduleId) {
    try {
      const response = await api.get(`/feedback/responses/${interviewScheduleId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // No feedback yet
      }
      console.error('Failed to fetch feedback:', error);
      return null;
    }
  },
};

export { feedbackAPI };
