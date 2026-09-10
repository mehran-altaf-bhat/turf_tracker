import React from 'react';
import aseefLogo from '../assets/aseef-logo.svg';
import { Shield, User, LogOut, Calendar, LayoutDashboard } from 'lucide-react';

export default function Navbar({ user, onLogout, activeTab, setActiveTab }) {
  if (!user) return null;

  const isAdmin = user.role === 'admin';

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <a href="#" className="brand" onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <img src={aseefLogo} alt="ASEEF XI" style={{ height: '28px', width: 'auto' }} />
          <div>
            <span style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>ASEEF XI</span>
            <div style={{ fontSize: '0.72rem', color: 'var(--pitch-green-dark)', fontWeight: 700, letterSpacing: '0.04em' }}>
              FRIDAY FOOTBALL (8-10 PM)
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
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</span>
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
