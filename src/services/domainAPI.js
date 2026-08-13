import { createResourceApi } from './resourceApi';
import { createExcelApi } from '@/lib/excelImportExport';

const domains = createResourceApi('/domains');
const excel = createExcelApi('/domains', 'domains.xlsx');

export const domainAPI = {
  getAllDomains: domains.getAll,
  getAllDomainsIncludingInactive: async () => {
    const { default: api } = await import('./api');
    const response = await api.get('/domains/all');
    return response.data;
  },
  getDomainById: domains.getById,
  createDomain: domains.create,
  updateDomain: domains.update,
  deleteDomain: domains.delete,
  exportExcel: excel.exportExcel,
  importExcel: excel.importExcel,
};

export default domainAPI;
