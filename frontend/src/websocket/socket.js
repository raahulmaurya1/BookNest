import { getAccessToken } from '../auth/token';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectTimer = null;

// Event listeners registry
const listeners = new Map();

const getWsUrl = (token) => {
  const baseUrl = import.meta.env.VITE_SOCKET_URL || 'ws://localhost:8000';
  // convert http to ws if needed
  const wsBase = baseUrl.replace(/^http/, 'ws');
  return `${wsBase}/ws?token=${token}`;
};

export const initSocket = (token) => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  const url = getWsUrl(token);
  socket = new WebSocket(url);

  socket.onopen = () => {
    console.log('WebSocket connected');
    reconnectAttempts = 0;
    notifyListeners('connect', null);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data && data.event) {
        notifyListeners(data.event, data.payload || data.data);
      }
    } catch (e) {
      console.error('Error parsing WebSocket message:', e);
    }
  };

  socket.onclose = (event) => {
    console.log('WebSocket disconnected:', event.reason || event.code);
    notifyListeners('disconnect', event.reason || event.code);
    socket = null;
    
    // Policy violation or normal closure
    if (event.code === 1008 || event.code === 1000) {
      return;
    }

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 5000);
      reconnectTimer = setTimeout(() => {
        const currentToken = getAccessToken();
        if (currentToken) {
          initSocket(currentToken);
        }
      }, delay);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return socket;
};

export const getSocket = () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    const token = getAccessToken();
    if (token) {
      return initSocket(token);
    }
    return null;
  }
  return socket;
};

export const disconnectSocket = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close(1000, "User disconnected");
    socket = null;
  }
};

// Simple event emitter implementation
export const onSocketEvent = (eventName, callback) => {
  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set());
  }
  listeners.get(eventName).add(callback);
};

export const offSocketEvent = (eventName, callback) => {
  if (listeners.has(eventName)) {
    listeners.get(eventName).delete(callback);
  }
};

const notifyListeners = (eventName, data) => {
  if (listeners.has(eventName)) {
    listeners.get(eventName).forEach(callback => callback(data));
  }
};