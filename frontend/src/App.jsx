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
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
      <div className="main-wrapper" style={{ background: '#070b12', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header Bar Matching Mockup */}
        <header className="mockup-top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, maxWidth: '520px' }}>
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
              style={{ flexShrink: 0 }}
            >
              <Menu size={20} />
            </button>

            {/* Mockup Global Search Bar */}
            <div className="mockup-search-wrap">
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                className="mockup-search-input"
                placeholder="Search players, matches, or anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="mockup-header-actions">
            {/* Notification Bell with Green Indicator */}
            <button
              type="button"
              className="mockup-notif-btn"
              title="Notifications"
              onClick={() => alert("All caught up! Next match Friday 8:00 PM at Elite Turf.")}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="mockup-notif-dot" />
            </button>

            {/* User Profile Pill with Dropdown */}
            <div style={{ position: 'relative' }}>
              <div
                className="mockup-profile-pill"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                title="Account Menu"
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.25)',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                  color: '#10b981',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'M'}
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc' }}>
                  {user.name}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '1px' }}>
                  ▾
                </span>
              </div>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '120%',
                  right: 0,
                  width: '220px',
                  background: '#0d1422',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 12px 35px rgba(0,0,0,0.6)',
                  padding: '0.5rem',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                }}>
                  <div style={{ padding: '0.5rem 0.65rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>{user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user.email}</div>
                    <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, textTransform: 'capitalize', marginTop: '2px' }}>
                      {user.role} Member
                    </div>
                  </div>

                  {user.role === 'admin' && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setActiveTab('admin'); setUserMenuOpen(false); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '0.5rem 0.65rem',
                          textAlign: 'left',
                          color: '#f8fafc',
                          fontSize: '0.82rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <Shield size={14} color="#fbbf24" />
                        <span>Admin Command Center</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setActiveTab('users'); setUserMenuOpen(false); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '0.5rem 0.65rem',
                          textAlign: 'left',
                          color: '#f8fafc',
                          fontSize: '0.82rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <Shield size={14} color="#60a5fa" />
                        <span>User Management</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0.5rem 0.65rem',
                      textAlign: 'left',
                      color: '#f43f5e',
                      fontSize: '0.82rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="content-body" style={{ padding: '1.5rem 2rem 3rem', flex: 1 }}>
          {activeTab === 'admin' && user.role === 'admin' ? (
            <AdminPage setActiveTab={setActiveTab} />
          ) : activeTab === 'users' && user.role === 'admin' ? (
            <UserManagementPage currentUser={user} />
          ) : (
            <DashboardPage
              user={user}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              globalSearchQuery={searchQuery}
            />
          )}
        </main>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(7, 11, 18, 0.9)',
          padding: '1rem 2rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.78rem',
          marginTop: 'auto',
          backdropFilter: 'blur(10px)',
        }}>
          <div>⚽ <strong style={{ color: 'var(--text-secondary)' }}>Elite Football Turf</strong> — Every Friday, 8:00 PM to 10:00 PM • ASEEF XI</div>
        </footer>
      </div>
    </div>
  );
}
