import api from './api';

export const assessmentAPI = {
  get: async (scheduleId) => {
    const response = await api.get(`/hr/assessments/${scheduleId}`);
    return response.data;
  },

  upload: async (scheduleId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/hr/assessments/${scheduleId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  download: async (scheduleId) => {
    const response = await api.get(`/hr/assessments/${scheduleId}/download`, {
      responseType: 'blob',
    });
    return response;
  },

  markReceived: async (scheduleId) => {
    const response = await api.post(`/hr/assessments/${scheduleId}/mark-received`);
    return response.data;
  },

  assignReviewers: async (scheduleId, reviewerUserIds) => {
    const response = await api.post(`/hr/assessments/${scheduleId}/reviewers`, {
      reviewerUserIds,
    });
    return response.data;
  },

  removeReviewer: async (scheduleId, reviewerUserId) => {
    const response = await api.delete(`/hr/assessments/${scheduleId}/reviewers/${reviewerUserId}`);
    return response.data;
  },

  listReviewers: async (scheduleId) => {
    const response = await api.get(`/hr/assessments/${scheduleId}/reviewers`);
    return response.data;
  },

  listMine: async () => {
    const response = await api.get('/interviewer/assessments');
    return response.data;
  },

  downloadAsReviewer: async (scheduleId) => {
    const response = await api.get(`/interviewer/assessments/${scheduleId}/download`, {
      responseType: 'blob',
    });
    return response;
  },

  completeAsReviewer: async (scheduleId) => {
    const response = await api.post(`/interviewer/assessments/${scheduleId}/complete`);
    return response.data;
  },
};

export default assessmentAPI;
