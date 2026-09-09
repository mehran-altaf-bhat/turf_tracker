import React from 'react';
import {
  ClipboardCheck,
  Users,
  CreditCard,
  Calendar,
  Shield,
  LogOut,
  User,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ user, activeTab, setActiveTab, onLogout }) {
  if (!user) return null;
  const isAdmin = user.role === 'admin';

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div>
        <div className="sidebar-header">
          <a
            href="#"
            className="sidebar-brand"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('dashboard');
            }}
          >
            <div className="sidebar-brand-icon">⚽</div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                TurfTracker
              </div>
              <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                Elite Football Turf
              </div>
            </div>
          </a>
        </div>

        {/* Navigation Items (Clokin Style) */}
        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <ClipboardCheck size={19} />
            <span>Match Hub</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'squad' ? 'active' : ''}`}
            onClick={() => setActiveTab('squad')}
          >
            <Users size={19} />
            <span>Squad & Lineup</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <CreditCard size={19} />
            <span>Payment History</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <Calendar size={19} />
            <span>Match Schedule</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
              style={{ marginTop: '0.5rem' }}
            >
              <Shield size={19} color="#d97706" />
              <span style={{ color: activeTab === 'admin' ? '#047857' : '#b45309', fontWeight: 600 }}>
                Admin Command
              </span>
            </button>
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

        {/* Log Out Button (Matching Clokin screenshot in red) */}
        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={onLogout}
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
