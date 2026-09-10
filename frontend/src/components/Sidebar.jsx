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
} from 'lucide-react';

export default function Sidebar({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  mobileOpen = false,
  onClose,
}) {
  if (!user) return null;
  const isAdmin = user.role === 'admin';

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    if (onClose) onClose();
  };

  const navItems = [
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
              onClick={(e) => { e.preventDefault(); handleNavClick('dashboard'); }}
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
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`sidebar-nav-item ${activeTab === id ? 'active' : ''}`}
                onClick={() => handleNavClick(id)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}

            {/* Admin-only items */}
            {isAdmin && (
              <>
                <div style={{
                  height: '1px',
                  background: 'var(--border-dim)',
                  margin: '0.5rem 0',
                }} />

                <button
                  type="button"
                  className={`sidebar-nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => handleNavClick('admin')}
                  style={{ color: activeTab === 'admin' ? 'var(--green-400)' : 'var(--amber-400)' }}
                >
                  <Shield size={18} color={activeTab === 'admin' ? 'var(--green-400)' : 'var(--amber-400)'} />
                  <span>Admin Command</span>
                </button>

                <button
                  type="button"
                  className={`sidebar-nav-item ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => handleNavClick('users')}
                  style={{ color: activeTab === 'users' ? 'var(--green-400)' : 'var(--blue-400)' }}
                >
                  <UserCheck size={18} color={activeTab === 'users' ? 'var(--green-400)' : 'var(--blue-400)'} />
                  <span>User Management</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
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
