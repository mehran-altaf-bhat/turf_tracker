import React, { useState, useEffect } from 'react';
import aseefLogo from './assets/aseef-logo.svg';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import UserManagementPage from './pages/UserManagementPage';
import { api, getStoredToken } from './services/api';
import { Shield, Menu, Sun, Moon } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [matchSlotText, setMatchSlotText] = useState('Friday Match');
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('turf_theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('turf_theme', theme);
    } catch (e) {}
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        const cfg = await api.getPaymentConfig();
        if (isMounted && cfg?.turf_slot) {
          setMatchSlotText(cfg.turf_slot);
        }
      } catch (err) {
        // Silently continue
      }
    };
    fetchConfig();

    const handleSlotUpdate = (e) => {
      if (e.detail?.turf_slot) {
        setMatchSlotText(e.detail.turf_slot);
      }
    };
    window.addEventListener('turf_slot_updated', handleSlotUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('turf_slot_updated', handleSlotUpdate);
    };
  }, []);


  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        if (res.user) {
          setUser(res.user);
          if (res.user.role === 'admin') {
            setActiveTab('admin');
          }
        }
      } catch (err) {
        console.warn('Session expired or invalid:', err.message);
        api.logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Poll for pending player approvals if current user is admin
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    let isMounted = true;
    const fetchPendingCount = async () => {
      try {
        const res = await api.getUsers();
        if (isMounted && res && typeof res.pending_count === 'number') {
          setPendingApprovalsCount(res.pending_count);
        }
      } catch (err) {
        // Silently continue if network fails
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, activeTab]);

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setActiveTab('dashboard');
    setMobileMenuOpen(false);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    if (userData.role === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('dashboard');
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px',
          height: '80px',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(34, 197, 94, 0.3)',
            borderTopColor: 'var(--green-500)',
            animation: 'spinLoader 0.8s linear infinite',
          }} />
          <img src={aseefLogo} alt="ASEEF XI" style={{ height: '42px', width: 'auto', borderRadius: '8px' }} />
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
          Loading ASEEF XI...
        </div>
        <style>{`@keyframes spinLoader { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} theme={theme} onToggleTheme={toggleTheme} />;
  }

  const getPageHeader = () => {
    switch (activeTab) {
      case 'admin':
      case 'admin_command':
        return {
          title: 'Admin Command Center',
          subtitle: 'Manage turf sessions, verify player payments, and curate match squads',
        };
      case 'users':
      case 'user_approvals':
        return {
          title: 'User & Player Management',
          subtitle: 'Directory of registered players, contact numbers, roles, and match contributions',
        };
      case 'squad':
        return {
          title: 'Squad & Match Lineup',
          subtitle: 'Active players attending vs members not playing this Friday',
        };
      case 'history':
        return {
          title: 'Payment History',
          subtitle: 'Completed and rejected transaction logs',
        };
      case 'schedule':
        return {
          title: 'Match Schedule',
          subtitle: 'Upcoming Friday sessions at Elite Football Turf (8:00 PM – 10:00 PM)',
        };
      case 'dashboard':
      default:
        return {
          title: 'Match Hub',
          subtitle: 'Weekly Friday check-in, squad attendance and payment status',
        };
    }
  };

  const { title, subtitle } = getPageHeader();

  return (
    <div className="clokin-app-layout">
      {/* Sidebar with Mobile Drawer support */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        pendingCount={pendingApprovalsCount}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Top Header Bar */}
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* 3-Lines Hamburger Menu Button on Mobile */}
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <h1 className="page-title">{title}</h1>
              <p className="page-subtitle">{subtitle}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="header-status-pill">
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green-500)', display: 'inline-block', flexShrink: 0 }} className="pulse-dot" />
              <span>{matchSlotText}</span>
            </div>

            {/* Dark / Light Theme Toggle */}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark/light theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={15} className="sun-icon" />
                  <span className="theme-toggle-label">Light</span>
                </>
              ) : (
                <>
                  <Moon size={15} className="moon-icon" />
                  <span className="theme-toggle-label">Dark</span>
                </>
              )}
            </button>

            {user.role === 'admin' && activeTab !== 'admin' && activeTab !== 'users' && (
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: 'var(--amber-400)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '9999px',
                }}
                onClick={() => setActiveTab('admin')}
              >
                <Shield size={14} />
                <span>Admin Console</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="content-body">
          {(activeTab === 'admin' || activeTab === 'admin_command') && user.role === 'admin' ? (
            <AdminPage setActiveTab={setActiveTab} />
          ) : (activeTab === 'users' || activeTab === 'user_approvals') && user.role === 'admin' ? (
            <UserManagementPage currentUser={user} />
          ) : (
            <DashboardPage
              user={user}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          )}
        </main>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid var(--border-dim)',
          background: 'rgba(10, 15, 30, 0.6)',
          padding: '1rem 2rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.78rem',
          marginTop: 'auto',
          backdropFilter: 'blur(10px)',
        }}>
          <div>⚽ <strong style={{ color: 'var(--text-secondary)' }}>Elite Football Turf</strong> — {matchSlotText}</div>
        </footer>
      </div>
    </div>
  );
}
