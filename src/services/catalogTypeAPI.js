import { createResourceApi } from './resourceApi';
import api from './api';

const documentTypes = createResourceApi('/document-types');
const resourceTypes = createResourceApi('/resource-types');

export const documentTypeAPI = {
  getActive: documentTypes.getAll,
  getAll: async () => {
    const response = await api.get('/document-types/all');
    return response.data;
  },
  create: documentTypes.create,
  update: documentTypes.update,
  delete: documentTypes.delete,
};

export const resourceTypeAPI = {
  getActive: resourceTypes.getAll,
  getAll: async () => {
    const response = await api.get('/resource-types/all');
    return response.data;
  },
  create: resourceTypes.create,
  update: resourceTypes.update,
  delete: resourceTypes.delete,
};
