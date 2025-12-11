import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeForm, setActiveForm] = useState<'menu' | 'login' | 'register'>('menu');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
    setIsLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginData.email,
      password: loginData.password,
    });

    if (error) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (data.user) {
      toast({
        title: "Login Successful",
        description: `Welcome back!`,
      });
      
      setTimeout(() => {
        requestLocationPermission();
      }, 500);
      
      onLoginSuccess();
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Registration Failed",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (registerData.password.length < 6) {
      toast({
        title: "Registration Failed",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email: registerData.email,
      password: registerData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (data.user) {
      toast({
        title: "Registration Successful",
        description: "Account created! You can now login.",
      });
      setActiveForm('login');
      setLoginData({ email: registerData.email, password: '' });
      setRegisterData({ email: '', password: '', confirmPassword: '' });
    }
    setIsLoading(false);
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
              <input
                type="email"
                placeholder="Email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                required
                className="login-input"
              />
              <input
                type="password"
                placeholder="Password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
                className="login-input"
              />
              <button type="submit" className="login-btn login-btn-primary" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
              <button type="button" className="login-back-btn" onClick={goBack} disabled={isLoading}>
                ⬅ Back
              </button>
            </form>
          )}

          {/* Register Form */}
          {activeForm === 'register' && (
            <form onSubmit={handleRegister} className="auth-form">
              <input
                type="email"
                placeholder="Email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                required
                className="login-input"
              />
              <input
                type="password"
                placeholder="Password (min 6 characters)"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                required
                className="login-input"
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={registerData.confirmPassword}
                onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                required
                className="login-input"
              />
              <button type="submit" className="login-btn login-btn-secondary" disabled={isLoading}>
                {isLoading ? 'Registering...' : 'Register'}
              </button>
              <button type="button" className="login-back-btn" onClick={goBack} disabled={isLoading}>
                ⬅ Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;