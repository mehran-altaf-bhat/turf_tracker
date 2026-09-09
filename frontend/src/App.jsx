import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import { api, getStoredToken } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

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
        color: 'var(--text-primary)',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        <div style={{ fontSize: '2.5rem' }}>⚽</div>
        <div style={{ fontSize: '1rem', color: 'var(--pitch-green-dark)', fontWeight: 600 }}>
          Loading Elite Turf Tracker...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-layout">
      <Navbar
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="main-content">
        {activeTab === 'admin' && user.role === 'admin' ? (
          <AdminPage />
        ) : (
          <DashboardPage user={user} />
        )}
      </main>

      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: '#ffffff',
        padding: '1.75rem 1.5rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
      }}>
        <div>⚽ <strong>Elite Football Turf</strong> — Every Friday, 8:00 PM to 10:00 PM</div>
        <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          Weekly Football Session Tracker
        </div>
      </footer>
    </div>
  );
}
