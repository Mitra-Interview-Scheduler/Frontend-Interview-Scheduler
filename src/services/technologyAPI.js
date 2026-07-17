import api from './api';
import { createResourceApi } from './resourceApi';

const technologies = createResourceApi('/technologies');
const categories = createResourceApi('/technology-categories');

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
};

export default technologyAPI;
