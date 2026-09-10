import React from 'react';
import aseefLogo from '../assets/aseef-logo.svg';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  CreditCard,
  Calendar,
  Shield,
  LogOut,
  UserCheck,
  ChevronRight,
  Menu,
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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'hub', label: 'Match Hub', icon: ClipboardList },
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

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} style={{
        background: '#080d17',
        borderRight: '1px solid rgba(255, 255, 255, 0.07)',
        width: '260px',
        minWidth: '260px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.25rem 1rem 1.5rem',
      }}>
        {/* Top Section */}
        <div>
          {/* Brand Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.25rem 0.35rem 1.25rem',
            marginBottom: '0.75rem',
          }}>
            <a
              href="#"
              className="sidebar-brand"
              onClick={(e) => { e.preventDefault(); handleNavClick('dashboard'); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.25)',
                flexShrink: 0,
              }}>
                <img src={aseefLogo} alt="ASEEF XI" style={{ height: '22px', width: 'auto' }} />
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                }}>
                  ASEEF XI
                </div>
                <div style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  color: '#10b981',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  Friday Football
                </div>
              </div>
            </a>

            <button
              type="button"
              className="sidebar-mobile-close-btn"
              onClick={onClose}
              aria-label="Close menu"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNavClick(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: isActive
                      ? 'linear-gradient(90deg, #059669 0%, #10b981 100%)'
                      : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-main)',
                    fontSize: '0.88rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    boxShadow: isActive ? '0 4px 15px rgba(16, 185, 129, 0.35)' : 'none',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <Icon size={18} color={isActive ? '#ffffff' : 'var(--text-muted)'} />
                  <span>{label}</span>
                </button>
              );
            })}

            {/* Admin-only items */}
            {isAdmin && (
              <>
                <div style={{
                  height: '1px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  margin: '0.4rem 0.5rem',
                }} />

                <button
                  type="button"
                  onClick={() => handleNavClick('admin')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: activeTab === 'admin'
                      ? 'linear-gradient(90deg, #059669 0%, #10b981 100%)'
                      : 'transparent',
                    color: activeTab === 'admin' ? '#ffffff' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-main)',
                    fontSize: '0.88rem',
                    fontWeight: activeTab === 'admin' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    boxShadow: activeTab === 'admin' ? '0 4px 15px rgba(16, 185, 129, 0.35)' : 'none',
                    width: '100%',
                  }}
                >
                  <Shield size={18} color={activeTab === 'admin' ? '#ffffff' : 'var(--text-muted)'} />
                  <span>Admin Command</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('users')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: activeTab === 'users'
                      ? 'linear-gradient(90deg, #059669 0%, #10b981 100%)'
                      : 'transparent',
                    color: activeTab === 'users' ? '#ffffff' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-main)',
                    fontSize: '0.88rem',
                    fontWeight: activeTab === 'users' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    boxShadow: activeTab === 'users' ? '0 4px 15px rgba(16, 185, 129, 0.35)' : 'none',
                    width: '100%',
                  }}
                >
                  <UserCheck size={18} color={activeTab === 'users' ? '#ffffff' : 'var(--text-muted)'} />
                  <span>User Management</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Bottom Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* User Profile Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 0.85rem',
              background: '#0d1422',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => {
              if (isAdmin) handleNavClick('admin');
            }}
            title={isAdmin ? 'Switch to Admin Command' : 'User Profile'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                fontWeight: 800,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'M'}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {user.role === 'admin' ? 'Admin Account' : 'Player Account'}
                </div>
              </div>
            </div>

            <ChevronRight size={16} color="#64748b" />
          </div>

          {/* Artistic Football Script & Ball Graphic */}
          <div style={{
            position: 'relative',
            padding: '0.5rem 0.5rem 0',
            overflow: 'hidden',
          }}>
            {/* Faint watermark soccer ball SVG */}
            <svg
              viewBox="0 0 24 24"
              style={{
                position: 'absolute',
                right: '-12px',
                bottom: '-12px',
                width: '90px',
                height: '90px',
                fill: 'none',
                stroke: 'rgba(255, 255, 255, 0.04)',
                strokeWidth: '1.2',
                pointerEvents: 'none',
              }}
            >
              <circle cx="12" cy="12" r="10" />
              <polygon points="12,7 16,10 14.5,15 9.5,15 8,10" />
              <line x1="12" y1="2" x2="12" y2="7" />
              <line x1="21.5" y1="9" x2="16" y2="10" />
              <line x1="18" y1="20" x2="14.5" y2="15" />
              <line x1="6" y1="20" x2="9.5" y2="15" />
              <line x1="2.5" y1="9" x2="8" y2="10" />
            </svg>

            <div style={{
              fontFamily: 'var(--font-script)',
              fontSize: '1.55rem',
              lineHeight: '1.1',
              color: 'rgba(255, 255, 255, 0.75)',
              transform: 'rotate(-3deg)',
              pointerEvents: 'none',
            }}>
              <div>Better</div>
              <div>Matches</div>
              <div style={{
                color: '#10b981',
                fontSize: '1.85rem',
                fontWeight: 700,
                textShadow: '0 0 12px rgba(16, 185, 129, 0.5)',
              }}>
                Bigger
              </div>
              <div style={{
                color: '#10b981',
                fontSize: '1.85rem',
                fontWeight: 700,
                marginTop: '-4px',
                textShadow: '0 0 12px rgba(16, 185, 129, 0.5)',
              }}>
                Moments
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
