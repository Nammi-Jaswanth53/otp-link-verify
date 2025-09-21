import { useState } from 'react';
import VerificationForm from '@/components/VerificationForm';
import ATMDashboard from '@/components/ATMDashboard';

const Index = () => {
  const [isVerified, setIsVerified] = useState(false);

  const handleVerificationSuccess = () => {
    console.log('Verification completed successfully!');
    setIsVerified(true);
  };

  const handleLogout = () => {
    setIsVerified(false);
  };

  if (isVerified) {
    return <ATMDashboard onLogout={handleLogout} />;
  }

  return <VerificationForm onVerificationSuccess={handleVerificationSuccess} />;
};

export default Index;
