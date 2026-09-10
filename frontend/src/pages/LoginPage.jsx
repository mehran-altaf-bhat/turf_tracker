import React, { useState } from 'react';
import aseefLogo from '../assets/aseef-logo.svg';
import { api } from '../services/api';
import { ShieldCheck, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
        const res = await api.signup(name.trim(), email.trim(), password, phone.trim());
        setSuccessMsg(res.message || 'Registration submitted! Please wait for the admin to approve your account before logging in.');
        setIsLogin(true);
        setPassword('');
        setPhone('');
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
            padding: '0.65rem 1.25rem',
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            marginBottom: '1rem',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
          }}>
            <img src={aseefLogo} alt="ASEEF XI Logo" style={{ height: '38px', width: 'auto' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            ASEEF XI
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Weekly Friday Football (8:00 PM – 10:00 PM)
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: '#f1f5f9',
          borderRadius: 'var(--radius-sm)',
          padding: '0.25rem',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-subtle)',
        }}>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: isLogin ? '#ffffff' : 'transparent',
              color: isLogin ? 'var(--text-primary)' : 'var(--text-muted)',
              border: isLogin ? '1px solid #e2e8f0' : 'none',
              boxShadow: isLogin ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              fontWeight: 600,
            }}
            onClick={() => { setIsLogin(true); setError(null); }}
          >
            Log In
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: !isLogin ? '#ffffff' : 'transparent',
              color: !isLogin ? 'var(--text-primary)' : 'var(--text-muted)',
              border: !isLogin ? '1px solid #e2e8f0' : 'none',
              boxShadow: !isLogin ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              fontWeight: 600,
            }}
            onClick={() => { setIsLogin(false); setError(null); }}
          >
            Sign Up
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            color: '#065f46',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
          }}>
            {successMsg}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            color: '#be123c',
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
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="user-name">Full Name *</label>
                <input
                  id="user-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Faisal Rashid"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="user-phone">Phone Number (WhatsApp)</label>
                <input
                  id="user-phone"
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                  Used for match squad rosters and WhatsApp payment reminders
                </span>
              </div>
            </>
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
                <span>{isLogin ? 'Log In to ASEEF XI' : 'Register for ASEEF XI'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
