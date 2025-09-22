import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeForm, setActiveForm] = useState<'menu' | 'login' | 'register'>('menu');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', email: '', password: '' });
  const { toast } = useToast();

  // Mock users database
  const mockUsers = [
    { username: 'admin', password: 'admin123' },
    { username: 'user', password: 'user123' },
    { username: 'demo', password: 'demo123' },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const user = mockUsers.find(
      u => u.username === loginData.username && u.password === loginData.password
    );

    if (user) {
      toast({
        title: "Login Successful",
        description: `Welcome back, ${loginData.username}!`,
      });
      onLoginSuccess();
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid username or password. Try: admin/admin123",
        variant: "destructive",
      });
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock registration success
    toast({
      title: "Registration Successful",
      description: `Account created for ${registerData.username}. Please login.`,
    });
    
    // Switch to login form after successful registration
    setActiveForm('login');
    setRegisterData({ username: '', email: '', password: '' });
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
                type="text"
                placeholder="Username"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
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
              <button type="submit" className="login-btn login-btn-primary">
                Login
              </button>
              <button type="button" className="login-back-btn" onClick={goBack}>
                ⬅ Back
              </button>
              <div className="demo-info">
                <p>Demo credentials: admin/admin123</p>
              </div>
            </form>
          )}

          {/* Register Form */}
          {activeForm === 'register' && (
            <form onSubmit={handleRegister} className="auth-form">
              <input
                type="text"
                placeholder="Username"
                value={registerData.username}
                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                required
                className="login-input"
              />
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
                placeholder="Password"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                required
                className="login-input"
              />
              <button type="submit" className="login-btn login-btn-secondary">
                Register
              </button>
              <button type="button" className="login-back-btn" onClick={goBack}>
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