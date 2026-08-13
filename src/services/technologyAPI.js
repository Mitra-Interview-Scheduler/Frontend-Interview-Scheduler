import api from './api';
import { createResourceApi } from './resourceApi';
import { createExcelApi } from '@/lib/excelImportExport';

const technologies = createResourceApi('/technologies');
const categories = createResourceApi('/technology-categories');
const techExcel = createExcelApi('/technologies', 'technologies.xlsx');
const categoryExcel = createExcelApi('/technology-categories', 'technology-categories.xlsx');

export const technologyAPI = {
  getAllTechnologies: technologies.getAll,
  getTechnologyById: technologies.getById,

  getTechnologiesByCategory: async (categoryCode) => {
    const response = await api.get(`/technologies/category/${encodeURIComponent(categoryCode)}`);
    return response.data;
  },

  getAllCategories: async () => {
    const response = await api.get('/technologies/categories');
    return response.data;
  },

  getTechnologyCategories: categories.getAll,
  createCategory: categories.create,
  updateCategory: categories.update,
  deleteCategory: categories.delete,

  createTechnology: technologies.create,
  updateTechnology: technologies.update,
  deleteTechnology: technologies.delete,

  exportExcel: techExcel.exportExcel,
  importExcel: techExcel.importExcel,
  exportCategoriesExcel: categoryExcel.exportExcel,
  importCategoriesExcel: categoryExcel.importExcel,
};

export default technologyAPI;
