import VerificationForm from '@/components/VerificationForm';

const Index = () => {
  const handleVerificationSuccess = () => {
    console.log('Verification completed successfully!');
  };

  return <VerificationForm onVerificationSuccess={handleVerificationSuccess} />;
};

export default Index;
