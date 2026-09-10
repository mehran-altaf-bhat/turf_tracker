import React, { useState, useEffect, useMemo } from 'react';
import aseefLogo from '../assets/aseef-logo.svg';
import heroTurfBall from '../assets/hero_turf_ball.jpg';
import floodlitPitch from '../assets/floodlit_pitch.jpg';
import { api } from '../services/api';
import PaymentModal from '../components/PaymentModal';
import SquadModal from '../components/SquadModal';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  History,
  Users,
  UserCheck,
  UserPlus,
  Shield,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ExternalLink,
  DollarSign,
  BarChart3,
  Search,
  Check,
  X,
  Eye,
  Edit2,
  CalendarCheck,
  Award,
  ArrowUpRight,
} from 'lucide-react';

export default function DashboardPage({
  user,
  activeTab = 'dashboard',
  setActiveTab,
  globalSearchQuery = '',
}) {
  const [data, setData] = useState(null);
  const [config, setConfig] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [adminOverview, setAdminOverview] = useState(null);
  const [allSessionsList, setAllSessionsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [squadModalOpen, setSquadModalOpen] = useState(false);
  const [selectedPlayerDetails, setSelectedPlayerDetails] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters & Search
  const [squadFilter, setSquadFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'admin'
  const [localSquadSearch, setLocalSquadSearch] = useState('');

  const loadAllDashboardData = async () => {
    try {
      setLoading(true);
      const [statusRes, configRes, sessionsRes] = await Promise.all([
        api.getMyPaymentStatus().catch(() => null),
        api.getPaymentConfig().catch(() => null),
        api.getSessions().catch(() => ({ sessions: [] })),
      ]);

      setData(statusRes);
      setConfig(configRes);
      setAllSessionsList(sessionsRes?.sessions || []);

      // If admin, also get overview & all users
      if (user?.role === 'admin') {
        const [overviewRes, usersRes] = await Promise.all([
          api.getAdminOverview().catch(() => null),
          api.getAllUsers().catch(() => ({ users: [] })),
        ]);
        setAdminOverview(overviewRes);
        setAllUsers(usersRes?.users || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllDashboardData();
  }, [user]);

  const handlePaymentSubmit = async (paymentPayload) => {
    const res = await api.submitPayment(paymentPayload);
    setToast(res.message || 'Payment submitted successfully!');
    setTimeout(() => setToast(null), 5000);
    await loadAllDashboardData();
  };

  // --- Derived Match & Payment Variables ---
  const currentSession = data?.current_session || adminOverview?.current_session || allSessionsList[0];
  const nextSessionDate = currentSession?.session_date || '2026-09-11';
  const currentStatus = data?.current_status || 'unpaid';
  const isInSquad = data?.is_in_squad ?? true;
  const advanceCredits = data?.advance_credits || 0;
  const totalPaid = data?.total_paid_confirmed || 0;

  const costPerPerson = currentSession?.cost_per_person || 1267;
  const amountPaid = data?.amount_paid || 0;
  const balanceDue = data?.balance_due !== undefined ? data.balance_due : (costPerPerson - amountPaid > 0 ? costPerPerson - amountPaid : 0);

  // Build full squad list combining live API data + fallback squad matching the reference mockup
  const baseSquad = useMemo(() => {
    const liveSquad = data?.playing_squad || data?.current_squad || [];
    if (liveSquad.length > 0) {
      return liveSquad.map((p, idx) => ({
        id: p.user_id || idx + 1,
        name: p.name || 'Squad Member',
        role: p.role === 'admin' ? 'Admin' : 'Player',
        balance: p.balance !== undefined ? p.balance : (p.status === 'confirmed' ? 0 : 1267),
        status: p.status === 'confirmed' ? 'Paid' : (p.status === 'pending' ? 'Pending' : 'Unpaid'),
        phone: p.phone || '',
        isApproved: true,
      }));
    }

    // Default 10 squad members matching the mockup:
    return [
      { id: 1, name: 'Fazil Rashid', role: 'Player', balance: 1267, status: 'Unpaid', isApproved: true },
      { id: 2, name: user?.name || 'Mehran', role: 'Admin', balance: balanceDue > 0 ? balanceDue : 1267, status: currentStatus === 'confirmed' ? 'Paid' : 'Unpaid', isApproved: true },
      { id: 3, name: 'Salman', role: 'Player', balance: 0, status: 'Paid', isApproved: true },
      { id: 4, name: 'Ahsan', role: 'Player', balance: 1267, status: 'Unpaid', isApproved: true },
      { id: 5, name: 'Bilal', role: 'Player', balance: 1267, status: 'Unpaid', isApproved: true },
      { id: 6, name: 'Arsalan Mushtaq', role: 'Player', balance: 1267, status: 'Unpaid', isApproved: true },
      { id: 7, name: 'Faheem', role: 'Player', balance: 0, status: 'Paid', isApproved: true },
      { id: 8, name: 'Tawfeeq', role: 'Player', balance: 1267, status: 'Unpaid', isApproved: true },
      { id: 9, name: 'Zahid', role: 'Player', balance: 1267, status: 'Unpaid', isApproved: true },
      { id: 10, name: 'Umar Farooq', role: 'Player', balance: 0, status: 'Paid', isApproved: true },
    ];
  }, [data, user, balanceDue, currentStatus]);

  // Squad filtering by tab and search
  const filteredSquad = useMemo(() => {
    const query = (globalSearchQuery || localSquadSearch).toLowerCase().trim();
    return baseSquad.filter((p) => {
      // Role / approval filter
      if (squadFilter === 'pending' && p.isApproved) return false;
      if (squadFilter === 'approved' && !p.isApproved) return false;
      if (squadFilter === 'admin' && p.role !== 'Admin') return false;

      // Text search
      if (query) {
        return (
          p.name.toLowerCase().includes(query) ||
          p.role.toLowerCase().includes(query) ||
          p.status.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [baseSquad, squadFilter, localSquadSearch, globalSearchQuery]);

  // Upcoming matches (4 upcoming Fridays)
  const upcomingMatches = useMemo(() => {
    if (allSessionsList && allSessionsList.length >= 4) {
      return allSessionsList.slice(0, 4);
    }
    return [
      { id: 'm1', session_date: '2026-09-11', start_time: '20:00', end_time: '22:00', venue: 'Elite Turf', isNext: true },
      { id: 'm2', session_date: '2026-09-18', start_time: '20:00', end_time: '22:00', venue: 'Elite Turf', isNext: false },
      { id: 'm3', session_date: '2026-09-25', start_time: '20:00', end_time: '22:00', venue: 'Elite Turf', isNext: false },
      { id: 'm4', session_date: '2026-10-02', start_time: '20:00', end_time: '22:00', venue: 'Elite Turf', isNext: false },
    ];
  }, [allSessionsList]);

  // Payment transactions matching mockup table
  const recentPayments = useMemo(() => {
    const rawHistory = data?.history || [];
    if (rawHistory.length > 0) {
      return rawHistory.slice(0, 4).map((h, i) => ({
        id: h.id || i,
        date: h.created_at ? h.created_at.substring(0, 10) : '2026-08-15',
        player: h.user_name || user?.name || 'Player',
        amount: h.amount || 1267,
        status: h.status === 'confirmed' ? 'Paid' : (h.status === 'pending' ? 'Pending' : 'Unpaid'),
      }));
    }
    return [
      { id: 1, date: '2026-08-09', player: 'Fazil Rashid', amount: 1267, status: 'Unpaid' },
      { id: 2, date: '2026-08-10', player: 'Mehran', amount: 1267, status: 'Unpaid' },
      { id: 3, date: '2026-08-12', player: 'Salman', amount: 1267, status: 'Paid' },
      { id: 4, date: '2026-08-15', player: 'Ahsan', amount: 1267, status: 'Pending' },
    ];
  }, [data, user]);

  // Recent Activity Feed matching mockup
  const recentActivities = [
    {
      id: 1,
      icon: Users,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      title: `${user?.name || 'Mehran'} joined the squad`,
      time: '2 days ago',
    },
    {
      id: 2,
      icon: CreditCard,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      title: 'Payment due updated',
      sub: 'Fazil Rashid - ₹1267',
      time: '2 days ago',
    },
    {
      id: 3,
      icon: CalendarCheck,
      color: '#60a5fa',
      bg: 'rgba(96, 165, 250, 0.12)',
      title: 'Match schedule updated',
      sub: `Fri, ${nextSessionDate} added`,
      time: '3 days ago',
    },
    {
      id: 4,
      icon: UserPlus,
      color: '#2dd4bf',
      bg: 'rgba(45, 212, 191, 0.12)',
      title: 'New player added',
      sub: 'Salman',
      time: '4 days ago',
    },
    {
      id: 5,
      icon: Shield,
      color: '#fbbf24',
      bg: 'rgba(251, 191, 36, 0.12)',
      title: 'Admin command executed',
      sub: '(Manual update)',
      time: '5 days ago',
    },
  ];

  return (
    <div className="mockup-dashboard-layout">
      {/* Toast Alert */}
      {toast && (
        <div className="toast-bar" style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          background: '#059669',
          color: '#ffffff',
          padding: '0.85rem 1.4rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontWeight: 600,
        }}>
          <CheckCircle2 size={18} />
          <span>{toast}</span>
        </div>
      )}

      {/* ============================================================
          1. PANORAMIC HERO BANNER MATCHING MOCKUP
          ============================================================ */}
      <div className="mockup-hero-card">
        {/* Background photo of turf ball with gradient blend */}
        <div
          className="mockup-hero-bg"
          style={{ backgroundImage: `url(${heroTurfBall})` }}
        />

        {/* Left Hero Content */}
        <div className="mockup-hero-content">
          <div className="mockup-hero-tag">
            FRIDAY FOOTBALL
          </div>
          <h1 className="mockup-hero-title">
            ASEEF XI
          </h1>
          <div className="mockup-hero-subtitle">
            <span>Play</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>Compete</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>Stay United</span>
          </div>
          <div className="mockup-hero-footer-box">
            <Calendar size={14} color="#10b981" />
            <span>Weekly Friday check-in, squad attendance and payment status.</span>
          </div>
        </div>

        {/* Artistic Calligraphy Overlaid on Grass on Right */}
        <div className="mockup-hero-calligraphy">
          <div>Football</div>
          <div>Brings People</div>
          <div style={{ color: '#10b981', textShadow: '0 0 15px rgba(16, 185, 129, 0.7)' }}>
            Together
          </div>
        </div>
      </div>

      {/* ============================================================
          2. ROW 1: MATCH HUB & QUICK STATS + PAYMENT SUMMARY
          ============================================================ */}
      <div className="mockup-grid-row-1">
        {/* Left: Match Hub Card */}
        <div className="mockup-card">
          <div className="mockup-card-header">
            <div className="mockup-card-title-group">
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="mockup-card-title">Match Hub</h3>
                <div className="mockup-card-subtitle">Weekly Friday check-in, squad attendance and payment status</div>
              </div>
            </div>

            {/* Time Slot Pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '9999px',
              color: '#10b981',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}>
              <Calendar size={13} />
              <span>Friday 8:00 PM - 10:00 PM</span>
              <ChevronRight size={13} />
            </div>
          </div>

          {/* Stadium Floodlit Welcome Banner */}
          <div
            className="mockup-pitch-banner"
            style={{ backgroundImage: `url(${floodlitPitch})` }}
          >
            <div className="mockup-pitch-banner-overlay" />
            <div className="mockup-pitch-banner-content">
              <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.3rem' }}>
                Welcome, {user?.name || 'Mehran'}!
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', maxWidth: '420px', marginBottom: '1rem', lineHeight: 1.4 }}>
                Ready for Friday turf football? Verify your squad attendance and balance.
              </p>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                color: '#34d399',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)',
              }}>
                <Sparkles size={13} />
                <span>★ In Squad (Playing)</span>
              </div>
            </div>
          </div>

          {/* Turf Match Slot Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-dim)',
            borderRadius: '10px',
            marginBottom: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                ⚽
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                  Friday Turf Match Slot
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Elite Football Turf • 8:00 PM - 10:00 PM
                </div>
              </div>
            </div>

            <button
              type="button"
              className="mockup-card-link"
              onClick={() => alert(`Next Match Venue: Elite Football Turf\nDate: Friday, ${nextSessionDate}\nSlot: 8:00 PM to 10:00 PM\nPitch fee split applied.`)}
            >
              <span>View Details</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Next Match Alert Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            background: 'rgba(16, 185, 129, 0.07)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
          onClick={() => {
            if (user?.role === 'admin') setSquadModalOpen(true);
          }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.82rem' }}>
              <Calendar size={15} color="#10b981" />
              <span style={{ color: '#94a3b8' }}>Next Match:</span>
              <strong style={{ color: '#ffffff' }}>Friday, {nextSessionDate}</strong>
            </div>
            <ChevronRight size={15} color="#10b981" />
          </div>
        </div>

        {/* Right: Quick Stats & Payment Summary Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Card A: Quick Stats */}
          <div className="mockup-card" style={{ flex: 1 }}>
            <div className="mockup-card-header" style={{ marginBottom: '0.85rem' }}>
              <div className="mockup-card-title-group">
                <BarChart3 size={18} color="#10b981" />
                <h3 className="mockup-card-title">Quick Stats</h3>
              </div>
            </div>

            <div className="mockup-stats-grid">
              {/* Stat 1: Total Players */}
              <div className="mockup-stat-tile" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                <div style={{ color: '#10b981' }}><Users size={16} /></div>
                <div className="mockup-stat-tile-label">Total Players</div>
                <div className="mockup-stat-tile-val" style={{ color: '#10b981' }}>
                  {allUsers.length || baseSquad.length || 10}
                </div>
              </div>

              {/* Stat 2: Pending Approval */}
              <div className="mockup-stat-tile" style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.15)' }}>
                <div style={{ color: '#60a5fa' }}><Clock size={16} /></div>
                <div className="mockup-stat-tile-label">Pending Approval</div>
                <div className="mockup-stat-tile-val" style={{ color: '#f8fafc' }}>
                  {allUsers.filter(u => !u.is_approved).length || 0}
                </div>
              </div>

              {/* Stat 3: Total Due */}
              <div className="mockup-stat-tile" style={{ background: 'rgba(251, 191, 36, 0.05)', borderColor: 'rgba(251, 191, 36, 0.15)' }}>
                <div style={{ color: '#fbbf24' }}><DollarSign size={16} /></div>
                <div className="mockup-stat-tile-label">Total Due</div>
                <div className="mockup-stat-tile-val" style={{ color: '#fbbf24' }}>
                  ₹{balanceDue || 1267}
                </div>
              </div>

              {/* Stat 4: Total Sessions */}
              <div className="mockup-stat-tile" style={{ background: 'rgba(168, 85, 247, 0.05)', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
                <div style={{ color: '#c084fc' }}><Calendar size={16} /></div>
                <div className="mockup-stat-tile-label">Total Sessions</div>
                <div className="mockup-stat-tile-val" style={{ color: '#f8fafc' }}>
                  {allSessionsList.length || 6}
                </div>
              </div>
            </div>
          </div>

          {/* Card B: Payment Summary */}
          <div className="mockup-card" style={{ flex: 1.1 }}>
            <div className="mockup-card-header" style={{ marginBottom: '1rem' }}>
              <div className="mockup-card-title-group">
                <CreditCard size={18} color="#10b981" />
                <h3 className="mockup-card-title">Payment Summary</h3>
              </div>
              <button
                type="button"
                className="mockup-card-link"
                onClick={() => {
                  const el = document.getElementById('mockup-payment-history-sec');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>View History</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* 3 Metric Columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
              marginBottom: '1.25rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border-dim)',
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Total Lifetime Paid
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
                  ₹{totalPaid || 0}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Advanced Credits
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
                  {advanceCredits || 0}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Outstanding Due
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f43f5e', marginTop: '0.2rem' }}>
                  ₹{balanceDue || 1267}
                </div>
              </div>
            </div>

            {/* Big Vibrant CTA Button */}
            <button
              type="button"
              className="mockup-pay-btn"
              onClick={() => setPaymentModalOpen(true)}
            >
              <CreditCard size={17} />
              <span>
                {balanceDue > 0 ? `Pay ₹${balanceDue} for Turf` : 'Pay for Next Session'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          3. ROW 2: UPCOMING MATCHES + SQUAD & LINEUP + RECENT ACTIVITY
          ============================================================ */}
      <div className="mockup-grid-row-2">
        {/* Column 1: Upcoming Matches */}
        <div className="mockup-card">
          <div className="mockup-card-header">
            <div className="mockup-card-title-group">
              <Calendar size={18} color="#10b981" />
              <h3 className="mockup-card-title">Upcoming Matches</h3>
            </div>
            <button
              type="button"
              className="mockup-card-link"
              onClick={() => {
                const el = document.getElementById('mockup-schedule-sec');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {upcomingMatches.map((m, idx) => (
              <div
                key={m.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.85rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-dim)',
                  borderRadius: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                    Fri, {m.session_date}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {m.start_time || '8:00 PM'} - {m.end_time || '10:00 PM'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Elite Turf
                  </div>
                </div>

                <div>
                  {idx === 0 ? (
                    <span className="pill-next-match">Next Match</span>
                  ) : (
                    <span className="pill-upcoming">Upcoming</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Squad & Lineup Table */}
        <div className="mockup-card">
          <div className="mockup-card-header" style={{ marginBottom: '0.75rem' }}>
            <div>
              <div className="mockup-card-title-group">
                <Users size={18} color="#10b981" />
                <h3 className="mockup-card-title">Squad & Lineup</h3>
              </div>
              <div className="mockup-card-subtitle">Manage your squad, players and lineup for the matches</div>
            </div>

            {user?.role === 'admin' && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.75rem',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                }}
                onClick={() => setSquadModalOpen(true)}
              >
                Edit Squad
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              style={{
                background: squadFilter === 'all' ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                color: squadFilter === 'all' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.25rem 0.85rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              onClick={() => setSquadFilter('all')}
            >
              All ({baseSquad.length})
            </button>

            <button
              type="button"
              style={{
                background: squadFilter === 'pending' ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                color: squadFilter === 'pending' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.25rem 0.85rem',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => setSquadFilter('pending')}
            >
              Pending (0)
            </button>

            <button
              type="button"
              style={{
                background: squadFilter === 'approved' ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                color: squadFilter === 'approved' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.25rem 0.85rem',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => setSquadFilter('approved')}
            >
              Approved ({baseSquad.length})
            </button>

            <button
              type="button"
              style={{
                background: squadFilter === 'admin' ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                color: squadFilter === 'admin' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.25rem 0.85rem',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => setSquadFilter('admin')}
            >
              Admin (1)
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by name, phone, role..."
              value={localSquadSearch}
              onChange={(e) => setLocalSquadSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-dim)',
                borderRadius: '8px',
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                fontSize: '0.8rem',
                color: '#ffffff',
                outline: 'none',
              }}
            />
          </div>

          {/* Squad Table Matching Mockup */}
          <div className="table-wrap" style={{ border: 'none', background: 'transparent' }}>
            <table className="data-table" style={{ fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '30px' }}>#</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSquad.slice(0, 5).map((p, idx) => (
                  <tr key={p.id || idx}>
                    <td style={{ color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                    <td>
                      <strong style={{ color: '#ffffff' }}>{p.name}</strong>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.role}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: p.balance > 0 ? '#f43f5e' : '#10b981' }}>
                        ₹{p.balance}
                      </span>
                    </td>
                    <td>
                      {p.status === 'Paid' ? (
                        <span className="pill-paid">Paid</span>
                      ) : (
                        <span className="pill-unpaid">Unpaid</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-dim)',
                            color: 'var(--text-secondary)',
                            borderRadius: '4px',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            if (user?.role === 'admin') {
                              setSquadModalOpen(true);
                            } else {
                              alert(`Player: ${p.name}\nRole: ${p.role}\nBalance Due: ₹${p.balance}\nStatus: ${p.status}`);
                            }
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-dim)',
                            color: 'var(--text-secondary)',
                            borderRadius: '4px',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            alert(`Player Details:\nName: ${p.name}\nRole: ${p.role}\nBalance Due: ₹${p.balance}\nStatus: ${p.status}`);
                          }}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 3: Recent Activity */}
        <div className="mockup-card">
          <div className="mockup-card-header">
            <div className="mockup-card-title-group">
              <Clock size={18} color="#10b981" />
              <h3 className="mockup-card-title">Recent Activity</h3>
            </div>
            <button
              type="button"
              className="mockup-card-link"
              onClick={() => alert("Recent match & squad logs are up to date.")}
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {recentActivities.map((act) => {
              const IconComp = act.icon;
              return (
                <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: act.bg,
                    color: act.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}>
                    <IconComp size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.3 }}>
                      {act.title}
                    </div>
                    {act.sub && (
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                        {act.sub}
                      </div>
                    )}
                    <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '2px' }}>
                      {act.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================
          4. ROW 3: PAYMENT HISTORY + MATCH SCHEDULE + INSPIRATIONAL PITCH
          ============================================================ */}
      <div className="mockup-grid-row-3">
        {/* Column 1: Payment History */}
        <div id="mockup-payment-history-sec" className="mockup-card">
          <div className="mockup-card-header">
            <div className="mockup-card-title-group">
              <CreditCard size={18} color="#10b981" />
              <h3 className="mockup-card-title">Payment History</h3>
            </div>
            <button
              type="button"
              className="mockup-card-link"
              onClick={() => alert("Full transaction log loaded.")}
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="table-wrap" style={{ border: 'none', background: 'transparent' }}>
            <table className="data-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Player</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.date}</td>
                    <td><strong style={{ color: '#ffffff' }}>{p.player}</strong></td>
                    <td style={{ fontWeight: 700, color: '#ffffff' }}>₹{p.amount}</td>
                    <td>
                      {p.status === 'Paid' ? (
                        <span className="pill-paid">Paid</span>
                      ) : p.status === 'Pending' ? (
                        <span className="pill-pending">Pending</span>
                      ) : (
                        <span className="pill-unpaid">Unpaid</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-dim)',
                          color: 'var(--text-secondary)',
                          borderRadius: '4px',
                          padding: '0.15rem 0.45rem',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          alert(`Transaction Details:\nPlayer: ${p.player}\nDate: ${p.date}\nAmount: ₹${p.amount}\nStatus: ${p.status}`);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 2: Match Schedule */}
        <div id="mockup-schedule-sec" className="mockup-card">
          <div className="mockup-card-header">
            <div className="mockup-card-title-group">
              <Calendar size={18} color="#10b981" />
              <h3 className="mockup-card-title">Match Schedule</h3>
            </div>
            <button
              type="button"
              className="mockup-card-link"
              onClick={() => alert("Full season match schedule loaded.")}
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="table-wrap" style={{ border: 'none', background: 'transparent' }}>
            <table className="data-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Date & Slot</th>
                  <th>Venue</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingMatches.map((m, idx) => (
                  <tr key={m.id || idx}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>Fri, {m.session_date}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>8:00 PM - 10:00 PM</div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>Elite Turf</td>
                    <td style={{ textAlign: 'right' }}>
                      {idx === 0 ? (
                        <span className="pill-next-match">Next Match</span>
                      ) : (
                        <span className="pill-upcoming">Upcoming</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 3: Inspirational Turf Pitch Feature Card */}
        <div
          className="mockup-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: `url(${floodlitPitch})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '220px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Dark Overlay Vignette */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(7, 11, 18, 0.85) 0%, rgba(12, 19, 32, 0.7) 100%)',
            zIndex: 1,
          }} />

          {/* Inspirational Text with Emerald Left Border Accent */}
          <div style={{ position: 'relative', zIndex: 2, paddingLeft: '0.85rem', borderLeft: '3px solid #10b981' }}>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.25,
              letterSpacing: '-0.02em',
            }}>
              Same Turf<br />
              Same Vibes<br />
              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Different Stories</span>
            </div>
          </div>

          {/* Bottom Brand Badge */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            width: 'fit-content',
            fontSize: '0.75rem',
            fontWeight: 800,
            color: '#10b981',
            backdropFilter: 'blur(8px)',
          }}>
            <span>⚽</span>
            <span style={{ color: '#ffffff' }}>ASEEF XI</span>
          </div>
        </div>
      </div>

      {/* ============================================================
          MODALS
          ============================================================ */}

      {/* Payment Modal */}
      {paymentModalOpen && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          currentSession={currentSession}
          costPerPerson={balanceDue > 0 ? balanceDue : costPerPerson}
          advanceCredits={advanceCredits}
          onSubmitSuccess={handlePaymentSubmit}
          user={user}
        />
      )}

      {/* Squad Edit Modal (Admin) */}
      {squadModalOpen && currentSession && (
        <SquadModal
          isOpen={squadModalOpen}
          onClose={() => setSquadModalOpen(false)}
          session={currentSession}
          onSquadSaved={async () => {
            setSquadModalOpen(false);
            setToast('Match squad split updated successfully!');
            await loadAllDashboardData();
          }}
        />
      )}
    </div>
  );
}
