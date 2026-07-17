import api from './api';

export const departmentAPI = {
  getAllDepartments: async () => {
    const response = await api.get('/departments');
    return response.data;
  },

  createDepartment: async ({ name, code }) => {
    const response = await api.post('/departments', { name, code: code || null });
    return response.data;
  },

  getDepartmentByName: async (name) => {
    const response = await api.get(`/department/${name}`);
    return response.data;
  }
};

export default departmentAPI;
