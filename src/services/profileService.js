import api from './api';

export const profileAPI = {
  // Get current user's profile
  getProfile: async () => {
    const response = await api.get('/profile');
    return response.data;
  },

  // Update profile information
  updateProfile: async (profileData) => {
    const response = await api.put('/profile', profileData);
    return response.data;
  },

  // Get all technologies
  getAllTechnologies: async () => {
    const response = await api.get('/technologies');
    return response.data;
  },

  // Get user's interviewer technologies
  getInterviewerTechnologies: async () => {
    const response = await api.get('/profile/interviewer-technologies');
    return response.data;
  },

  // Add interviewer technology
  addInterviewerTechnology: async (technologyId, yearsOfExperience = 0, isCore = false) => {
    const response = await api.post('/profile/interviewer-technologies', {
      technologyId,
      yearsOfExperience,
      isCore,
    });
    return response.data;
  },

  // Update interviewer technology (e.g. core flag)
  updateInterviewerTechnology: async (id, { isCore }) => {
    const response = await api.put(`/profile/interviewer-technologies/${id}`, { isCore });
    return response.data;
  },

  // Remove interviewer technology
  removeInterviewerTechnology: async (id) => {
    await api.delete(`/profile/interviewer-technologies/${id}`);
  },

  // Create new technology (if it doesn't exist)
  createTechnology: async (name, categoryId) => {
    const response = await api.post('/technologies', { name, categoryId });
    return response.data;
  },

  // Get all departments
  getDepartments: async () => {
    const response = await api.get('/departments');
    return response.data;
  },

  createDepartment: async (name, code) => {
    const response = await api.post('/departments', { name, code: code || null });
    return response.data;
  },

  // Get all designations
  getDesignations: async () => {
    const response = await api.get('/designations');
    return response.data;
  },

  // Get designations by department
  getDesignationsByDepartment: async (departmentId) => {
    const response = await api.get(`/designations/department/${departmentId}`);
    return response.data;
  },

  // Get designations by tier
  getDesignationsByTier: async (tierId) => {
    const response = await api.get(`/designations/tier/${tierId}`);
    return response.data;
  },

  // Get all tiers
  getTiers: async () => {
    const response = await api.get('/tiers');
    return response.data;
  },

  // Get tiers by department
  getTiersByDepartment: async (departmentId) => {
    const response = await api.get(`/tiers/department/${departmentId}`);
    return response.data;
  }
};

export default profileAPI;