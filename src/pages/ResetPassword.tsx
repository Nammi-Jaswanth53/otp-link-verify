import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true);
        setVerifying(false);
        setErrorMsg(null);
      }
    });

    (async () => {
      try {
        const url = new URL(window.location.href);
        const hash = window.location.hash || '';
        const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

        const code = url.searchParams.get('code');
        const hasImplicit = hashParams.get('access_token') && hashParams.get('refresh_token');
        const hasRecovery = code || hasImplicit;

        // Sign out any existing session so the recovery session takes over cleanly.
        // Without this, an already-logged-in user hits "reauthentication required" on updateUser.
        if (hasRecovery) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        }

        // 1) PKCE flow: ?code=...
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
        }
        // 2) Implicit flow: #access_token=...&refresh_token=...
        else if (hasImplicit) {
          const { error } = await supabase.auth.setSession({
            access_token: hashParams.get('access_token')!,
            refresh_token: hashParams.get('refresh_token')!,
          });
          if (error) throw error;
        }
        // 3) Error in URL (expired link, etc.)
        else if (hashParams.get('error') || url.searchParams.get('error')) {
          const desc = hashParams.get('error_description') || url.searchParams.get('error_description') || 'Reset link is invalid or has expired.';
          throw new Error(decodeURIComponent(desc.replace(/\+/g, ' ')));
        }


        // Clean URL
        if (code || hash) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Confirm session exists
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session) {
          setReady(true);
          setVerifying(false);
        } else {
          setTimeout(() => {
            if (!mounted) return;
            setVerifying(false);
            setReady((r) => {
              if (!r) setErrorMsg('Could not verify reset link. Please request a new password reset email.');
              return r;
            });
          }, 1500);
        }

        } else {
          // Wait briefly for onAuthStateChange to fire
          setTimeout(() => {
            if (!mounted) return;
            setVerifying(false);
            if (!ready) {
              setErrorMsg('Could not verify reset link. Please request a new password reset email.');
            }
          }, 1500);
        }
      } catch (e: any) {
        if (!mounted) return;
        setVerifying(false);
        setErrorMsg(e.message || 'Reset link is invalid or has expired.');
      }
    })();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
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

            {errorMsg && (
              <div style={{ color: '#ffb4b4', background: 'rgba(255,0,0,0.1)', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '8px', textAlign: 'center' }}>
                {errorMsg}
                <button type="button" onClick={() => navigate('/')} style={{ display: 'block', margin: '8px auto 0', background: 'transparent', color: '#fff', textDecoration: 'underline', border: 'none', cursor: 'pointer' }}>
                  Back to login
                </button>
              </div>
            )}

            <input type="password" placeholder="New password (min 6 chars)" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={6} className="login-input" disabled={!ready} />
            <input type="password" placeholder="Confirm new password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required minLength={6} className="login-input" disabled={!ready} />
            <button type="submit" disabled={loading || !ready} className="login-btn login-btn-primary">
              {loading ? 'Updating...' : verifying ? 'Verifying link...' : ready ? 'Update Password' : 'Link invalid'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
