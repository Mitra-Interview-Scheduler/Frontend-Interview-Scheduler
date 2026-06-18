import api from './api';
import { withQuery } from './queryParams';

export const candidateAPI = {
  // Get all candidates with optional filters
  getAllCandidates: async (filters = {}, pagination = null) => {
    const response = await api.get(withQuery('/candidates', {
      departmentId: filters.departmentId,
      status: filters.status,
      search: filters.search,
      page: pagination?.page,
      size: pagination?.size,
    }));
    return response.data;
  },

  // Get candidate by ID
  getCandidateById: async (id) => {
    const response = await api.get(`/candidates/${id}`);
    return response.data;
  },

  // Get candidates by department
  getCandidatesByDepartment: async (departmentId) => {
    const response = await api.get(`/candidates/department/${departmentId}`);
    return response.data;
  },

  // Get candidates by status
  getCandidatesByStatus: async (status) => {
    const response = await api.get(`/candidates/status/${status}`);
    return response.data;
  },

  // Search candidates
  searchCandidates: async (searchTerm) => {
    const response = await api.get(`/candidates/search?term=${encodeURIComponent(searchTerm)}`);
    return response.data;
  },

  // Create new candidate
  createCandidate: async (candidateData) => {
    const response = await api.post('/candidates', candidateData);
    return response.data;
  },

  // Update candidate
  updateCandidate: async (id, candidateData) => {
    const response = await api.put(`/candidates/${id}`, candidateData);
    return response.data;
  },

  closeCandidate: async (id, payload) => {
    const response = await api.post(`/candidates/${id}/close`, payload);
    return response.data;
  },

  // Delete (deactivate) candidate
  deleteCandidate: async (id) => {
    await api.delete(`/candidates/${id}`);
  },

  getCandidateDocuments: async (candidateId) => {
    const response = await api.get(`/candidates/${candidateId}/documents`);
    return response.data;
  },

  uploadCandidateDocument: async (candidateId, file, documentType = 'CV') => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(
      `/candidates/${candidateId}/documents?documentType=${encodeURIComponent(documentType)}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  replaceCandidateDocument: async (candidateId, documentId, file, documentType = 'CV') => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.put(
      `/candidates/${candidateId}/documents/${documentId}?documentType=${encodeURIComponent(documentType)}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  downloadCandidateDocument: async (candidateId, documentId) => {
    const response = await api.get(
      `/candidates/${candidateId}/documents/${documentId}/download`,
      { responseType: 'blob' }
    );
    return response;
  },

  deleteCandidateDocument: async (candidateId, documentId) => {
    await api.delete(`/candidates/${candidateId}/documents/${documentId}`);
  },

  // Fetch a candidate's screening tracker file mapping context
  getCandidateScreeningFile: async (candidateId) => {
    const response = await api.get(`/candidateScreening/${candidateId}/screening`);
    return response.data;
  },

  // Save or modify standard candidate screening metrics evaluation state
  saveCandidateScreeningFile: async (candidateId, screeningPayload) => {
    const response = await api.post(`/candidateScreening/${candidateId}/screening`, screeningPayload);
    return response.data;
  },


};

export default candidateAPI;
