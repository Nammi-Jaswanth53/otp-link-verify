import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VerificationFormProps {
  onVerificationSuccess?: () => void;
}

const VerificationForm: React.FC<VerificationFormProps> = ({ onVerificationSuccess }) => {
  const [accountNumber, setAccountNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [timeLeft, setTimeLeft] = useState(300);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((p) => p - 1), 1000);
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
      toast({ title: 'Account Number Required', description: 'Please enter your account number.', variant: 'destructive' });
      return false;
    }
    if (!/^\+\d{8,15}$/.test(phoneNumber.trim())) {
      toast({ title: 'Invalid Phone', description: 'Enter phone in E.164 format e.g. +911234567890', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const sendOtp = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: { phone_number: phoneNumber.trim() },
    });
    setIsLoading(false);
    if (error || (data as any)?.error) {
      const msg = (data as any)?.error || error?.message || 'Failed to send OTP';
      toast({ title: 'Send Failed', description: msg, variant: 'destructive' });
      return false;
    }
    toast({ title: 'OTP Sent', description: `Code sent to ${phoneNumber}` });
    return true;
  };

  const handleSendOtp = async () => {
    if (!validateInputs()) return;
    const ok = await sendOtp();
    if (ok) {
      setStep('otp');
      setTimeLeft(300);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({ title: 'Invalid OTP', description: 'Enter the 6-digit code.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke('verify-otp', { body: { code: otp } });
    setIsLoading(false);
    if (error || (data as any)?.error) {
      const msg = (data as any)?.error || error?.message || 'Verification failed';
      toast({ title: 'Verification Failed', description: msg, variant: 'destructive' });
      return;
    }
    toast({ title: 'Verified', description: 'Your account has been verified.' });
    onVerificationSuccess?.();
  };

  const handleResendOtp = async () => {
    const ok = await sendOtp();
    if (ok) setTimeLeft(300);
  };

  const resetForm = () => {
    setStep('input');
    setOtp('');
    setTimeLeft(300);
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
              ? 'Enter your account number and phone number to receive a verification code'
              : `Enter the 6-digit code sent to ${phoneNumber}`}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 'input' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="account">Account Number</Label>
                <Input id="account" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Enter your account number" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+911234567890" className="h-11" />
                <p className="text-xs text-muted-foreground">Include country code (E.164 format)</p>
              </div>
              <Button onClick={handleSendOtp} disabled={isLoading} className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-smooth">
                {isLoading && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" className="h-11 text-center text-lg tracking-widest" maxLength={6} />
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Time remaining: {formatTime(timeLeft)}</span>
              </div>
              <Button onClick={handleVerifyOtp} disabled={isLoading || otp.length !== 6} className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-smooth">
                {isLoading && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              {timeLeft === 0 ? (
                <Button onClick={handleResendOtp} variant="outline" className="w-full h-11">Resend OTP</Button>
              ) : (
                <Button onClick={resetForm} variant="ghost" className="w-full h-11">Back to Account Details</Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationForm;
