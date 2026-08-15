import axios from 'axios';
import { getAccessToken, clearTokens } from '../auth/token';

// In development, Vite proxies this path to the FastAPI server. Set
// VITE_API_URL for deployments that expose the API on a different origin.
const API_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add access token
apiClient.interceptors.request.use(
  async (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Let the browser automatically set the Content-Type and boundary for FormData
    if (config.data instanceof FormData) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else {
        delete config.headers['Content-Type'];
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// The backend currently issues access tokens only; it has no refresh endpoint.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?.url?.includes('/auth/login')) {
      clearTokens();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
