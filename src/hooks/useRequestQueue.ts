import { useState, useEffect } from 'react';

export interface PendingRequest {
  id: string;
  type: 'withdrawal' | 'deposit';
  amount: string;
  userName: string;
  location: { lat: number; lng: number; address: string };
  timestamp: number;
}

const STORAGE_KEY = 'atm_request_queue';

const getQueue = (): PendingRequest[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const setQueue = (queue: PendingRequest[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  // Trigger storage event for other tabs/components
  window.dispatchEvent(new Event('storage'));
};

export const useRequestQueue = () => {
  const [queue, setQueueState] = useState<PendingRequest[]>(getQueue());

  useEffect(() => {
    const handleStorageChange = () => {
      setQueueState(getQueue());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addRequest = (request: Omit<PendingRequest, 'id' | 'timestamp'>) => {
    const newRequest: PendingRequest = {
      ...request,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    const newQueue = [...getQueue(), newRequest];
    setQueue(newQueue);
    return newRequest;
  };

  const removeRequest = (id: string) => {
    const newQueue = getQueue().filter(r => r.id !== id);
    setQueue(newQueue);
  };

  const findMatch = (type: 'withdrawal' | 'deposit', amount: string) => {
    const oppositeType = type === 'withdrawal' ? 'deposit' : 'withdrawal';
    return getQueue().find(r => r.type === oppositeType && r.amount === amount);
  };

  const getNearbyRequests = (userLat: number, userLng: number, type: 'withdrawal' | 'deposit', maxDistance = 3) => {
    const oppositeType = type === 'withdrawal' ? 'deposit' : 'withdrawal';
    return getQueue()
      .filter(r => r.type === oppositeType)
      .map(r => {
        const distance = calculateDistance(userLat, userLng, r.location.lat, r.location.lng);
        return { ...r, distance };
      })
      .filter(r => r.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);
  };

  return {
    queue,
    addRequest,
    removeRequest,
    findMatch,
    getNearbyRequests,
  };
};

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
