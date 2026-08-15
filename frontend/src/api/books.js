import apiClient from './client';

export const booksAPI = {
  getAll: (params) => apiClient.get('/books/', { params }),
  getById: (id) => apiClient.get(`/books/${id}`),
  create: (data) => apiClient.post('/books/', data),
  update: (id, data) => apiClient.patch(`/books/${id}`, data),
  delete: (id) => apiClient.delete(`/books/${id}`),
  updateProgress: (id, current_page) => 
    apiClient.patch(`/books/${id}/progress`, { current_page }),
  uploadPDF: (id, formData) =>
    apiClient.post(`/books/${id}/pdf`, formData),
  getPDFUrl: (id) => apiClient.get(`/books/${id}/pdf`),
};

export const lendingAPI = {
  lend: (bookId, borrower_email) => 
    apiClient.post(`/lending/${bookId}`, { borrower_email }),
  returnBook: (bookId) => apiClient.patch(`/lending/${bookId}/return`),
  getLent: () => apiClient.get('/lending/lent'),
  getBorrowed: () => apiClient.get('/lending/borrowed'),
};