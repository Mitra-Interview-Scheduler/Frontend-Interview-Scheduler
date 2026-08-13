import api from './api';

export const feedbackQuestionsAPI = {
  // List all forms
  getAll: async () => {
    const response = await api.get('/feedback/forms');
    return response.data;
  },

  getByDepartmentAndRole: async (departmentId, designationId, interviewType) => {
  const response = await api.get('/feedback/candidateforms', {
    params: {
      departmentId,
      designationId,
      interviewType,
    }
  });
  return response.data;
},

  // Get a single form by ID
  getById: async (id) => {
    const response = await api.get(`/feedback/forms/${id}`);
    return response.data;
  },

  // Create a new form (with questions)
  save: async (payload) => {
    const response = await api.post('/feedback/forms', payload);
    return response.data;
  },

  update: async (id, payload) => {
    const response = await api.put(`/feedback/forms/${id}`, payload);
    return response.data;
  },

  setActive: async (id, active) => {
    const response = await api.patch(`/feedback/forms/${id}/status`, { active });
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/feedback/forms/${id}`);
  },

  getObligatoryQuestions: async () => {
    const response = await api.get('/feedback/obligatory-questions', {
      // Optional load: don't force full re-login if this secondary request returns 401.
      _skipAuthRedirect: true,
    });
    return response.data;
  },

  createObligatoryQuestion: async (payload) => {
    const response = await api.post('/feedback/obligatory-questions', payload);
    return response.data;
  },

  updateObligatoryQuestion: async (id, payload) => {
    const response = await api.put(`/feedback/obligatory-questions/${id}`, payload);
    return response.data;
  },

  deleteObligatoryQuestion: async (id) => {
    await api.delete(`/feedback/obligatory-questions/${id}`);
  },

  exportObligatoryExcel: async () => {
    const { exportExcel } = await import('@/lib/excelImportExport');
    return exportExcel('/feedback/obligatory-questions/export', 'obligatory-questions.xlsx');
  },

  importObligatoryExcel: async (file) => {
    const { importExcel } = await import('@/lib/excelImportExport');
    return importExcel('/feedback/obligatory-questions/import', file);
  },
};

export default feedbackQuestionsAPI;