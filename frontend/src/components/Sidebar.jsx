import React from 'react';
import aseefLogo from '../assets/aseef-logo.svg';
import {
  ClipboardCheck,
  Users,
  CreditCard,
  Calendar,
  Shield,
  LogOut,
  UserCheck,
  X,
  Sun,
  Moon,
} from 'lucide-react';

export default function Sidebar({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  mobileOpen = false,
  onClose,
  pendingCount = 0,
  theme = 'dark',
  onToggleTheme,
}) {
  if (!user) return null;
  const isAdmin = user.role === 'admin';

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    if (onClose) onClose();
  };

  const navItems = isAdmin
    ? [
        { id: 'admin', label: 'Admin Command', icon: Shield },
        { id: 'users', label: 'Player Approvals', icon: UserCheck },
        { id: 'squad', label: 'Match Squad Roster', icon: Users },
        { id: 'schedule', label: 'Match Schedule', icon: Calendar },
      ]
    : [
        { id: 'dashboard', label: 'Match Hub', icon: ClipboardCheck },
        { id: 'squad', label: 'Squad & Lineup', icon: Users },
        { id: 'history', label: 'Payment History', icon: CreditCard },
        { id: 'schedule', label: 'Match Schedule', icon: Calendar },
      ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Top Section */}
        <div>
          {/* Brand Header */}
          <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a
              href="#"
              className="sidebar-brand"
              onClick={(e) => { e.preventDefault(); handleNavClick(isAdmin ? 'admin' : 'dashboard'); }}
            >
              <img src={aseefLogo} alt="ASEEF XI" style={{ height: '28px', width: 'auto', display: 'block' }} />
              <div>
                <div className="sidebar-brand-text-main">ASEEF XI</div>
                <div className="sidebar-brand-text-sub">Friday Football</div>
              </div>
            </a>

            <button
              type="button"
              className="sidebar-mobile-close-btn"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="sidebar-nav">
            {navItems.map(({ id, label, icon: Icon }) => {
              const hasBadge = id === 'users' && pendingCount > 0;
              return (
                <button
                  key={id}
                  type="button"
                  className={`sidebar-nav-item ${activeTab === id ? 'active' : ''}`}
                  onClick={() => handleNavClick(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Icon size={18} />
                    <span>{label}</span>
                  </div>

                  {hasBadge && (
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.55rem',
                        borderRadius: '9999px',
                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
                        letterSpacing: '0.3px',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      ({pendingCount})
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          {/* Theme Switcher in Sidebar */}
          {onToggleTheme && (
            <button
              type="button"
              className="sidebar-theme-btn"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark/light mode"
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
                {theme === 'dark' ? (
                  <Sun size={16} className="sun-icon" />
                ) : (
                  <Moon size={16} className="moon-icon" />
                )}
                <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  color: 'var(--text-secondary)',
                }}
              >
                {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </span>
            </button>
          )}

          {/* User Card */}
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.role} Account</div>
            </div>
          </div>

          {/* Log Out */}
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={() => { if (onClose) onClose(); onLogout(); }}
          >
            <LogOut size={17} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
