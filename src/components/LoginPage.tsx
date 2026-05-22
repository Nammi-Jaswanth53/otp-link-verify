import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeForm, setActiveForm] = useState<'menu' | 'login' | 'register' | 'forgot'>('menu');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const requestLocationPermission = () => {
    navigator.geolocation?.getCurrentPosition(
      () => toast({ title: 'Location Enabled', description: 'Location access granted' }),
      () => toast({ title: 'Location Access', description: 'Permission needed to match nearby users', variant: 'destructive' })
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginData.email,
      password: loginData.password,
    });
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password')) {
        toast({ title: 'Wrong Password', description: 'The email or password you entered is incorrect.', variant: 'destructive' });
      } else if (msg.includes('confirm')) {
        toast({ title: 'Email Not Confirmed', description: 'Please confirm your email before logging in.', variant: 'destructive' });
      } else {
        toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
      }
      return;
    }
    toast({ title: 'Login Successful', description: 'Welcome back!' });
    setTimeout(requestLocationPermission, 500);
    onLoginSuccess();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email: registerData.email,
      password: registerData.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { username: registerData.username },
      },
    });
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        toast({ title: 'Already Registered', description: 'This email is already registered. Please login instead.', variant: 'destructive' });
        setActiveForm('login');
        setLoginData({ email: registerData.email, password: '' });
      } else {
        toast({ title: 'Registration Failed', description: error.message, variant: 'destructive' });
      }
      return;
    }

    // Supabase returns success with empty identities array when email already exists (security feature)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      toast({ title: 'Already Registered', description: 'This email is already registered. Please login instead.', variant: 'destructive' });
      setActiveForm('login');
      setLoginData({ email: registerData.email, password: '' });
      return;
    }

    toast({ title: 'Registration Successful', description: `Account created for ${registerData.username}. Please login.` });
    setActiveForm('login');
    setLoginData({ email: registerData.email, password: '' });
    setRegisterData({ username: '', email: '', password: '' });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Reset Failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Email Sent', description: 'Check your inbox for a password reset link.' });
    setActiveForm('login');
    setForgotEmail('');
  };

  const goBack = () => setActiveForm('menu');

  return (
    <div className="min-h-screen flex items-center justify-center login-page-bg">
      <div className="animated-box">
        <div className="box-content">
          {activeForm === 'menu' && (
            <div className="menu-content">
              <button className="login-btn login-btn-primary" onClick={() => setActiveForm('login')}>Login</button>
              <button className="login-btn login-btn-secondary" onClick={() => setActiveForm('register')}>Register</button>
            </div>
          )}

          {activeForm === 'login' && (
            <form onSubmit={handleLogin} className="auth-form">
              <input type="email" placeholder="Email" value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} required className="login-input" />
              <input type="password" placeholder="Password" value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} required className="login-input" />
              <button type="submit" disabled={loading} className="login-btn login-btn-primary">
                {loading ? 'Logging in...' : 'Login'}
              </button>
              <button type="button" className="login-back-btn" onClick={() => setActiveForm('forgot')} style={{ background: 'transparent', border: 'none', color: '#fff', textDecoration: 'underline', cursor: 'pointer', marginTop: '8px' }}>
                Forgot Password?
              </button>
              <button type="button" className="login-back-btn" onClick={goBack}>⬅ Back</button>
            </form>
          )}

          {activeForm === 'register' && (
            <form onSubmit={handleRegister} className="auth-form">
              <input type="text" placeholder="Username" value={registerData.username}
                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })} required className="login-input" />
              <input type="email" placeholder="Email" value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })} required className="login-input" />
              <input type="password" placeholder="Password (min 6 chars)" value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })} required minLength={6} className="login-input" />
              <button type="submit" disabled={loading} className="login-btn login-btn-secondary">
                {loading ? 'Registering...' : 'Register'}
              </button>
              <button type="button" className="login-back-btn" onClick={goBack}>⬅ Back</button>
            </form>
          )}

          {activeForm === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="auth-form">
              <p style={{ color: '#fff', textAlign: 'center', marginBottom: '12px', fontSize: '14px' }}>
                Enter your email and we'll send you a reset link.
              </p>
              <input type="email" placeholder="Email" value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)} required className="login-input" />
              <button type="submit" disabled={loading} className="login-btn login-btn-primary">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button type="button" className="login-back-btn" onClick={() => setActiveForm('login')}>⬅ Back to Login</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
