import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
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
  X
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
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{sender: string, message: string, time: string, location?: {lat: number, lng: number, address: string}}>>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [matchedUser, setMatchedUser] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [matchedUserLocation, setMatchedUserLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapLocation, setMapLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapsApiKey, setMapsApiKey] = useState<string>('');
  const [showAllLocations, setShowAllLocations] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMapsKey = async () => {
      try {
        const response = await fetch('https://htpzmrwvgtucfzgqviov.supabase.co/functions/v1/get-maps-key');
        const data = await response.json();
        if (data.apiKey) {
          setMapsApiKey(data.apiKey);
        }
      } catch (error) {
        console.error('Failed to fetch Maps API key:', error);
      }
    };
    fetchMapsKey();
  }, []);

  // Mock user data
  const userBalance = 5000;
  const transactions = [
    { id: 1, type: 'deposit', amount: 1000, date: '2024-01-15', status: 'completed' },
    { id: 2, type: 'withdrawal', amount: 500, date: '2024-01-14', status: 'completed' },
    { id: 3, type: 'deposit', amount: 2000, date: '2024-01-13', status: 'completed' },
  ];

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
    if (!mapsApiKey) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsApiKey}`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Try to find a locality (village/town) or use the formatted address
        const result = data.results.find((r: any) => 
          r.types.includes('locality') || r.types.includes('sublocality')
        ) || data.results[0];
        
        return result.formatted_address;
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Error getting address:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive",
      });
      return false;
    }

    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          toast({
            title: "Location Enabled",
            description: "Your location has been shared for matching.",
          });
          resolve(true);
        },
        (error) => {
          toast({
            title: "Location Access Denied",
            description: "Please enable location access to find nearby matches.",
            variant: "destructive",
          });
          resolve(false);
        }
      );
    });
  };

  const handleWithdrawal = async () => {
    if (!amount) {
      toast({
        title: "Amount Required",
        description: "Please enter the amount you want to withdraw.",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(amount) > userBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance for this withdrawal.",
        variant: "destructive",
      });
      return;
    }

    const locationEnabled = await requestLocation();
    if (!locationEnabled) return;

    toast({
      title: "🤖 Bot Searching",
      description: `Looking for users within 3km who want to deposit $${amount}...`,
    });

    setTimeout(async () => {
      if (!userLocation) return;
      
      const nearbyCoords = generateNearbyLocation(userLocation.lat, userLocation.lng, 3);
      const address = await getAddressFromCoords(nearbyCoords.lat, nearbyCoords.lng);
      const mockLocation = { ...nearbyCoords, address };
      
      setMatchedUser('John D.');
      setMatchedUserLocation(mockLocation);
      setShowChat(true);
      setChatMessages([
        {sender: 'Bot', message: `Match found! John D. wants to deposit $${amount}.`, time: new Date().toLocaleTimeString()},
        {sender: 'Bot', message: `📍 John D.'s location: ${mockLocation.address}`, time: new Date().toLocaleTimeString(), location: mockLocation},
        {sender: 'Bot', message: `📍 Your location has been shared with John D.`, time: new Date().toLocaleTimeString()},
        {sender: 'John D.', message: 'Hi! I have the cash ready for deposit. I can see your location. Shall we meet?', time: new Date().toLocaleTimeString()}
      ]);
      toast({
        title: "Match Found!",
        description: "Connected with John D. Locations shared!",
      });
    }, 3000);

    setActiveModal(null);
    setAmount('');
  };

  const handleDeposit = async () => {
    if (!amount) {
      toast({
        title: "Amount Required",
        description: "Please enter the amount you want to deposit.",
        variant: "destructive",
      });
      return;
    }

    const locationEnabled = await requestLocation();
    if (!locationEnabled) return;

    toast({
      title: "🤖 Bot Searching",
      description: `Looking for users within 3km who want to withdraw $${amount}...`,
    });

    setTimeout(async () => {
      if (!userLocation) return;
      
      const nearbyCoords = generateNearbyLocation(userLocation.lat, userLocation.lng, 3);
      const address = await getAddressFromCoords(nearbyCoords.lat, nearbyCoords.lng);
      const mockLocation = { ...nearbyCoords, address };
      
      setMatchedUser('Sarah M.');
      setMatchedUserLocation(mockLocation);
      setShowChat(true);
      setChatMessages([
        {sender: 'Bot', message: `Match found! Sarah M. wants to withdraw $${amount}.`, time: new Date().toLocaleTimeString()},
        {sender: 'Bot', message: `📍 Sarah M.'s location: ${mockLocation.address}`, time: new Date().toLocaleTimeString(), location: mockLocation},
        {sender: 'Bot', message: `📍 Your location has been shared with Sarah M.`, time: new Date().toLocaleTimeString()},
        {sender: 'Sarah M.', message: 'Hello! I need to withdraw this amount. I can see your location. Can we meet at the nearest ATM?', time: new Date().toLocaleTimeString()}
      ]);
      toast({
        title: "Match Found!",
        description: "Connected with Sarah M. Locations shared!",
      });
    }, 3000);

    setActiveModal(null);
    setAmount('');
  };

  const handleCheckBalance = () => {
    if (pin !== '1234') {
      toast({
        title: "Invalid PIN",
        description: "Please enter the correct PIN.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Current Balance",
      description: `Your account balance is $${userBalance.toLocaleString()}`,
    });

    setActiveModal(null);
    setPin('');
  };

  const handleAddAccount = async () => {
    if (!accountNumber || !bankName) {
      toast({
        title: "Fields Required",
        description: "Please enter both account number and bank name.",
        variant: "destructive",
      });
      return;
    }

    // Request location permission when adding account
    toast({
      title: "Location Required",
      description: "Please enable location access to find nearby matches for transactions.",
    });
    
    const locationEnabled = await requestLocation();
    if (!locationEnabled) {
      toast({
        title: "Account Adding Paused",
        description: "Location access is needed for peer-to-peer transactions. Please try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Account Added Successfully",
      description: `${bankName} account ending in ${accountNumber.slice(-4)} has been linked with location enabled.`,
    });

    setActiveModal(null);
    setAccountNumber('');
    setBankName('');
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
    }, 1500);
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
      const { AdvancedMarkerElement } = await loader.importLibrary("marker");

      if (showAllLocations && userLocation && matchedUserLocation) {
        // Show both locations
        const bounds = new (window as any).google.maps.LatLngBounds();
        bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
        bounds.extend({ lat: matchedUserLocation.lat, lng: matchedUserLocation.lng });

        const map = new Map(mapRef.current, {
          center: bounds.getCenter(),
          zoom: 13,
          mapId: "DEMO_MAP_ID",
        });

        // Create marker for your location
        const yourMarkerContent = document.createElement('div');
        yourMarkerContent.innerHTML = `
          <div style="background: #10b981; color: white; padding: 8px 12px; border-radius: 8px; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            📍 You
          </div>
        `;
        
        new AdvancedMarkerElement({
          map: map,
          position: { lat: userLocation.lat, lng: userLocation.lng },
          content: yourMarkerContent,
          title: "Your Location",
        });

        // Create marker for matched user
        const matchedMarkerContent = document.createElement('div');
        matchedMarkerContent.innerHTML = `
          <div style="background: #f59e0b; color: white; padding: 8px 12px; border-radius: 8px; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            📍 ${matchedUser}
          </div>
        `;
        
        new AdvancedMarkerElement({
          map: map,
          position: { lat: matchedUserLocation.lat, lng: matchedUserLocation.lng },
          content: matchedMarkerContent,
          title: matchedUserLocation.address,
        });

        // Draw line between locations
        const line = new (window as any).google.maps.Polyline({
          path: [
            { lat: userLocation.lat, lng: userLocation.lng },
            { lat: matchedUserLocation.lat, lng: matchedUserLocation.lng }
          ],
          geodesic: true,
          strokeColor: '#3b82f6',
          strokeOpacity: 0.7,
          strokeWeight: 3,
          map: map,
        });

        map.fitBounds(bounds);
      } else if (mapLocation) {
        // Show single location
        const map = new Map(mapRef.current, {
          center: { lat: mapLocation.lat, lng: mapLocation.lng },
          zoom: 15,
          mapId: "DEMO_MAP_ID",
        });

        new AdvancedMarkerElement({
          map: map,
          position: { lat: mapLocation.lat, lng: mapLocation.lng },
          title: mapLocation.address,
        });
      }
    } catch (error) {
      console.error('Error loading Google Maps:', error);
      toast({
        title: "Map Error",
        description: "Unable to load Google Maps. Please check your internet connection.",
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
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
            }}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div ref={mapRef} className="w-full h-96 rounded-b-lg" />
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderModal = () => {
    if (!activeModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md">
          <CardHeader>
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
                <div className="space-y-2">
                  <Label htmlFor="pin">Enter PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter your PIN"
                    maxLength={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCheckBalance} className="flex-1">
                    Check Balance
                  </Button>
                  <Button variant="outline" onClick={() => setActiveModal(null)}>
                    Cancel
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">Demo PIN: 1234</p>
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
                  <Input
                    id="bankName"
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Enter bank name"
                  />
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
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">ATM Dashboard</h1>
          <Button onClick={onLogout} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:shadow-medium transition-smooth cursor-pointer" onClick={() => setActiveModal('withdrawal')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                <ArrowDownLeft className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-lg">Withdrawal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Request money and get connected with nearby depositors
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-smooth cursor-pointer" onClick={() => setActiveModal('deposit')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-2">
                <ArrowUpRight className="w-6 h-6 text-success" />
              </div>
              <CardTitle className="text-lg">Deposit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Offer money and get connected with nearby withdrawers
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-smooth cursor-pointer" onClick={() => setActiveModal('history')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <History className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                View all your past transactions and transfers
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-smooth cursor-pointer" onClick={() => setActiveModal('balance')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mb-2">
                <DollarSign className="w-6 h-6 text-warning" />
              </div>
              <CardTitle className="text-lg">Check Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Securely view your current account balance
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-smooth cursor-pointer" onClick={() => setActiveModal('addAccount')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-2">
                <Plus className="w-6 h-6 text-accent-foreground" />
              </div>
              <CardTitle className="text-lg">Add Account</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Link a new bank account to your profile
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-medium transition-smooth cursor-pointer" onClick={onLogout}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-muted/10 rounded-full flex items-center justify-center mb-2">
                <LogOut className="w-6 h-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg">Logout</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Securely sign out of your account
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>🤖 AI-powered peer-to-peer money exchange within 5km radius</p>
        </div>
      </div>

      {renderModal()}
      {renderMap()}

      {/* Chat Window */}
      {showChat && (
        <div className="fixed bottom-4 right-4 w-80 h-[32rem] bg-background border rounded-lg shadow-lg z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Chat with {matchedUser}</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleShowAllLocations}
                className="text-xs"
              >
                <MapPin className="w-3 h-3 mr-1" />
                View Map
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowChat(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[70%] p-3 rounded-lg ${
                   msg.sender === 'You' 
                     ? 'bg-primary text-primary-foreground' 
                     : msg.sender === 'Bot'
                     ? 'bg-accent text-accent-foreground'
                     : 'bg-muted text-muted-foreground'
                 }`}>
                   <p className="text-sm">
                     {msg.location && msg.message.includes('📍') ? (
                       <button 
                         onClick={() => handleLocationClick(msg.location!)}
                         className="text-blue-500 hover:text-blue-700 underline cursor-pointer"
                       >
                         {msg.message}
                       </button>
                     ) : (
                       msg.message
                     )}
                   </p>
                   <p className="text-xs opacity-70 mt-1">{msg.time}</p>
                 </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} size="sm">
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ATMDashboard;