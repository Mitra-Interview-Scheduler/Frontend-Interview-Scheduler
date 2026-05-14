import api from './api';
import { createResourceApi } from './resourceApi';

const tiers = createResourceApi('/tiers');

export const tierAPI = {
  getAllTiers: tiers.getAll,
  getTierById: tiers.getById,

  getTiersByDepartment: async (departmentId) => {
    const response = await api.get(`/tiers/department/${departmentId}`);
    return response.data;
  },

  createTier: tiers.create,
  updateTier: tiers.update,
  deleteTier: tiers.delete,
};

export default tierAPI;
