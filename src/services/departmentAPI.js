import api from './api';

export const departmentAPI = {
  getAllDepartments: async () => {
    const response = await api.get('/departments');
    return response.data;
  },



  getDepartmentByName: async (name) => {
    const response = await api.get(`/department/${name}`);
    return response.data;
  }
};

export default departmentAPI;
