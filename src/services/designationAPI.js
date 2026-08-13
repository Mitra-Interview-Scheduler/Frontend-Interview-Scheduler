import api from './api';
import { createResourceApi } from './resourceApi';
import { createExcelApi } from '@/lib/excelImportExport';

const designations = createResourceApi('/designations');
const excel = createExcelApi('/designations', 'designations.xlsx');

export const designationAPI = {
  getAllDesignations: designations.getAll,
  getDesignationById: designations.getById,

  getDesignationsByDepartment: async (departmentId) => {
    const response = await api.get(`/designations/department/${departmentId}`);
    return response.data;
  },

  getDesignationsByTier: async (tierId) => {
    const response = await api.get(`/designations/tier/${tierId}`);
    return response.data;
  },

  createDesignation: designations.create,
  updateDesignation: designations.update,
  deleteDesignation: designations.delete,

  exportExcel: excel.exportExcel,
  importExcel: excel.importExcel,
};

export default designationAPI;
