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
  }
};

export default candidateAPI;