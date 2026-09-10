import React from 'react';
import {
  ClipboardCheck,
  Users,
  CreditCard,
  Calendar,
  Shield,
  LogOut,
  User,
  Sparkles,
  X,
  UserCheck,
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

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header with optional Close button on mobile */}
        <div>
          <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a
              href="#"
              className="sidebar-brand"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('dashboard');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}
            >
              <img
                src="/aseef-logo.svg"
                alt="ASEEF XI"
                style={{ height: '30px', width: 'auto', display: 'block' }}
              />
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                  ASEEF XI
                </div>
                <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, letterSpacing: '0.04em' }}>
                  FRIDAY FOOTBALL
                </div>
              </div>
            </a>

            {/* Mobile Close Button (X) */}
            <button
              type="button"
              className="sidebar-mobile-close-btn"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="sidebar-nav">
            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
              <ClipboardCheck size={19} />
              <span>Match Hub</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'squad' ? 'active' : ''}`}
              onClick={() => handleNavClick('squad')}
            >
              <Users size={19} />
              <span>Squad & Lineup</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => handleNavClick('history')}
            >
              <CreditCard size={19} />
              <span>Payment History</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => handleNavClick('schedule')}
            >
              <Calendar size={19} />
              <span>Match Schedule</span>
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  className={`sidebar-nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => handleNavClick('admin')}
                  style={{ marginTop: '0.5rem' }}
                >
                  <Shield size={19} color="#d97706" />
                  <span style={{ color: activeTab === 'admin' ? '#047857' : '#b45309', fontWeight: 600 }}>
                    Admin Command
                  </span>
                </button>

                <button
                  type="button"
                  className={`sidebar-nav-item ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => handleNavClick('users')}
                >
                  <UserCheck size={19} color="#2563eb" />
                  <span style={{ color: activeTab === 'users' ? '#047857' : '#1d4ed8', fontWeight: 600 }}>
                    User Management
                  </span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {/* User Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.65rem 0.85rem',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #eaecf0',
            marginBottom: '0.5rem',
          }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: '1px solid #a7f3d0',
            }}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'capitalize' }}>
                {user.role} Account
              </div>
            </div>
          </div>

          {/* Log Out Button */}
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={() => {
              if (onClose) onClose();
              onLogout();
            }}
          >
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
