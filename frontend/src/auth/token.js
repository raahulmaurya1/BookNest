const API_URL = import.meta.env.VITE_API_URL || '/api';
let refreshPromise = null;

export const setAccessToken = (token) => {
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
};

export const getAccessToken = () => {
  return localStorage.getItem('accessToken');
};

export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  refreshPromise = null;
};

export const refreshAccessToken = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMessage = 'Refresh failed';
        try {
          const error = await response.json();
          errorMessage = error.detail || error.error || errorMessage;
        } catch (e) {}
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const accessToken = data.access_token;
      setAccessToken(accessToken);
      resolve(accessToken);
    } catch (error) {
      clearTokens();
      reject(error);
    } finally {
      refreshPromise = null;
    }
  });

  return refreshPromise;
};

export const logoutBackend = async () => {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Failed to logout backend', error);
  }
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};