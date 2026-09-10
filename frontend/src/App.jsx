import React, { useState, useEffect } from 'react';
import aseefLogo from './assets/aseef-logo.svg';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import UserManagementPage from './pages/UserManagementPage';
import { api, getStoredToken } from './services/api';
import { Shield, CheckCircle2, Clock, Menu } from 'lucide-react';

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
        background: '#ffffff',
        color: '#0f172a',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        <img src={aseefLogo} alt="ASEEF XI" style={{ height: '48px', width: 'auto' }} />
        <div style={{ fontSize: '1.05rem', color: '#059669', fontWeight: 700, letterSpacing: '0.02em' }}>
          Loading ASEEF XI...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const getPageHeader = () => {
    switch (activeTab) {
      case 'admin':
        return {
          title: 'Admin Command Center',
          subtitle: 'Manage turf sessions, verify player payments, and curate match squads',
        };
      case 'users':
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
              <Clock size={14} color="#059669" />
              <span>Friday 8:00 PM – 10:00 PM</span>
            </div>

            {user.role === 'admin' && activeTab !== 'admin' && activeTab !== 'users' && (
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
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
          {activeTab === 'admin' && user.role === 'admin' ? (
            <AdminPage setActiveTab={setActiveTab} />
          ) : activeTab === 'users' && user.role === 'admin' ? (
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
          borderTop: '1px solid #eaecf0',
          background: '#ffffff',
          padding: '1.25rem 2rem',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.82rem',
          marginTop: 'auto',
        }}>
          <div>⚽ <strong>Elite Football Turf</strong> — Every Friday, 8:00 PM to 10:00 PM</div>
          <div style={{ marginTop: '0.2rem', color: '#94a3b8', fontSize: '0.75rem' }}>
            Weekly Football Session & Attendance Tracker
          </div>
        </footer>
      </div>
    </div>
  );
}
