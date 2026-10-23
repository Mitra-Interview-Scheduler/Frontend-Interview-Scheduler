import api from './api';

const items = (path, section, params = {}) =>
  api.get(`${path}/items`, { params: { section, ...params } }).then((r) => r.data);

export const dashboardAPI = {
  getHrDashboard: (params) => api.get('/hr/dashboard', { params }).then((r) => r.data),
  getHrDashboardItems: (section, params) => items('/hr/dashboard', section, params),
  nudgeFeedback: (scheduleId) =>
    api.post(`/hr/dashboard/feedback-overdue/${scheduleId}/nudge`).then((r) => r.data),
  getInterviewerDashboard: (params) =>
    api.get('/interviewer/dashboard', { params }).then((r) => r.data),
  getInterviewerDashboardItems: (section, params) => items('/interviewer/dashboard', section, params),
  getInterviewerCoverage: (params) =>
    api.get('/interviewer/dashboard/coverage', { params }).then((r) => r.data),
  getAdminDashboard: (params) => api.get('/admin/dashboard', { params }).then((r) => r.data),
  getAdminDashboardItems: (section, params) => items('/admin/dashboard', section, params),
};
