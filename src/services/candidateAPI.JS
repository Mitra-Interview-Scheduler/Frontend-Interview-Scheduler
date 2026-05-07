import api from './api';

export const candidateAPI = {
  // Get all candidates with optional filters
  getAllCandidates: async (filters = {}, pagination = null) => {
    const params = new URLSearchParams();
    if (filters.departmentId) params.append('departmentId', filters.departmentId);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (pagination?.page !== undefined) params.append('page', pagination.page);
    if (pagination?.size !== undefined) params.append('size', pagination.size);
    
    const queryString = params.toString();
    const url = queryString ? `/candidates?${queryString}` : '/candidates';
    const response = await api.get(url);
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
};

export default candidateAPI;
