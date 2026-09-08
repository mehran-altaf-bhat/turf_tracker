import React, { useState } from 'react';
import { api } from '../services/api';
import { ShieldCheck, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        const data = await api.login(email.trim(), password);
        onLoginSuccess(data.user);
      } else {
        const res = await api.signup(name.trim(), email.trim(), password);
        setSuccessMsg(res.message || 'Account created successfully! Please log in.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div className="card highlight" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '2.5rem 2rem',
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, var(--pitch-green), var(--pitch-green-dark))',
            borderRadius: '16px',
            fontSize: '1.75rem',
            marginBottom: '1rem',
            boxShadow: '0 0 25px var(--pitch-glow)',
          }}>
            ⚽
          </div>
          <h1 style={{ fontSize: '1.65rem', marginBottom: '0.35rem' }}>Elite Turf Tracker</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Weekly Friday Football (8:00 PM - 10:00 PM)
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.3rem',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-subtle)',
        }}>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: isLogin ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: isLogin ? '#fff' : 'var(--text-muted)',
              border: isLogin ? '1px solid var(--border-accent)' : 'none',
            }}
            onClick={() => { setIsLogin(true); setError(null); }}
          >
            Log In
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: !isLogin ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: !isLogin ? '#fff' : 'var(--text-muted)',
              border: !isLogin ? '1px solid var(--border-accent)' : 'none',
            }}
            onClick={() => { setIsLogin(false); setError(null); }}
          >
            Sign Up
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            color: '#34d399',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
          }}>
            {successMsg}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            color: '#fca5a5',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label" htmlFor="user-name">Full Name</label>
              <input
                id="user-name"
                type="text"
                className="form-input"
                placeholder="e.g. Mehran Bhat"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="user-email">Email Address</label>
            <input
              id="user-email"
              type="email"
              className="form-input"
              placeholder="e.g. yourname@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="user-password">Password</label>
            <input
              id="user-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Please wait...' : (
              <>
                <span>{isLogin ? 'Log In to Turf Tracker' : 'Create Player Account'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
