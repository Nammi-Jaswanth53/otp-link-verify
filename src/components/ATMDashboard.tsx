import React, { useState } from 'react';
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
  Shield
} from 'lucide-react';

interface ATMDashboardProps {
  onLogout: () => void;
}

const ATMDashboard: React.FC<ATMDashboardProps> = ({ onLogout }) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const { toast } = useToast();

  // Mock user data
  const userBalance = 5000;
  const transactions = [
    { id: 1, type: 'deposit', amount: 1000, date: '2024-01-15', status: 'completed' },
    { id: 2, type: 'withdrawal', amount: 500, date: '2024-01-14', status: 'completed' },
    { id: 3, type: 'deposit', amount: 2000, date: '2024-01-13', status: 'completed' },
  ];

  const handleWithdrawal = () => {
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

    toast({
      title: "🤖 Bot Searching",
      description: `Looking for users within 5km who want to deposit $${amount}...`,
    });

    setTimeout(() => {
      toast({
        title: "Match Found!",
        description: "Connected with John D. who wants to deposit the same amount. Check your messages.",
      });
    }, 3000);

    setActiveModal(null);
    setAmount('');
  };

  const handleDeposit = () => {
    if (!amount) {
      toast({
        title: "Amount Required",
        description: "Please enter the amount you want to deposit.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "🤖 Bot Searching",
      description: `Looking for users within 5km who want to withdraw $${amount}...`,
    });

    setTimeout(() => {
      toast({
        title: "Match Found!",
        description: "Connected with Sarah M. who wants to withdraw the same amount. Check your messages.",
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
              {activeModal === 'withdrawal' && 'Withdrawal'}
              {activeModal === 'deposit' && 'Deposit'}
              {activeModal === 'balance' && 'Check Balance'}
              {activeModal === 'history' && 'Transaction History'}
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

          <Card className="hover:shadow-medium transition-smooth cursor-pointer">
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
    </div>
  );
};

export default ATMDashboard;