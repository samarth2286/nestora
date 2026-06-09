import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillCredentials = (userEmail, userPass) => {
    setEmail(userEmail);
    setPassword(userPass);
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-panel animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="brand-dot" style={{ display: 'inline-block', marginRight: '8px' }}></span>
            Nes<span className="text-gradient">tora</span>
          </div>
          <p className="auth-subtitle">Elevate Society Management</p>
        </div>

        {error && (
          <div className="auth-error-alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                type="email"
                className="form-input"
                style={{ width: '100%', paddingLeft: '48px' }}
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                type="password"
                className="form-input"
                style={{ width: '100%', paddingLeft: '48px' }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', marginTop: '10px' }}
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Testing Credentials Panel */}
        <div style={{ 
          marginTop: '30px', 
          paddingTop: '20px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.85rem'
        }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '10px', textAlign: 'center', fontWeight: '500' }}>
            Demo User Credentials (Click to fill)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => fillCredentials('admin@nestora.com', 'admin123')}
              style={{ justifyContent: 'space-between', padding: '6px 12px' }}
            >
              <span>Admin Profile</span>
              <code style={{ fontSize: '0.75rem', opacity: 0.8 }}>admin123</code>
            </button>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => fillCredentials('aarav@nestora.com', 'resident123')}
              style={{ justifyContent: 'space-between', padding: '6px 12px' }}
            >
              <span>Resident Profile (Aarav)</span>
              <code style={{ fontSize: '0.75rem', opacity: 0.8 }}>resident123</code>
            </button>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => fillCredentials('ramesh@nestora.com', 'staff123')}
              style={{ justifyContent: 'space-between', padding: '6px 12px' }}
            >
              <span>Security Guard (Ramesh)</span>
              <code style={{ fontSize: '0.75rem', opacity: 0.8 }}>staff123</code>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
