import api from './api';

export const closingReasonAPI = {
  getActiveReasons: async () => {
    const response = await api.get('/closing-reasons');
    return response.data;
  },
};

export default closingReasonAPI;
