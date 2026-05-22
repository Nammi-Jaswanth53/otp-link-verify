import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase auto-parses the recovery token from URL hash and creates a session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else {
        // wait for hash to be processed
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
        });
        return () => sub.subscription.unsubscribe();
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: 'Reset Failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Password Updated', description: 'You can now login with your new password.' });
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center login-page-bg">
      <div className="animated-box">
        <div className="box-content">
          <form onSubmit={handleSubmit} className="auth-form">
            <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '12px' }}>Reset Password</h2>
            <input type="password" placeholder="New password (min 6 chars)" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={6} className="login-input" />
            <input type="password" placeholder="Confirm new password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required minLength={6} className="login-input" />
            <button type="submit" disabled={loading || !ready} className="login-btn login-btn-primary">
              {loading ? 'Updating...' : ready ? 'Update Password' : 'Loading...'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
