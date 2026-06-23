import api from './api';
import mockFeedbackQuestions from '@/data/mockFeedbackQuestions.json';

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

  // Seed multiple forms using local mock data split into batches
  seedMock: async (overrides = {}) => {
    const totalForms = overrides.totalForms || 5;
    const questions = Array.isArray(mockFeedbackQuestions.questions) ? mockFeedbackQuestions.questions : [];
    const questionsPerForm = Math.max(1, Math.ceil(questions.length / totalForms));

    const createdForms = [];

    for (let index = 0; index < totalForms; index += 1) {
      const start = index * questionsPerForm;
      const end = start + questionsPerForm;
      const batchQuestions = questions.slice(start, end);

      if (batchQuestions.length === 0) {
        continue;
      }

      const payload = {
        ...mockFeedbackQuestions,
        ...overrides,
        name: `${mockFeedbackQuestions.name} ${index + 1}`,
        description: `${mockFeedbackQuestions.description} - Part ${index + 1}`,
        questions: batchQuestions.map((question, questionIndex) => ({
          ...question,
          order: questionIndex + 1,
        })),
      };

      delete payload.totalForms;

      const response = await api.post('/feedback/forms', payload);
      createdForms.push(response.data);
    }

    return createdForms;
  },
};

export default feedbackQuestionsAPI;