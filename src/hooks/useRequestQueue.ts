import { useState, useEffect, useCallback } from 'react';
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

const mapRow = (r: any): PendingRequest => ({
  id: r.id,
  type: r.type,
  amount: String(r.amount),
  userName: r.user_name || 'User',
  location: {
    lat: Number(r.location_lat),
    lng: Number(r.location_lng),
    address: r.location_address || '',
  },
  timestamp: new Date(r.created_at).getTime(),
  userId: r.user_id,
});

export const useRequestQueue = () => {
  const [queue, setQueue] = useState<PendingRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (!error && data) setQueue(data.map(mapRow));
  }, []);

  // Initial fetch + realtime subscription
  useEffect(() => {
    refresh();
    const channel = supabase
      .channel('requests-queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const addRequest = async (
    request: Omit<PendingRequest, 'id' | 'timestamp' | 'userId'>
  ): Promise<PendingRequest | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from('requests')
      .insert({
        user_id: userId,
        type: request.type,
        amount: Number(request.amount),
        location_lat: request.location.lat,
        location_lng: request.location.lng,
        location_address: request.location.address,
        user_name: request.userName,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !data) {
      console.error('addRequest failed', error);
      return null;
    }
    const row = mapRow(data);
    setQueue((q) => [...q.filter((x) => x.id !== row.id), row]);
    return row;
  };

  const removeRequest = async (id: string) => {
    // Mark as cancelled (DELETE also allowed by RLS, but UPDATE keeps history)
    const { error } = await supabase
      .from('requests')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) console.error('removeRequest failed', error);
    setQueue((q) => q.filter((r) => r.id !== id));
  };

  const findMatch = (type: 'withdrawal' | 'deposit', amount: string) => {
    const oppositeType = type === 'withdrawal' ? 'deposit' : 'withdrawal';
    return queue.find(
      (r) =>
        r.type === oppositeType &&
        r.amount === String(amount) &&
        r.userId !== currentUserId
    );
  };

  const getNearbyRequests = (
    userLat: number,
    userLng: number,
    type: 'withdrawal' | 'deposit',
    maxDistance = 3
  ) => {
    const oppositeType = type === 'withdrawal' ? 'deposit' : 'withdrawal';
    return queue
      .filter((r) => r.type === oppositeType && r.userId !== currentUserId)
      .map((r) => {
        const distance = calculateDistance(
          userLat,
          userLng,
          r.location.lat,
          r.location.lng
        );
        return { ...r, distance };
      })
      .filter((r) => r.distance <= maxDistance)
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

const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
