import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeForm, setActiveForm] = useState<'menu' | 'login' | 'register' | 'reset'>('menu');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const NARSIPATNAM_COORDS = { lat: 17.6667, lng: 82.6167 };

  const requestLocationPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      
      if (result.state === 'granted' || result.state === 'prompt') {
        navigator.geolocation.getCurrentPosition(
          () => {
            toast({
              title: "Location Enabled",
              description: "Location access granted for matching nearby users",
            });
          },
          () => {
            toast({
              title: "Location Access",
              description: "Location permission is needed to match with nearby users",
              variant: "destructive",
            });
          }
        );
      }
    } catch (error) {
      navigator.geolocation.getCurrentPosition(
        () => {
          toast({
            title: "Location Enabled",
            description: "Location access granted for matching nearby users",
          });
        },
        () => {
          toast({
            title: "Location Access",
            description: "Location permission is needed to match with nearby users",
            variant: "destructive",
          });
        }
      );
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) throw error;

      if (data.user) {
        // Update user location
        await supabase
          .from('profiles')
          .update({
            location_lat: NARSIPATNAM_COORDS.lat,
            location_lng: NARSIPATNAM_COORDS.lng
          })
          .eq('id', data.user.id);

        toast({
          title: "Login Successful",
          description: `Welcome back!`,
        });
        
        setTimeout(() => {
          requestLocationPermission();
        }, 500);
        
        onLoginSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid phone number or password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            location_lat: NARSIPATNAM_COORDS.lat,
            location_lng: NARSIPATNAM_COORDS.lng
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      toast({
        title: "Registration Successful",
        description: `Account created! You can now login.`,
      });
      
      setActiveForm('login');
      setRegisterData({ email: '', password: '' });
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) throw error;

      toast({
        title: "Reset Email Sent",
        description: "Check your email for the password reset link",
      });
      
      setActiveForm('login');
      setResetEmail('');
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Could not send reset email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setActiveForm('menu');
  };

  return (
    <div className="min-h-screen flex items-center justify-center login-page-bg">
      <div className="animated-box">
        <div className="box-content">
          {/* Menu Buttons */}
          {activeForm === 'menu' && (
            <div className="menu-content">
              <button 
                className="login-btn login-btn-primary"
                onClick={() => setActiveForm('login')}
              >
                Login
              </button>
              <button 
                className="login-btn login-btn-secondary"
                onClick={() => setActiveForm('register')}
              >
                Register
              </button>
            </div>
          )}

          {/* Login Form */}
          {activeForm === 'login' && (
            <form onSubmit={handleLogin} className="auth-form">
              <div>
                <input
                  type="email"
                  placeholder="Email (e.g., user@example.com)"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                  className="login-input"
                />
                <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                  Valid email format required
                </p>
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  className="login-input"
                />
                <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                  Enter your password
                </p>
              </div>
              <button type="submit" className="login-btn login-btn-primary" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
              <button 
                type="button" 
                className="login-back-btn" 
                onClick={() => setActiveForm('reset')}
                style={{ marginTop: '0.5rem' }}
              >
                Forgot Password?
              </button>
              <button type="button" className="login-back-btn" onClick={goBack}>
                ⬅ Back
              </button>
            </form>
          )}

          {/* Register Form */}
          {activeForm === 'register' && (
            <form onSubmit={handleRegister} className="auth-form">
              <div>
                <input
                  type="email"
                  placeholder="Email (e.g., user@example.com)"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  required
                  className="login-input"
                />
                <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                  Valid email format required
                </p>
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                  minLength={6}
                  className="login-input"
                />
                <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                  • Minimum 6 characters<br/>
                  • Can include letters, numbers, and special characters
                </p>
              </div>
              <button type="submit" className="login-btn login-btn-secondary" disabled={loading}>
                {loading ? 'Registering...' : 'Register'}
              </button>
              <button type="button" className="login-back-btn" onClick={goBack}>
                ⬅ Back
              </button>
            </form>
          )}

          {/* Reset Password Form */}
          {activeForm === 'reset' && (
            <form onSubmit={handleResetPassword} className="auth-form">
              <div>
                <input
                  type="email"
                  placeholder="Email (e.g., user@example.com)"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="login-input"
                />
                <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                  Enter your registered email address
                </p>
              </div>
              <button type="submit" className="login-btn login-btn-primary" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button type="button" className="login-back-btn" onClick={() => setActiveForm('login')}>
                ⬅ Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;