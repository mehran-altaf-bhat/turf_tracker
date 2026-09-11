import React, { useState, useEffect } from 'react';
import aseefLogo from './assets/aseef-logo.svg';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import UserManagementPage from './pages/UserManagementPage';
import { api, getStoredToken } from './services/api';
import { Shield, Menu } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="header-status-pill">
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green-500)', display: 'inline-block', flexShrink: 0 }} className="pulse-dot" />
              <span>Friday 8:00 PM – 10:00 PM</span>
            </div>

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
          <div>⚽ <strong style={{ color: 'var(--text-secondary)' }}>Elite Football Turf</strong> — Every Friday, 8:00 PM to 10:00 PM</div>
        </footer>
      </div>
    </div>
  );
}
