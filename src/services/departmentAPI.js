import api from './api';

export const departmentAPI = {
  getAllDepartments: async () => {
    const response = await api.get('/departments');
    return response.data;
  },

  getAllDepartmentsIncludingInactive: async () => {
    const response = await api.get('/departments/all');
    return response.data;
  },

  createDepartment: async ({ name, code }) => {
    const response = await api.post('/departments', { name, code: code || null });
    return response.data;
  },

  updateDepartment: async (id, data) => {
    const response = await api.put(`/departments/${id}`, data);
    return response.data;
  },

  deleteDepartment: async (id) => {
    await api.delete(`/departments/${id}`);
  },

  getDepartmentByName: async (name) => {
    const response = await api.get(`/department/${name}`);
    return response.data;
  }
};

export default departmentAPI;
