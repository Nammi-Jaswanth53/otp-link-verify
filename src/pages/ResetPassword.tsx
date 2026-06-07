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
    // Listen for auth events first so we don't miss PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION'))) {
        setReady(true);
      }
    });

    // Also check current session immediately (covers case where session already exists)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    // Fallback: if URL hash contains a recovery token, enable the form so user can submit.
    // Supabase will have processed the hash and created a session by the time they submit.
    const hash = window.location.hash || '';
    if (hash.includes('type=recovery') || hash.includes('access_token=')) {
      // Give supabase a moment to process the hash
      const t = setTimeout(() => setReady(true), 800);
      return () => {
        clearTimeout(t);
        sub.subscription.unsubscribe();
      };
    }

    return () => sub.subscription.unsubscribe();
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
            <button type="submit" disabled={loading} className="login-btn login-btn-primary">
              {loading ? 'Updating...' : !ready ? 'Preparing...' : 'Update Password'}
            </button>
            {!ready && (
              <p style={{ color: '#fff', textAlign: 'center', fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
                Verifying reset link... you can start typing your new password.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
