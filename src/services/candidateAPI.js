import api, { getAccessToken } from './api';
import { withQuery } from './queryParams';
import { env } from '@/config/env';

const API_BASE_URL = env.API_BASE_URL;

/** Native fetch for multipart — avoids axios Content-Type boundary issues. */
async function uploadMultipartFile(url, file, method = 'POST') {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAccessToken();
  const timezone =
    localStorage.getItem('preferredTimeZone') ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'UTC';

  const response = await fetch(`${API_BASE_URL}${url}`, {
    method,
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Timezone': timezone,
    },
    body: formData,
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.message || `Document upload failed (${response.status})`);
    error.response = { status: response.status, data };
    throw error;
  }

  return data;
}

const candidateAPI = {
  // Get all candidates with optional filters
  getAllCandidates: async (filters = {}, pagination = null) => {
    const response = await api.get(withQuery('/candidates', {
      departmentId: filters.departmentId,
      status: filters.status,
      search: filters.search,
      coordinatedHrId: filters.coordinatedHrId,
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

  uploadCandidateDocument: async (candidateId, file, documentType = 'CV') =>
    uploadMultipartFile(
      `/candidates/${candidateId}/documents?documentType=${encodeURIComponent(documentType)}`,
      file,
      'POST'
    ),

  replaceCandidateDocument: async (candidateId, documentId, file, documentType = 'CV') =>
    uploadMultipartFile(
      `/candidates/${candidateId}/documents/${documentId}?documentType=${encodeURIComponent(documentType)}`,
      file,
      'PUT'
    ),

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

  addCandidateTechnology: async (candidateId, technologyId, isCore = false) => {
    const response = await api.post(`/candidates/${candidateId}/technologies`, { technologyId, isCore });
    return response.data;
  },

  updateCandidateTechnology: async (candidateId, technologyAssignmentId, { isCore }) => {
    const response = await api.put(
      `/candidates/${candidateId}/technologies/${technologyAssignmentId}`,
      { isCore },
    );
    return response.data;
  },

  removeCandidateTechnology: async (candidateId, technologyAssignmentId) => {
    await api.delete(`/candidates/${candidateId}/technologies/${technologyAssignmentId}`);
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
