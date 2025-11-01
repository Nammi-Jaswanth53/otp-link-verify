import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PendingRequest {
  id: string;
  type: 'withdrawal' | 'deposit';
  amount: string;
  userName: string;
  location: { lat: number; lng: number; address: string };
  timestamp: number;
  userId: string;
}

export const useRequestQueue = () => {
  const [queue, setQueueState] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch requests from database
  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          type,
          amount,
          location_lat,
          location_lng,
          created_at,
          user_id,
          profiles (phone_number)
        `)
        .eq('status', 'pending');

      if (error) throw error;

      const requests: PendingRequest[] = await Promise.all((data || []).map(async (r: any) => ({
        id: r.id,
        type: r.type,
        amount: r.amount.toString(),
        userName: r.profiles?.phone_number || 'Unknown',
        location: {
          lat: r.location_lat,
          lng: r.location_lng,
          address: 'Loading...'
        },
        timestamp: new Date(r.created_at).getTime(),
        userId: r.user_id
      })));

      setQueueState(requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests'
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addRequest = async (request: Omit<PendingRequest, 'id' | 'timestamp' | 'userId'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('requests')
        .insert({
          type: request.type,
          amount: parseFloat(request.amount),
          location_lat: request.location.lat,
          location_lng: request.location.lng,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      const newRequest: PendingRequest = {
        id: data.id,
        type: data.type as 'withdrawal' | 'deposit',
        amount: data.amount.toString(),
        userName: request.userName,
        location: request.location,
        timestamp: new Date(data.created_at).getTime(),
        userId: user.id
      };

      return newRequest;
    } catch (error) {
      console.error('Error adding request:', error);
      throw error;
    }
  };

  const removeRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing request:', error);
    }
  };

  const findMatch = async (type: 'withdrawal' | 'deposit', amount: string) => {
    const oppositeType = type === 'withdrawal' ? 'deposit' : 'withdrawal';
    return queue.find(r => r.type === oppositeType && r.amount === amount);
  };

  const getNearbyRequests = (userLat: number, userLng: number, type: 'withdrawal' | 'deposit', maxDistance = 3) => {
    const oppositeType = type === 'withdrawal' ? 'deposit' : 'withdrawal';
    return queue
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
    loading
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
