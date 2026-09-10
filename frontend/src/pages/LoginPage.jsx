import React, { useState } from 'react';
import aseefLogo from '../assets/aseef-logo.svg';
import { api } from '../services/api';
import { AlertCircle, ArrowRight, Loader2, CheckCircle, User, Mail, Lock, Phone } from 'lucide-react';

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
        setSuccessMsg(res.message || 'Registration submitted! Please wait for admin approval before logging in.');
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

  const switchTab = (toLogin) => {
    setIsLogin(toLogin);
    setError(null);
    setSuccessMsg(null);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="login-logo-wrap">
            <img src={aseefLogo} alt="ASEEF XI Logo" style={{ height: '36px', width: 'auto' }} />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.85rem',
            fontWeight: 900,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            marginBottom: '0.3rem',
          }}>
            ASEEF XI
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>
            ⚽ Friday Football · 8:00 PM – 10:00 PM
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab-btn ${isLogin ? 'active' : ''}`}
            onClick={() => switchTab(true)}
          >
            Log In
          </button>
          <button
            type="button"
            className={`login-tab-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => switchTab(false)}
          >
            Sign Up
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="login-alert-success">
            <CheckCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="login-alert-error">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="user-name">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <User size={13} /> Full Name *
                  </span>
                </label>
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
                <label className="form-label" htmlFor="user-phone">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={13} /> WhatsApp Number
                  </span>
                </label>
                <input
                  id="user-phone"
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                  Used for squad rosters and WhatsApp payment reminders
                </span>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="user-email">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={13} /> Email Address
              </span>
            </label>
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
            <label className="form-label" htmlFor="user-password">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={13} /> Password
              </span>
            </label>
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
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.8rem 1.5rem', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} />
                <span>Please wait...</span>
              </>
            ) : (
              <>
                <span>{isLogin ? 'Log In to ASEEF XI' : 'Register for ASEEF XI'}</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        {!isLogin && (
          <p style={{
            textAlign: 'center',
            marginTop: '1.25rem',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}>
            After signing up, an admin will review and approve your account before you can log in.
          </p>
        )}

        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border-dim)',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}>
          🏟️ Elite Football Turf · Every Friday Night
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
