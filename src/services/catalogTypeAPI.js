import { createResourceApi } from './resourceApi';
import api from './api';
import { createExcelApi } from '@/lib/excelImportExport';

const documentTypes = createResourceApi('/document-types');
const resourceTypes = createResourceApi('/resource-types');
const documentExcel = createExcelApi('/document-types', 'document-types.xlsx');
const resourceExcel = createExcelApi('/resource-types', 'resource-types.xlsx');

export const documentTypeAPI = {
  getActive: documentTypes.getAll,
  getAll: async () => {
    const response = await api.get('/document-types/all');
    return response.data;
  },
  create: documentTypes.create,
  update: documentTypes.update,
  delete: documentTypes.delete,
  exportExcel: documentExcel.exportExcel,
  importExcel: documentExcel.importExcel,
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
  exportExcel: resourceExcel.exportExcel,
  importExcel: resourceExcel.importExcel,
};
