import api from './api';
import { createResourceApi } from './resourceApi';

const categories = createResourceApi('/question-categories');

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
};

export default questionCategoryAPI;
