import api from './api';
import { createResourceApi } from './resourceApi';
import { createExcelApi } from '@/lib/excelImportExport';

const tiers = createResourceApi('/tiers');
const excel = createExcelApi('/tiers', 'tiers.xlsx');

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

  exportExcel: excel.exportExcel,
  importExcel: excel.importExcel,
};

export default tierAPI;
