import api from './api';
import { createResourceApi } from './resourceApi';
import { createExcelApi } from '@/lib/excelImportExport';

const categories = createResourceApi('/question-categories');
const excel = createExcelApi('/question-categories', 'question-categories.xlsx');

export const questionCategoryAPI = {
  getAll: async (forForms = false) => {
    const response = await api.get('/question-categories', {
      params: { forForms },
    });
    return response.data;
  },

  getById: categories.getById,
  create: categories.create,
  update: categories.update,
  delete: categories.delete,

  exportExcel: excel.exportExcel,
  importExcel: excel.importExcel,
};

export default questionCategoryAPI;
