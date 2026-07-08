import { createResourceApi } from './resourceApi';

const domains = createResourceApi('/domains');

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
};

export default domainAPI;
