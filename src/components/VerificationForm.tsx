import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Clock, RefreshCw } from 'lucide-react';

interface VerificationFormProps {
  onVerificationSuccess?: () => void;
}

const VerificationForm: React.FC<VerificationFormProps> = ({ onVerificationSuccess }) => {
  const [accountNumber, setAccountNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [timeLeft, setTimeLeft] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Mock database of linked accounts
  const linkedAccounts = [
    { account: '1234567890', phone: '+1234567890' },
    { account: '0987654321', phone: '+0987654321' },
    { account: '1122334455', phone: '+1122334455' },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const validateInputs = () => {
    if (!accountNumber.trim()) {
      toast({
        title: "Account Number Required",
        description: "Please enter your account number.",
        variant: "destructive",
      });
      return false;
    }

    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required", 
        description: "Please enter your phone number.",
        variant: "destructive",
      });
      return false;
    }

    const isLinked = linkedAccounts.some(
      (account) => account.account === accountNumber && account.phone === phoneNumber
    );

    if (!isLinked) {
      toast({
        title: "Account Not Linked",
        description: "The account number and phone number are not linked. Please check your details.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSendOtp = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setStep('otp');
    setTimeLeft(60);
    setIsLoading(false);
    
    toast({
      title: "OTP Sent Successfully",
      description: `Verification code sent to ${phoneNumber}`,
    });
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate OTP verification
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Mock verification logic (123456 is the correct OTP)
    if (otp === '123456') {
      toast({
        title: "Verification Successful",
        description: "Your account has been verified successfully!",
      });
      onVerificationSuccess?.();
    } else {
      toast({
        title: "Invalid OTP",
        description: "The OTP entered is incorrect. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  const handleResendOtp = () => {
    setTimeLeft(60);
    toast({
      title: "OTP Resent",
      description: `New verification code sent to ${phoneNumber}`,
    });
  };

  const resetForm = () => {
    setStep('input');
    setAccountNumber('');
    setPhoneNumber('');
    setOtp('');
    setTimeLeft(60);
  };

  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-medium border-0">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {step === 'input' ? 'Account Verification' : 'Enter OTP'}
          </CardTitle>
          <p className="text-muted-foreground">
            {step === 'input' 
              ? 'Please enter your account details to verify your identity'
              : `Enter the 6-digit code sent to ${phoneNumber}`
            }
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {step === 'input' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="account" className="text-sm font-medium">
                  Account Number
                </Label>
                <Input
                  id="account"
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter your account number"
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  className="h-11"
                />
              </div>
              
              <Button
                onClick={handleSendOtp}
                disabled={isLoading}
                className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-smooth"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
              
              <div className="text-xs text-muted-foreground text-center">
                <p>Demo accounts: Account: 1234567890, Phone: +1234567890</p>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-sm font-medium">
                  Verification Code
                </Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="h-11 text-center text-lg tracking-widest"
                  maxLength={6}
                />
              </div>
              
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Time remaining: {formatTime(timeLeft)}</span>
              </div>
              
              <Button
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.length !== 6}
                className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-smooth"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              
              {timeLeft === 0 ? (
                <Button
                  onClick={handleResendOtp}
                  variant="outline"
                  className="w-full h-11"
                >
                  Resend OTP
                </Button>
              ) : (
                <Button
                  onClick={resetForm}
                  variant="ghost"
                  className="w-full h-11"
                >
                  Back to Account Details
                </Button>
              )}
              
              <div className="text-xs text-muted-foreground text-center">
                <p>Demo OTP: 123456</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationForm;