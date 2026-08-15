import { useEffect, useState } from 'react';
import { getSocket, onSocketEvent, offSocketEvent } from './socket';

export const useSocket = (eventName, callback, dependencies = []) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    setIsConnected(socket ? socket.readyState === WebSocket.OPEN : false);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onEvent = (data) => {
      console.log(`Socket event: ${eventName}`, data);
      callback(data);
    };

    onSocketEvent('connect', onConnect);
    onSocketEvent('disconnect', onDisconnect);
    
    if (eventName && callback) {
      onSocketEvent(eventName, onEvent);
    }

    return () => {
      offSocketEvent('connect', onConnect);
      offSocketEvent('disconnect', onDisconnect);
      if (eventName) {
        offSocketEvent(eventName, onEvent);
      }
    };
  }, [eventName, ...dependencies]);

  return { isConnected };
};

export const useShelfSubscription = (shelfId, onUpdate) => {
  useSocket('shelf:updated', (data) => {
    if (data.shelfId === shelfId || data.shelf_id === shelfId) {
      onUpdate(data);
    }
  }, [shelfId]);

  useSocket('book:lent', (data) => {
    if (data.shelfId === shelfId || data.shelf_id === shelfId) {
      onUpdate(data);
    }
  }, [shelfId]);

  return { isSubscribed: true };
};

export const useBorrowedBooksSubscription = (onUpdate) => {
  useSocket('book_lent_to_you', onUpdate);
  useSocket('book_returned', onUpdate);
};

export const useActivitySubscription = (onUpdate) => {
  useSocket('activity:new', onUpdate);
};