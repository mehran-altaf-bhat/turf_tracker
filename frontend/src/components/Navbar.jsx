import React from 'react';
import { Shield, User, LogOut, Calendar, LayoutDashboard } from 'lucide-react';

export default function Navbar({ user, onLogout, activeTab, setActiveTab }) {
  if (!user) return null;

  const isAdmin = user.role === 'admin';

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <a href="#" className="brand" onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>
          <div className="brand-icon">⚽</div>
          <div>
            <span>Turf Tracker</span>
            <div style={{ fontSize: '0.72rem', color: 'var(--pitch-green-light)', fontWeight: 500, letterSpacing: 'normal' }}>
              Elite Football Turf (8-10 PM)
            </div>
          </div>
        </a>

        <div className="nav-actions">
          <button
            className={`btn btn-sm ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={15} />
            <span>Dashboard</span>
          </button>

          {isAdmin && (
            <button
              className={`btn btn-sm ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('admin')}
            >
              <Shield size={15} />
              <span>Admin Center</span>
            </button>
          )}

          <div className="nav-user">
            <span style={{ fontWeight: 600, color: '#fff' }}>{user.name}</span>
            <span className={`role-tag ${user.role}`}>
              {user.role}
            </span>
          </div>

          <button
            className="btn btn-sm btn-secondary"
            onClick={onLogout}
            title="Log out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </nav>
  );
}
