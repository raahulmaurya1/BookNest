import apiClient from './client';

export const shelvesAPI = {
  getAll: () => apiClient.get('/shelves/'),
  getById: (id) => apiClient.get(`/shelves/${id}`),
  create: (data) => apiClient.post('/shelves/', data),
  update: (id, data) => apiClient.patch(`/shelves/${id}`, data),
  delete: (id) => apiClient.delete(`/shelves/${id}`),
  addBook: (shelfId, bookId) => 
    apiClient.post(`/shelves/${shelfId}/books/${bookId}`),
  removeBook: (shelfId, bookId) => 
    apiClient.delete(`/shelves/${shelfId}/books/${bookId}`),
};

export const membersAPI = {
  getMembers: (shelfId) => apiClient.get(`/shelves/${shelfId}/members/`),
  addMember: (shelfId, data) => apiClient.post(`/shelves/${shelfId}/members/`, data),
  updateMember: (shelfId, userId, role) => 
    apiClient.patch(`/shelves/${shelfId}/members/${userId}`, { role }),
  removeMember: (shelfId, userId) => 
    apiClient.delete(`/shelves/${shelfId}/members/${userId}`),
};