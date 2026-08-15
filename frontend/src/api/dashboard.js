import apiClient from './client';

export const dashboardAPI = {
  getStats: () => apiClient.get('/dashboard/'),
};

export const activityAPI = {
  getActivity: () => apiClient.get('/activity/'),
};