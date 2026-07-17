import api from './api';

export const departmentUsersAPI = {
  /**
   * List active users for HR pickers.
   * @param {{ role?: string, departmentId?: number|string }} options
   */
  getUsers: async ({ role, departmentId } = {}) => {
    const params = {};
    if (role) params.role = role;
    if (departmentId) params.departmentId = departmentId;
    const response = await api.get('/hr/department-users', {
      params,
      // Optional picker call: on 401, reject locally instead of global logout + /login redirect (see api.js interceptor).
      _skipAuthRedirect: true,
    });
    return response.data;
  },

  /** All active users in a department (any role). */
  getUsersByDepartment: async (departmentId) => {
    return departmentUsersAPI.getUsers({ departmentId });
  },
};
