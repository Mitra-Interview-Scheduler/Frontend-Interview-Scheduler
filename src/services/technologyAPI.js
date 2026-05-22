import api from './api';
import { createResourceApi } from './resourceApi';

const technologies = createResourceApi('/technologies');

export const technologyAPI = {
  getAllTechnologies: technologies.getAll,
  getTechnologyById: technologies.getById,

  getTechnologiesByCategory: async (category) => {
    const response = await api.get(`/technologies/category/${category}`);
    return response.data;
  },

  getAllCategories: async () => {
    const response = await api.get('/technologies/categories');
    return response.data;
  },

  createTechnology: technologies.create,
  updateTechnology: technologies.update,
  deleteTechnology: technologies.delete,
};

export default technologyAPI;
