import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRequestQueue } from '@/hooks/useRequestQueue';
import { notify, requestNotifPermission, getNotifPermission, type NotifPermission } from '@/lib/notifications';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  History, 
  DollarSign, 
  LogOut, 
  Plus,
  Bot,
  Shield,
  MapPin,
  X,
  Users,
  Clock,
  CreditCard,
  Trash2
} from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';

interface ATMDashboardProps {
  onLogout: () => void;
}

const ATMDashboard: React.FC<ATMDashboardProps> = ({ onLogout }) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [addedAccounts, setAddedAccounts] = useState<Array<{id: string, bankName: string, accountNumber: string, addedDate: string}>>([]);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{sender: string, message: string, time: string, location?: {lat: number, lng: number, address: string}}>>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [matchedUser, setMatchedUser] = useState('');
  // Default location set to Narsipatnam, Anakapalli District
  const NARSIPATNAM_COORDS = { lat: 17.6667, lng: 82.6167 };
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number}>(NARSIPATNAM_COORDS);
  const [matchedUserLocation, setMatchedUserLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapLocation, setMapLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapsApiKey, setMapsApiKey] = useState<string>('');
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [myRequestId, setMyRequestId] = useState<string | null>(null);
  const [isWaitingForMatch, setIsWaitingForMatch] = useState(false);
  const [nearbyRequests, setNearbyRequests] = useState<any[]>([]);
  // Transaction confirmation flow
  const [activeMatch, setActiveMatch] = useState<{ type: 'withdrawal' | 'deposit'; amount: number; partner: string; partnerUserId?: string } | null>(null);
  const [txReference, setTxReference] = useState('');
  const [myConfirmed, setMyConfirmed] = useState(false);
  const [partnerConfirmed, setPartnerConfirmed] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [txFinalized, setTxFinalized] = useState(false);
  // Live match status flow
  const [myLiveStatus, setMyLiveStatus] = useState<'idle' | 'on_the_way' | 'arrived'>('idle');
  const [partnerLiveStatus, setPartnerLiveStatus] = useState<'idle' | 'on_the_way' | 'arrived'>('idle');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDetails, setCancelDetails] = useState('');
  const [matchCancelled, setMatchCancelled] = useState(false);
  // Notifications
  const [notifPermission, setNotifPermission] = useState<NotifPermission>('default');
  const [notifBannerDismissed, setNotifBannerDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('notif_banner_dismissed') === '1';
  });
  const { toast } = useToast();
  const { queue, addRequest, removeRequest, findMatch, getNearbyRequests } = useRequestQueue();

  // List of common bank names in India
  const BANK_NAMES = [
    'State Bank of India (SBI)',
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'Punjab National Bank (PNB)',
    'Bank of Baroda',
    'Canara Bank',
    'Union Bank of India',
    'Bank of India',
    'IndusInd Bank',
    'IDFC First Bank',
    'Yes Bank',
    'Federal Bank',
    'RBL Bank',
    'South Indian Bank',
    'Karur Vysya Bank',
    'City Union Bank',
    'Bandhan Bank',
    'AU Small Finance Bank',
    'Equitas Small Finance Bank'
  ];

  useEffect(() => {
    const fetchMapsKey = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase.functions.invoke('get-maps-key');
        if (error) throw error;
        if (data?.apiKey) setMapsApiKey(data.apiKey);
      } catch (error) {
        console.error('Failed to fetch Maps API key:', error);
      }
    };
    fetchMapsKey();
  }, []);

  // Initial notification permission state
  useEffect(() => {
    setNotifPermission(getNotifPermission());
  }, []);

  const enableNotifications = async () => {
    const result = await requestNotifPermission();
    setNotifPermission(result);
    if (result === 'granted') {
      notify({ title: 'Notifications enabled', body: "You'll be alerted for matches and messages.", tag: 'enabled' });
      toast({ title: '🔔 Notifications enabled' });
    } else if (result === 'denied') {
      toast({ title: 'Notifications blocked', description: 'Enable them in your browser site settings.', variant: 'destructive' });
    } else if (result === 'unsupported') {
      toast({ title: 'Not supported', description: 'Your browser does not support web notifications.', variant: 'destructive' });
    }
  };

  const dismissNotifBanner = () => {
    setNotifBannerDismissed(true);
    try { window.localStorage.setItem('notif_banner_dismissed', '1'); } catch { /* ignore */ }
  };


  // Check for matches periodically
  useEffect(() => {
    if (!myRequestId) return;

    const checkInterval = setInterval(() => {
      const myRequest = queue.find(r => r.id === myRequestId);
      if (!myRequest) return;

      const match = findMatch(myRequest.type, myRequest.amount);
      if (match) {
        handleMatchFound(myRequest, match);
      }
    }, 2000);

    return () => clearInterval(checkInterval);
  }, [myRequestId, queue]);

  // Update nearby requests when queue changes
  useEffect(() => {
    if (isWaitingForMatch && myRequestId) {
      const myRequest = queue.find(r => r.id === myRequestId);
      if (myRequest) {
        const nearby = getNearbyRequests(userLocation.lat, userLocation.lng, myRequest.type);
        setNearbyRequests(nearby);
      }
    }
  }, [queue, isWaitingForMatch, myRequestId]);

  const [userBalance, setUserBalance] = useState<number>(0);
  // Feature 6: Limits & Fees
  const TX_MIN = 500;
  const TX_MAX = 10000;
  const DAILY_LIMIT = 25000;
  const FEE_RATE = 0.005; // 0.5%
  const FEE_MIN = 1;
  const FEE_MAX = 25;
  const computeFee = (amt: number) => {
    if (!amt || amt <= 0) return 0;
    return Math.min(FEE_MAX, Math.max(FEE_MIN, Math.round(amt * FEE_RATE * 100) / 100));
  };
  const [dailyUsed, setDailyUsed] = useState<number>(0);
  const transactions = [
    { id: 1, type: 'deposit', amount: 1000, date: '2024-01-15', status: 'completed' },
    { id: 2, type: 'withdrawal', amount: 500, date: '2024-01-14', status: 'completed' },
    { id: 3, type: 'deposit', amount: 2000, date: '2024-01-13', status: 'completed' },
  ];

  const refreshDailyUsed = async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data: txs } = await supabase
      .from('transactions')
      .select('amount, created_at')
      .eq('user_id', u.user.id)
      .gte('created_at', startOfDay.toISOString());
    const used = (txs || []).reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    setDailyUsed(used);
  };

  // Fetch balance from server (authenticated, RLS-protected)
  useEffect(() => {
    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase.auth.getUser().then(async ({ data }) => {
        if (!data.user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', data.user.id)
          .maybeSingle();
        if (profile) setUserBalance(Number(profile.balance));
        refreshDailyUsed();
      });
    });
  }, []);

  const generateNearbyLocation = (centerLat: number, centerLng: number, distanceKm: number) => {
    // Generate random distance between 2-3 km
    const minDistance = 2;
    const maxDistance = Math.min(distanceKm, 3);
    const randomDistance = minDistance + Math.random() * (maxDistance - minDistance);
    
    // Generate random bearing (angle) in radians
    const bearing = Math.random() * 2 * Math.PI;
    
    // Earth's radius in km
    const R = 6371;
    
    // Convert latitude to radians
    const lat1 = centerLat * Math.PI / 180;
    const lng1 = centerLng * Math.PI / 180;
    
    // Calculate new latitude
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(randomDistance / R) +
      Math.cos(lat1) * Math.sin(randomDistance / R) * Math.cos(bearing)
    );
    
    // Calculate new longitude
    const lng2 = lng1 + Math.atan2(
      Math.sin(bearing) * Math.sin(randomDistance / R) * Math.cos(lat1),
      Math.cos(randomDistance / R) - Math.sin(lat1) * Math.sin(lat2)
    );
    
    // Convert back to degrees
    const newLat = lat2 * 180 / Math.PI;
    const newLng = lng2 * 180 / Math.PI;
    
    return { lat: newLat, lng: newLng };
  };

  const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
    // Only villages actually within 2-3km of Narsipatnam
    const nearbyVillages = [
      'Pedagantyada, Narsipatnam, Anakapalli District',
      'Butchaiah Palem, Narsipatnam, Anakapalli District',
      'Rolugunta, Narsipatnam, Anakapalli District',
      'Narsipatnam Railway Station Area, Anakapalli District',
      'Narsipatnam Bus Stand Area, Anakapalli District',
      'Narsipatnam Market Area, Anakapalli District'
    ];
    
    // If no API key, return a random nearby village
    if (!mapsApiKey) {
      return nearbyVillages[Math.floor(Math.random() * nearbyVillages.length)];
    }
    
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsApiKey}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results.find((r: any) => 
          r.types.includes('locality') || r.types.includes('sublocality')
        ) || data.results[0];
        
        return result.formatted_address;
      }
      // Fallback to nearby village if API fails
      return nearbyVillages[Math.floor(Math.random() * nearbyVillages.length)];
    } catch (error) {
      console.error('Error getting address:', error);
      // Fallback to nearby village on error
      return nearbyVillages[Math.floor(Math.random() * nearbyVillages.length)];
    }
  };

  const requestLocation = async () => {
    // Always use Narsipatnam as base location
    setUserLocation(NARSIPATNAM_COORDS);
    toast({
      title: "Location Set",
      description: "Your location: Narsipatnam, Anakapalli District",
    });
    return true;
  };

  const handleMatchFound = async (myRequest: any, matchedRequest: any) => {
    // Remove both requests from queue
    removeRequest(myRequest.id);
    removeRequest(matchedRequest.id);
    setMyRequestId(null);
    setIsWaitingForMatch(false);

    const waitTime = Math.round((Date.now() - myRequest.timestamp) / 1000);
    
    setMatchedUser(matchedRequest.userName);
    setMatchedUserLocation(matchedRequest.location);
    setShowChat(true);
    // Initialize confirmation flow for this match
    setActiveMatch({
      type: myRequest.type as 'withdrawal' | 'deposit',
      amount: Number(myRequest.amount),
      partner: matchedRequest.userName,
      partnerUserId: matchedRequest.userId,
    });
    setTxReference('');
    setMyConfirmed(false);
    setPartnerConfirmed(false);
    setTxFinalized(false);
    setRatingStars(0);
    setRatingComment('');
    setRatingSubmitted(false);
    setMyLiveStatus('idle');
    setPartnerLiveStatus('idle');
    setMatchCancelled(false);
    setCancelReason('');
    setCancelDetails('');
    
    const messages = [
      {sender: 'Bot', message: `🎉 MATCH FOUND! ${matchedRequest.userName} wants to ${matchedRequest.type === 'withdrawal' ? 'withdraw' : 'deposit'} $${matchedRequest.amount}.`, time: new Date().toLocaleTimeString()},
      {sender: 'Bot', message: `You waited ${waitTime} seconds. ${matchedRequest.userName} is ready now!`, time: new Date().toLocaleTimeString()},
      {sender: 'Bot', message: `📍 ${matchedRequest.userName}'s location: ${matchedRequest.location.address}`, time: new Date().toLocaleTimeString(), location: matchedRequest.location},
      {sender: 'Bot', message: `📍 Your location: Narsipatnam, Anakapalli District`, time: new Date().toLocaleTimeString()},
      {sender: matchedRequest.userName, message: `Hi! I'm ready to ${matchedRequest.type === 'withdrawal' ? 'withdraw' : 'deposit'} $${matchedRequest.amount}. Shall we meet?`, time: new Date().toLocaleTimeString()}
    ];
    
    setChatMessages(messages);
    
    toast({
      title: "🎉 MATCH FOUND!",
      description: `${matchedRequest.userName} is ready! Chat opened.`,
    });
    notify({
      title: '🎉 Match found!',
      body: `${matchedRequest.userName} wants to ${matchedRequest.type} $${matchedRequest.amount}.`,
      tag: 'match-found',
    });

    setTimeout(() => {
      toast({
        title: "💬 New Message",
        description: `${matchedRequest.userName} sent you a message!`,
      });
      notify({
        title: `💬 ${matchedRequest.userName}`,
        body: `Hi! I'm ready to ${matchedRequest.type} $${matchedRequest.amount}.`,
        tag: 'chat-message',
        onlyWhenHidden: true,
      });
    }, 2000);
  };

  const validateAmount = (raw: string, kind: 'withdrawal' | 'deposit'): number | null => {
    const amt = parseFloat(raw);
    if (!raw || isNaN(amt) || amt <= 0) {
      toast({ title: 'Amount Required', description: `Please enter the amount you want to ${kind === 'withdrawal' ? 'withdraw' : 'deposit'}.`, variant: 'destructive' });
      return null;
    }
    if (amt < TX_MIN) {
      toast({ title: 'Below Minimum', description: `Minimum ${kind} amount is $${TX_MIN}.`, variant: 'destructive' });
      return null;
    }
    if (amt > TX_MAX) {
      toast({ title: 'Above Maximum', description: `Maximum per ${kind} is $${TX_MAX}.`, variant: 'destructive' });
      return null;
    }
    if (dailyUsed + amt > DAILY_LIMIT) {
      const remaining = Math.max(0, DAILY_LIMIT - dailyUsed);
      toast({ title: 'Daily Limit Exceeded', description: `Daily limit is $${DAILY_LIMIT}. You have $${remaining} left today.`, variant: 'destructive' });
      return null;
    }
    return amt;
  };

  const handleWithdrawal = async () => {
    const amt = validateAmount(amount, 'withdrawal');
    if (amt === null) return;
    const fee = computeFee(amt);
    if (amt + fee > userBalance) {
      toast({
        title: 'Insufficient Balance',
        description: `Need $${(amt + fee).toFixed(2)} (incl. $${fee} fee). Your balance: $${userBalance}.`,
        variant: 'destructive',
      });
      return;
    }

    await requestLocation();

    const requestAmount = amount;
    setActiveModal(null);
    setAmount('');

    // Check if there's an immediate match
    const match = findMatch('withdrawal', requestAmount);

    if (match) {
      toast({
        title: "🤖 Match Found Instantly!",
        description: `Found ${match.userName} who wants to deposit $${requestAmount}!`,
      });

      setTimeout(() => {
        handleMatchFound(
          {
            type: 'withdrawal',
            amount: requestAmount,
            userName: 'You',
            location: { lat: userLocation.lat, lng: userLocation.lng, address: 'Narsipatnam, Anakapalli District' },
            timestamp: Date.now()
          },
          match
        );
      }, 2000);
    } else {
      // No match - add to queue
      const address = await getAddressFromCoords(userLocation.lat, userLocation.lng);
      const request = await addRequest({
        type: 'withdrawal',
        amount: requestAmount,
        userName: 'You',
        location: { lat: userLocation.lat, lng: userLocation.lng, address }
      });
      if (!request) return;

      setMyRequestId(request.id);
      setIsWaitingForMatch(true);

      toast({
        title: "❌ No Depositors Available",
        description: `No one is ready to deposit $${requestAmount} right now. Waiting for someone...`,
        variant: "destructive",
      });
    }
  };

  const handleDeposit = async () => {
    const amt = validateAmount(amount, 'deposit');
    if (amt === null) return;

    await requestLocation();

    const requestAmount = amount;
    setActiveModal(null);
    setAmount('');

    // Check if there's an immediate match
    const match = findMatch('deposit', requestAmount);

    if (match) {
      toast({
        title: "🤖 Match Found Instantly!",
        description: `Found ${match.userName} who wants to withdraw $${requestAmount}!`,
      });

      setTimeout(() => {
        handleMatchFound(
          {
            type: 'deposit',
            amount: requestAmount,
            userName: 'You',
            location: { lat: userLocation.lat, lng: userLocation.lng, address: 'Narsipatnam, Anakapalli District' },
            timestamp: Date.now()
          },
          match
        );
      }, 2000);
    } else {
      // No match - add to queue
      const address = await getAddressFromCoords(userLocation.lat, userLocation.lng);
      const request = await addRequest({
        type: 'deposit',
        amount: requestAmount,
        userName: 'You',
        location: { lat: userLocation.lat, lng: userLocation.lng, address }
      });
      if (!request) return;

      setMyRequestId(request.id);
      setIsWaitingForMatch(true);

      toast({
        title: "❌ No Withdrawers Available",
        description: `No one is ready to withdraw $${requestAmount} right now. Waiting for someone...`,
        variant: "destructive",
      });
    }
  };

  const handleCancelRequest = () => {
    if (myRequestId) {
      removeRequest(myRequestId);
      setMyRequestId(null);
      setIsWaitingForMatch(false);
      setNearbyRequests([]);
      toast({
        title: "Request Cancelled",
        description: "Your request has been removed from the queue.",
      });
    }
  };

  const handleCheckBalance = async () => {
    // Balance is retrieved server-side via authenticated RLS-protected query.
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast({ title: 'Not signed in', variant: 'destructive' });
      return;
    }
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (error || !profile) {
      toast({ title: 'Failed to load balance', variant: 'destructive' });
      return;
    }
    setUserBalance(Number(profile.balance));
    toast({
      title: 'Current Balance',
      description: `Your account balance is $${Number(profile.balance).toLocaleString()}`,
    });
    setActiveModal(null);
    setPin('');
  };

  const handleAddAccount = async () => {
    if (!accountNumber || !bankName) {
      toast({
        title: "Fields Required",
        description: "Please select bank name and enter account number.",
        variant: "destructive",
      });
      return;
    }

    // Set location automatically
    await requestLocation();

    const newAccount = {
      id: Date.now().toString(),
      bankName,
      accountNumber,
      addedDate: new Date().toLocaleDateString()
    };

    setAddedAccounts(prev => [...prev, newAccount]);

    toast({
      title: "Account Added Successfully",
      description: `${bankName} account ending in ${accountNumber.slice(-4)} has been linked.`,
    });

    setActiveModal(null);
    setAccountNumber('');
    setBankName('');
  };

  const handleRemoveAccount = (accountId: string) => {
    setAddedAccounts(prev => prev.filter(acc => acc.id !== accountId));
    toast({
      title: "Account Removed",
      description: "Bank account has been removed from your profile.",
    });
  };

  const sendMessage = () => {
    if (!currentMessage.trim()) return;
    
    const newMessage = {
      sender: 'You',
      message: currentMessage,
      time: new Date().toLocaleTimeString()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setCurrentMessage('');

    // Simulate reply from matched user
    setTimeout(() => {
      const replies = [
        "Sounds good! I'll be there in 10 minutes.",
        "Perfect! Let me know when you arrive.",
        "Great! I'm already at the location.",
        "Okay, I'll bring the exact amount.",
        "Sure! See you there."
      ];
      
      const reply = {
        sender: matchedUser,
        message: replies[Math.floor(Math.random() * replies.length)],
        time: new Date().toLocaleTimeString()
      };

      setChatMessages(prev => [...prev, reply]);
      notify({
        title: `💬 ${matchedUser}`,
        body: reply.message,
        tag: 'chat-message',
        onlyWhenHidden: true,
      });
    }, 1500);
  };

  const finalizeTransaction = async (ref: string) => {
    if (!activeMatch) return;
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('finalize-transaction', {
        body: {
          type: activeMatch.type,
          amount: activeMatch.amount,
          partner_name: activeMatch.partner,
          reference_id: ref || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newBalance = Number(data.new_balance);
      setUserBalance(newBalance);
      refreshDailyUsed();
      setTxFinalized(true);
      setChatMessages(prev => [...prev, {
        sender: 'Bot',
        message: `✅ Transaction completed! Ref: ${ref || 'N/A'}. New balance: $${newBalance.toLocaleString()}`,
        time: new Date().toLocaleTimeString(),
      }]);
      toast({
        title: '✅ Transaction Completed',
        description: `Balance updated. ${activeMatch.type === 'deposit' ? '+' : '-'}$${activeMatch.amount}`,
      });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Failed to finalize transaction', description: err.message, variant: 'destructive' });
    }
  };

  const handleMyConfirm = () => {
    if (!txReference.trim()) {
      toast({ title: 'Reference required', description: 'Enter the UPI/transaction reference ID first.', variant: 'destructive' });
      return;
    }
    if (myConfirmed) return;
    setMyConfirmed(true);
    setChatMessages(prev => [...prev, {
      sender: 'You',
      message: `✅ I've completed the transaction. Ref: ${txReference}`,
      time: new Date().toLocaleTimeString(),
    }]);
    setTimeout(() => {
      setPartnerConfirmed(true);
      setChatMessages(prev => [...prev, {
        sender: matchedUser,
        message: `✅ Confirmed on my side too!`,
        time: new Date().toLocaleTimeString(),
      }]);
      finalizeTransaction(txReference);
    }, 2000);
  };

  const submitRating = async () => {
    if (!activeMatch?.partnerUserId) {
      toast({ title: 'Partner not identified', variant: 'destructive' });
      return;
    }
    if (ratingStars < 1) {
      toast({ title: 'Please select a star rating', variant: 'destructive' });
      return;
    }
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { error } = await supabase.from('ratings').insert({
        rater_id: userData.user.id,
        rated_user_id: activeMatch.partnerUserId,
        stars: ratingStars,
        comment: ratingComment.trim() || null,
      });
      if (error) throw error;
      setRatingSubmitted(true);
      toast({ title: '⭐ Rating submitted', description: 'Thanks for keeping the community safe!' });
    } catch (err: any) {
      toast({ title: 'Rating failed', description: err.message, variant: 'destructive' });
    }
  };

  const submitReport = async () => {
    if (!activeMatch?.partnerUserId) {
      toast({ title: 'Partner not identified', variant: 'destructive' });
      return;
    }
    if (!reportReason) {
      toast({ title: 'Please select a reason', variant: 'destructive' });
      return;
    }
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { error } = await supabase.from('reports').insert({
        reporter_id: userData.user.id,
        reported_user_id: activeMatch.partnerUserId,
        reason: reportReason,
        details: reportDetails.trim() || null,
      });
      if (error) throw error;
      setShowReportDialog(false);
      setReportReason('');
      setReportDetails('');
      toast({ title: '🚩 Report submitted', description: 'Our team will review this shortly.' });
    } catch (err: any) {
      toast({ title: 'Report failed', description: err.message, variant: 'destructive' });
    }
  };

  // Live match status handlers
  const postSystemMessage = (message: string) => {
    setChatMessages((prev) => [...prev, { sender: 'You', message, time: new Date().toLocaleTimeString() }]);
  };

  const handleOnTheWay = () => {
    if (!activeMatch || matchCancelled) return;
    setMyLiveStatus('on_the_way');
    postSystemMessage(`🚶 I'm on the way to meet you.`);
    toast({ title: 'Status updated', description: "You're marked as on the way." });
    // Simulate partner status after a short delay
    setTimeout(() => {
      setPartnerLiveStatus('on_the_way');
      setChatMessages((prev) => [
        ...prev,
        { sender: matchedUser, message: `🚶 I'm on the way too. See you soon!`, time: new Date().toLocaleTimeString() },
      ]);
    }, 4000);
  };

  const handleArrived = () => {
    if (!activeMatch || matchCancelled) return;
    setMyLiveStatus('arrived');
    postSystemMessage(`📍 I've arrived at the meetup point.`);
    toast({ title: 'Status updated', description: "You're marked as arrived." });
    setTimeout(() => {
      setPartnerLiveStatus('arrived');
      setChatMessages((prev) => [
        ...prev,
        { sender: matchedUser, message: `📍 I just arrived. Let's complete the exchange.`, time: new Date().toLocaleTimeString() },
      ]);
    }, 4000);
  };

  const submitCancelMatch = () => {
    if (!cancelReason) {
      toast({ title: 'Please select a reason', variant: 'destructive' });
      return;
    }
    setMatchCancelled(true);
    setShowCancelDialog(false);
    postSystemMessage(`❌ Match cancelled. Reason: ${cancelReason}${cancelDetails ? ` — ${cancelDetails}` : ''}`);
    toast({ title: 'Match cancelled', description: 'The other user has been notified.', variant: 'destructive' });
  };




  const handleLocationClick = (location: {lat: number, lng: number, address: string}) => {
    setMapLocation(location);
    setShowMap(true);
    setShowAllLocations(false);
  };

  const handleShowAllLocations = () => {
    setShowAllLocations(true);
    setShowMap(true);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in kilometers
    const toRad = (value: number) => (value * Math.PI) / 180;
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance.toFixed(2); // Return distance rounded to 2 decimal places
  };

  const initializeMap = async () => {
    if (!mapRef.current || !mapsApiKey) return;

    const loader = new Loader({
      apiKey: mapsApiKey,
      version: "weekly",
    });

    try {
      const { Map } = await loader.importLibrary("maps");

      if (showAllLocations && userLocation && matchedUserLocation) {
        const bounds = new (window as any).google.maps.LatLngBounds();
        bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
        bounds.extend({ lat: matchedUserLocation.lat, lng: matchedUserLocation.lng });

        const map = new Map(mapRef.current, {
          center: bounds.getCenter(),
          zoom: 13,
        });

        // Standard markers (no Map ID required)
        new (window as any).google.maps.Marker({
          map,
          position: { lat: userLocation.lat, lng: userLocation.lng },
          title: "Your Location",
          label: { text: "You", color: "#fff", fontWeight: "bold" },
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#10b981",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });

        new (window as any).google.maps.Marker({
          map,
          position: { lat: matchedUserLocation.lat, lng: matchedUserLocation.lng },
          title: matchedUserLocation.address,
          label: { text: matchedUser.charAt(0), color: "#fff", fontWeight: "bold" },
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#f59e0b",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });

        // Draw line between locations
        new (window as any).google.maps.Polyline({
          path: [
            { lat: userLocation.lat, lng: userLocation.lng },
            { lat: matchedUserLocation.lat, lng: matchedUserLocation.lng }
          ],
          geodesic: true,
          strokeColor: '#3b82f6',
          strokeOpacity: 0.7,
          strokeWeight: 3,
          map,
        });

        map.fitBounds(bounds);
      } else if (mapLocation) {
        const map = new Map(mapRef.current, {
          center: { lat: mapLocation.lat, lng: mapLocation.lng },
          zoom: 15,
        });

        new (window as any).google.maps.Marker({
          map,
          position: { lat: mapLocation.lat, lng: mapLocation.lng },
          title: mapLocation.address,
        });
      }
    } catch (error) {
      console.error('Error loading Google Maps:', error);
      toast({
        title: "Map Error",
        description: "Unable to load Google Maps. Please enable Maps JavaScript API in your Google Cloud Console.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (showMap) {
      initializeMap();
    }
  }, [showMap, mapLocation, showAllLocations]);

  const renderMap = () => {
    if (!showMap) return null;

    const distance = showAllLocations && userLocation && matchedUserLocation
      ? calculateDistance(userLocation.lat, userLocation.lng, matchedUserLocation.lat, matchedUserLocation.lng)
      : null;

    return (
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="glass-card w-full max-w-2xl rounded-2xl shadow-strong">
          <CardHeader className="flex flex-row items-center justify-between p-5">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {showAllLocations ? 'Both Locations' : `Location: ${mapLocation?.address}`}
              </CardTitle>
              {distance && (
                <p className="text-sm text-muted-foreground mt-1">
                  Distance: <span className="font-semibold text-primary">{distance} km</span>
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => {
              setShowMap(false);
              setShowAllLocations(false);
            }} className="rounded-xl">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <div className="p-0">
            <div ref={mapRef} className="w-full h-96 rounded-b-2xl" />
          </div>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!activeModal) return null;

    return (
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="glass-card w-full max-w-md rounded-2xl shadow-strong">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="flex items-center gap-2">
              {activeModal === 'withdrawal' && <ArrowDownLeft className="w-5 h-5" />}
              {activeModal === 'deposit' && <ArrowUpRight className="w-5 h-5" />}
              {activeModal === 'balance' && <Shield className="w-5 h-5" />}
              {activeModal === 'history' && <History className="w-5 h-5" />}
              {activeModal === 'addAccount' && <Plus className="w-5 h-5" />}
              {activeModal === 'withdrawal' && 'Withdrawal'}
              {activeModal === 'deposit' && 'Deposit'}
              {activeModal === 'balance' && 'Check Balance'}
              {activeModal === 'history' && 'Transaction History'}
              {activeModal === 'addAccount' && 'Add Account'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(activeModal === 'withdrawal' || activeModal === 'deposit') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={activeModal === 'withdrawal' ? handleWithdrawal : handleDeposit}
                    className="flex-1"
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    Find Match
                  </Button>
                  <Button variant="outline" onClick={() => setActiveModal(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}

            {activeModal === 'balance' && (
              <>
                <p className="text-sm text-muted-foreground">
                  Your balance is fetched securely from your account.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleCheckBalance} className="flex-1">
                    Show Balance
                  </Button>
                  <Button variant="outline" onClick={() => setActiveModal(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}

            {activeModal === 'history' && (
              <>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        {transaction.type === 'deposit' ? (
                          <ArrowUpRight className="w-4 h-4 text-success" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-destructive" />
                        )}
                        <div>
                          <p className="font-medium capitalize">{transaction.type}</p>
                          <p className="text-xs text-muted-foreground">{transaction.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${transaction.type === 'deposit' ? 'text-success' : 'text-destructive'}`}>
                          {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{transaction.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" onClick={() => setActiveModal(null)} className="w-full">
                  Close
                </Button>
              </>
            )}

            {activeModal === 'addAccount' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Select value={bankName} onValueChange={setBankName}>
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Select your bank" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {BANK_NAMES.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter account number"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddAccount} className="flex-1">
                    Add Account
                  </Button>
                  <Button variant="outline" onClick={() => setActiveModal(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--gradient-background)' }}>
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none mesh-gradient" />
      <div className="fixed top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px] animate-float pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-accent/10 blur-[100px] animate-float-delayed pointer-events-none" />
      <div className="fixed top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-primary-glow/5 blur-[80px] animate-float pointer-events-none" />

      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 animate-fade-in">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold gradient-text tracking-tight">ATM Dashboard</h1>
              <p className="text-muted-foreground text-sm mt-1">Peer-to-peer money exchange • AI-powered matching</p>
            </div>
            <Button 
              onClick={onLogout} 
              variant="outline" 
              size="sm"
              className="glass border-border/50 hover:border-primary/30 hover:shadow-soft"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Notification permission banner */}
          {notifPermission === 'default' && !notifBannerDismissed && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 backdrop-blur-xl p-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-lg">🔔</div>
                <div>
                  <p className="text-sm font-semibold">Enable notifications</p>
                  <p className="text-xs text-muted-foreground">Get instant alerts when you're matched or receive a message.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={dismissNotifBanner}>Not now</Button>
                <Button size="sm" onClick={enableNotifications}>Enable</Button>
              </div>
            </div>
          )}
          {notifPermission === 'denied' && !notifBannerDismissed && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 backdrop-blur-xl p-4 animate-fade-in">
              <p className="text-xs text-muted-foreground">
                🔕 Notifications are blocked. Enable them in your browser site settings to get match alerts.
              </p>
              <Button size="sm" variant="ghost" onClick={dismissNotifBanner}>Dismiss</Button>
            </div>
          )}



          {/* Balance Card */}
          <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="glass-card p-6 md:p-8 rounded-2xl glow-ring">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">Total Balance</p>
                  <p className="text-4xl md:text-5xl font-bold mt-2 gradient-text">${userBalance.toLocaleString()}</p>
                  <p className="text-muted-foreground text-xs mt-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Narsipatnam, Anakapalli District
                  </p>
                </div>
                <div className="icon-bubble w-16 h-16 rounded-2xl">
                  <DollarSign className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* Pending Request Notification */}
          {isWaitingForMatch && myRequestId && (
            <div className="mb-6 animate-fade-in">
              <div className="glass-card p-4 rounded-2xl border-warning/30" style={{ boxShadow: '0 0 30px -5px hsl(38 92% 50% / 0.15)' }}>
                <div className="flex items-center gap-4">
                  <div className="animate-pulse-glow">
                    <div className="w-12 h-12 rounded-2xl bg-warning/15 flex items-center justify-center">
                      <Bot className="w-6 h-6 text-warning" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      ⏳ Searching for Match...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Looking for someone nearby who wants to match your request...
                    </p>
                    {nearbyRequests.length === 0 ? (
                      <p className="text-xs text-destructive mt-1 font-medium">
                        ❌ No one is ready right now. Still waiting...
                      </p>
                    ) : (
                      <p className="text-xs text-success mt-1 font-medium">
                        ✅ Found {nearbyRequests.length} nearby user(s) - checking for exact match...
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      🔔 You'll get a notification when someone matches!
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleCancelRequest}
                    className="text-muted-foreground hover:text-foreground hover:bg-destructive/10"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Nearby Waiting Users */}
          {isWaitingForMatch && nearbyRequests.length > 0 && (
            <div className="mb-6 animate-fade-in">
              <div className="glass-card p-5 rounded-2xl border-primary/20">
                <h3 className="flex items-center gap-2 text-base font-semibold mb-3">
                  <Users className="w-5 h-5 text-primary" />
                  Nearby Users Waiting ({nearbyRequests.length})
                </h3>
                <div className="space-y-2">
                  {nearbyRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{req.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            Wants to {req.type} ${req.amount} • {req.distance.toFixed(1)}km away
                          </p>
                          <p className="text-xs text-muted-foreground">{req.location.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {Math.round((Date.now() - req.timestamp) / 1000)}s ago
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {[
              { id: 'withdrawal', icon: ArrowDownLeft, label: 'Withdraw', desc: 'Get matched with depositors', gradient: 'from-destructive/80 to-destructive', iconBg: 'bg-destructive/15', iconColor: 'text-destructive', delay: '0.15s' },
              { id: 'deposit', icon: ArrowUpRight, label: 'Deposit', desc: 'Get matched with withdrawers', gradient: 'from-success/80 to-success', iconBg: 'bg-success/15', iconColor: 'text-success', delay: '0.2s' },
              { id: 'history', icon: History, label: 'History', desc: 'View past transactions', gradient: 'from-primary/80 to-primary', iconBg: 'bg-primary/15', iconColor: 'text-primary', delay: '0.25s' },
              { id: 'balance', icon: Shield, label: 'Balance', desc: 'Check account balance', gradient: 'from-warning/80 to-warning', iconBg: 'bg-warning/15', iconColor: 'text-warning', delay: '0.3s' },
              { id: 'addAccount', icon: Plus, label: 'Add Account', desc: 'Link a bank account', gradient: 'from-accent/80 to-accent', iconBg: 'bg-accent/15', iconColor: 'text-accent', delay: '0.35s' },
              { id: 'logout', icon: LogOut, label: 'Logout', desc: 'Sign out securely', gradient: 'from-muted-foreground/80 to-muted-foreground', iconBg: 'bg-muted/50', iconColor: 'text-muted-foreground', delay: '0.4s' },
            ].map((item) => (
              <div
                key={item.id}
                onClick={() => item.id === 'logout' ? onLogout() : setActiveModal(item.id)}
                className="glass-card p-5 rounded-2xl cursor-pointer group animate-slide-up"
                style={{ animationDelay: item.delay }}
              >
                <div className={`w-12 h-12 rounded-2xl ${item.iconBg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className={`w-6 h-6 ${item.iconColor}`} />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{item.label}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Added Bank Accounts Section */}
          {addedAccounts.length > 0 && (
            <div className="animate-fade-in mb-8">
              <div className="glass-card p-5 rounded-2xl">
                <h3 className="flex items-center gap-2 font-semibold mb-4">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Your Bank Accounts ({addedAccounts.length})
                </h3>
                <div className="space-y-3">
                  {addedAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{account.bankName}</p>
                          <p className="text-xs text-muted-foreground">
                            ****{account.accountNumber.slice(-4)} • Added {account.addedDate}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAccount(account.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground pb-8">
            <p>🤖 AI-powered peer-to-peer money exchange within 5km radius</p>
          </div>
        </div>
      </div>

      {renderModal()}
      {renderMap()}

      {/* Chat Window */}
      {showChat && (
        <div className="fixed bottom-4 right-4 w-80 h-[32rem] glass-card rounded-2xl shadow-strong z-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border/50" style={{ background: 'var(--gradient-primary)', borderRadius: 'var(--radius) var(--radius) 0 0' }}>
            <h3 className="font-semibold text-primary-foreground text-sm">Chat with {matchedUser}</h3>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleShowAllLocations}
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 text-xs h-7 px-2"
              >
                <MapPin className="w-3 h-3 mr-1" />
                Map
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowChat(false)}
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 h-7 w-7 p-0"
              >
                ×
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[75%] p-3 rounded-2xl ${
                   msg.sender === 'You' 
                     ? 'bg-primary text-primary-foreground rounded-br-md' 
                     : msg.sender === 'Bot'
                     ? 'bg-muted/60 text-foreground rounded-bl-md'
                     : 'bg-accent/15 text-foreground rounded-bl-md'
                 }`}>
                   <p className="text-sm leading-relaxed">
                     {msg.location && msg.message.includes('📍') ? (
                       <button 
                         onClick={() => handleLocationClick(msg.location!)}
                         className="text-primary hover:text-primary/80 underline underline-offset-2 cursor-pointer"
                       >
                         {msg.message}
                       </button>
                     ) : (
                       msg.message
                     )}
                   </p>
                   <p className="text-[10px] opacity-60 mt-1">{msg.time}</p>
                 </div>
              </div>
            ))}
          </div>

          {activeMatch && !txFinalized && !matchCancelled && (
            <div className="p-3 border-t border-border/50 bg-background/40 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Live Meetup Status
                </p>
                <div className="flex gap-1 text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full ${myLiveStatus === 'arrived' ? 'bg-success/20 text-success' : myLiveStatus === 'on_the_way' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    You: {myLiveStatus === 'idle' ? 'pending' : myLiveStatus === 'on_the_way' ? '🚶 on the way' : '📍 arrived'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full ${partnerLiveStatus === 'arrived' ? 'bg-success/20 text-success' : partnerLiveStatus === 'on_the_way' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {matchedUser.split(' ')[0]}: {partnerLiveStatus === 'idle' ? 'pending' : partnerLiveStatus === 'on_the_way' ? '🚶' : '📍'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleOnTheWay}
                  disabled={myLiveStatus !== 'idle'}
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-xl text-xs h-8"
                >
                  🚶 On the Way
                </Button>
                <Button
                  onClick={handleArrived}
                  disabled={myLiveStatus === 'arrived' || myLiveStatus === 'idle'}
                  size="sm"
                  className="flex-1 rounded-xl text-xs h-8"
                >
                  📍 Arrived
                </Button>
                <Button
                  onClick={() => setShowCancelDialog(true)}
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  ✕ Cancel
                </Button>
              </div>
            </div>
          )}

          {activeMatch && matchCancelled && (
            <div className="p-3 border-t border-border/50 bg-destructive/10">
              <p className="text-xs text-destructive font-medium">❌ This match was cancelled. You can start a new request from the dashboard.</p>
            </div>
          )}

          {activeMatch && !matchCancelled && (
            <div className="p-3 border-t border-border/50 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Confirm Cash Exchange
                </p>
                <div className="flex gap-1 text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full ${myConfirmed ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                    You {myConfirmed ? '✓' : '…'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full ${partnerConfirmed ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {matchedUser.split(' ')[0]} {partnerConfirmed ? '✓' : '…'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {activeMatch.type === 'deposit'
                  ? `Receive $${activeMatch.amount} cash from ${matchedUser}, send via UPI.`
                  : `Hand $${activeMatch.amount} cash to ${matchedUser}, receive via UPI.`}
              </p>
              {!txFinalized ? (
                <div className="flex gap-2">
                  <Input
                    value={txReference}
                    onChange={(e) => setTxReference(e.target.value)}
                    placeholder="UPI / Txn Ref ID"
                    disabled={myConfirmed}
                    className="flex-1 rounded-xl bg-background border-border/50 text-xs h-8"
                  />
                  <Button
                    onClick={handleMyConfirm}
                    disabled={myConfirmed}
                    size="sm"
                    className="rounded-xl text-xs h-8"
                  >
                    {myConfirmed ? 'Waiting…' : 'I Paid / Received'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-success font-medium">✅ Transaction completed and recorded.</p>
                  {!ratingSubmitted ? (
                    <div className="space-y-2 rounded-xl bg-background/60 p-2 border border-border/40">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Rate {matchedUser.split(' ')[0]}
                      </p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setRatingStars(n)}
                            className={`text-lg leading-none transition-transform hover:scale-110 ${
                              n <= ratingStars ? 'text-yellow-400' : 'text-muted-foreground/40'
                            }`}
                            aria-label={`${n} star${n > 1 ? 's' : ''}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <Input
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value.slice(0, 200))}
                        placeholder="Optional comment"
                        className="rounded-xl bg-background border-border/50 text-xs h-8"
                      />
                      <div className="flex gap-2">
                        <Button onClick={submitRating} size="sm" className="flex-1 rounded-xl text-xs h-8">
                          Submit Rating
                        </Button>
                        <Button
                          onClick={() => setShowReportDialog(true)}
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          🚩 Report
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">⭐ Thanks for your feedback.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="p-3 border-t border-border/50">
            <div className="flex gap-2">
              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50 text-sm"
              />
              <Button onClick={sendMessage} size="sm" className="rounded-xl px-4" style={{ background: 'var(--gradient-primary)' }}>
                Send
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report {activeMatch?.partner || 'user'}</DialogTitle>
            <DialogDescription>
              Reports are reviewed by our trust & safety team. False reports may affect your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Reason</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_show">Didn't show up</SelectItem>
                  <SelectItem value="payment_not_received">Payment not received</SelectItem>
                  <SelectItem value="cash_not_received">Cash not received</SelectItem>
                  <SelectItem value="fraud">Suspected fraud / scam</SelectItem>
                  <SelectItem value="harassment">Harassment or abuse</SelectItem>
                  <SelectItem value="unsafe">Felt unsafe during meetup</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Details (optional)</Label>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value.slice(0, 500))}
                placeholder="What happened?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowReportDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReport}>Submit Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel match with {activeMatch?.partner || 'partner'}?</DialogTitle>
            <DialogDescription>
              Let them know why so they can plan. This will end the live meetup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="changed_mind">Changed my mind</SelectItem>
                <SelectItem value="cant_reach">Can't reach the location</SelectItem>
                <SelectItem value="partner_not_responding">Partner not responding</SelectItem>
                <SelectItem value="unsafe_location">Unsafe location</SelectItem>
                <SelectItem value="emergency">Emergency came up</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={cancelDetails}
              onChange={(e) => setCancelDetails(e.target.value.slice(0, 300))}
              placeholder="Optional details (max 300 chars)"
              className="rounded-xl min-h-[70px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCancelDialog(false)}>Keep Match</Button>
            <Button variant="destructive" onClick={submitCancelMatch}>Cancel Match</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ATMDashboard;