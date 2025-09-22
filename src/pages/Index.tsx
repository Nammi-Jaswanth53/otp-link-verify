import { useState } from 'react';
import LoginPage from '@/components/LoginPage';
import VerificationForm from '@/components/VerificationForm';
import ATMDashboard from '@/components/ATMDashboard';

const Index = () => {
  const [currentStep, setCurrentStep] = useState<'login' | 'verification' | 'dashboard'>('login');

  const handleLoginSuccess = () => {
    console.log('Login successful! Moving to verification...');
    setCurrentStep('verification');
  };

  const handleVerificationSuccess = () => {
    console.log('Verification completed successfully!');
    setCurrentStep('dashboard');
  };

  const handleLogout = () => {
    setCurrentStep('login');
  };

  // Login Page
  if (currentStep === 'login') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Verification Form
  if (currentStep === 'verification') {
    return <VerificationForm onVerificationSuccess={handleVerificationSuccess} />;
  }

  // ATM Dashboard
  return <ATMDashboard onLogout={handleLogout} />;
};

export default Index;
