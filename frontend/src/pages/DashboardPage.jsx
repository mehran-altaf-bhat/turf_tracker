import React, { useState, useEffect } from 'react';
import aseefLogo from '../assets/aseef-logo.svg';
import { api } from '../services/api';
import PaymentModal from '../components/PaymentModal';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Clock3,
  AlertCircle,
  CreditCard,
  History,
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Shield,
  ShieldCheck,
  RefreshCw,
  Trophy,
  Activity,
  Award,
} from 'lucide-react';

export default function DashboardPage({ user, activeTab = 'dashboard', setActiveTab }) {
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [squadTab, setSquadTab] = useState('playing'); // 'playing' | 'not_playing'
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusRes, configRes] = await Promise.all([
        api.getMyPaymentStatus(),
        api.getPaymentConfig(),
      ]);
      setData(statusRes);
      setConfig(configRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePaymentSuccess = async (paymentPayload) => {
    const res = await api.submitPayment(paymentPayload);
    setToast(res.message);
    setTimeout(() => setToast(null), 5000);
    await loadData();
  };

  const handleRsvp = async (attending) => {
    if (!currentSession?.id) return;
    try {
      setRsvpLoading(true);
      const res = await api.rsvpSession(currentSession.id, attending);
      setToast(res.message);
      setTimeout(() => setToast(null), 6000);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to update RSVP');
    } finally {
      setRsvpLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted)' }}>
        <img src={aseefLogo} alt="ASEEF XI" style={{ height: '42px', width: 'auto', marginBottom: '0.75rem', opacity: 0.8 }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.03em' }}>Loading Match Hub...</p>
      </div>
    );
  }

  const currentSession = data?.current_session;
  const currentStatus = data?.current_status || 'unpaid';
  const playingSquad = data?.playing_squad || data?.current_squad || [];
  const notPlayingSquad = data?.not_playing_squad || [];
  const isInSquad = data?.is_in_squad ?? false;
  const advanceCredits = data?.advance_credits || 0;
  const totalPaid = data?.total_paid_confirmed || 0;

  const payableAmount = data?.payable_amount || currentSession?.cost_per_person || 200;
  const amountPaid = data?.amount_paid || 0;
  const balanceDue = isInSquad ? (data?.balance_due ?? Math.max(0, payableAmount - amountPaid)) : 0;
  const hasShiftedCredit = amountPaid > 0 && balanceDue > 0;

  // Strictly filter payment history to confirmed (done), partial, or rejected
  const history = (data?.history || []).filter(
    (h) => h.status === 'confirmed' || h.status === 'partial' || h.status === 'rejected'
  );
  const upcomingSessions = data?.upcoming_sessions || [];

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div className="toast-bar">
          <CheckCircle2 size={18} color="var(--green-500)" />
          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{toast}</span>
        </div>
      )}

      {/* Credit Shifted Banner */}
      {hasShiftedCredit && isInSquad && (
        <div style={{
          background: 'var(--blue-subtle)',
          border: '1px solid rgba(96, 165, 250, 0.25)',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Sparkles size={20} color="var(--blue-400)" />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--blue-400)', fontSize: '0.9rem' }}>
                Previous Payment Shifted to this Match!
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                ₹{amountPaid} credit from your previous match was compensated. Remaining balance for this Friday: <strong style={{ color: 'var(--blue-400)' }}>₹{balanceDue}</strong>.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
            onClick={() => setModalOpen(true)}
          >
            <CreditCard size={15} />
            <span>Pay ₹{balanceDue} Balance</span>
          </button>
        </div>
      )}

      {/* Opted-Out Alert Banner (Regular Players only) */}
      {!isAdmin && !isInSquad ? (
        <div style={{
          background: 'var(--amber-subtle)',
          border: '1px solid rgba(251, 191, 36, 0.25)',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} color="var(--amber-400)" />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--amber-400)', fontSize: '0.9rem' }}>
                You are currently marked as NOT PLAYING for this Friday match
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                You have been removed from the match squad. Any prior payment has been transferred to your next match as credit!
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
            disabled={rsvpLoading}
            onClick={() => handleRsvp(true)}
          >
            <UserCheck size={15} />
            <span>Join Match Squad</span>
          </button>
        </div>
      ) : (!isAdmin && currentStatus === 'rejected') ? (
        <div style={{
          background: 'var(--rose-subtle)',
          border: '1px solid rgba(248, 113, 113, 0.25)',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} color="var(--rose-400)" />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--rose-400)', fontSize: '0.9rem' }}>
                Payment Proof Rejected by Admin
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                Please submit a valid UPI reference number or screenshot proof.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
            onClick={() => setModalOpen(true)}
          >
            <RefreshCw size={15} />
            <span>Pay Again</span>
          </button>
        </div>
      ) : null}

      {/* Primary Dashboard Grid */}
      {(activeTab === 'dashboard' || activeTab === 'all') && (
        <div className="clokin-grid">
          {/* Left Column Cards */}
          <div className="clokin-left-col">
            {/* Card 1: Player Welcome & Attendance Status */}
            <div className="clokin-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Welcome, {user.name}!
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    {isAdmin
                      ? 'Turf Administrator Console • Overseeing match collections, squad roster, and player accounts.'
                      : 'Ready for Friday turf football? Verify your squad attendance and balance.'}
                  </p>
                </div>
                <div>
                  {isAdmin ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '9999px',
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: 'var(--amber-400)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}>
                      <ShieldCheck size={14} />
                      System Admin
                    </span>
                  ) : isInSquad ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '9999px',
                      background: 'rgba(34, 197, 94, 0.12)',
                      color: 'var(--green-400)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}>
                      <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green-500)', flexShrink: 0 }} />
                      In Squad (Playing)
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '9999px',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                      Not Playing
                    </span>
                  )}
                </div>
              </div>

              {/* RSVP Action Toggle (Regular Players only, not Admin) */}
              {!isAdmin && (
                <div style={{
                  marginTop: '1.25rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {isInSquad ? (
                      <span>Cannot play this match? Your payment will shift to the next match:</span>
                    ) : (
                      <span>Ready to play? You can re-join the match squad anytime:</span>
                    )}
                  </div>

                  {isInSquad ? (
                    <button
                      type="button"
                      disabled={rsvpLoading}
                      onClick={() => {
                        if (window.confirm('Cannot play this Friday? Your payment (if paid) will automatically shift to the next match as carryover credit.')) {
                          handleRsvp(false);
                        }
                      }}
                      style={{
                        background: 'var(--rose-subtle)',
                        border: '1px solid rgba(248, 113, 113, 0.25)',
                        color: 'var(--rose-400)',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.18)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--rose-subtle)'}
                    >
                      <UserX size={15} />
                      <span>Not Playing This Match</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={rsvpLoading}
                      onClick={() => handleRsvp(true)}
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                    >
                      <UserCheck size={15} />
                      <span>I Want to Play / Join Squad</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Card 2: Friday Turf Slot & Duration */}
            <div className="clokin-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    color: 'var(--green-400)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Clock size={19} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                      Friday Turf Match Slot
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Elite Football Turf • 8:00 PM – 10:00 PM
                    </div>
                  </div>
                </div>

                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--green-500)',
                  boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2)',
                }} className="pulse-dot" />
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '1.25rem' }}>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                  2h 00m
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--green-400)', fontWeight: 700, background: 'rgba(34, 197, 94, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '9999px', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
                  Match Scheduled
                </div>
              </div>

              <div className="custom-progress-bar">
                <div className="custom-progress-fill" style={{ width: '100%' }} />
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Match date: <strong style={{ color: 'var(--text-secondary)' }}>Friday, {currentSession?.session_date || 'Upcoming'}</strong>
              </div>
            </div>

            {/* Card 3: Turf Venue Location */}
            <div className="clokin-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--blue-subtle)',
                    border: '1px solid rgba(96, 165, 250, 0.25)',
                    color: 'var(--blue-400)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MapPin size={19} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                      Elite Football Turf Ground
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Official match fee: ₹{payableAmount} / player
                    </div>
                  </div>
                </div>

                <span style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  color: 'var(--green-400)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  Verified Turf
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Match Terminal & Pitch Pass (Custom Sports Identity) */}
          <div className="clokin-right-col">
            <div className="clokin-viewfinder">
              <div className="clokin-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: isAdmin ? 'rgba(245, 158, 11, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                    color: isAdmin ? 'var(--amber-400)' : 'var(--green-400)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                  }}>
                    {isAdmin ? '🛡️' : '🏙️'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {isAdmin ? 'Turf Financial & Booking Hub' : 'Pitch Pass & Match Terminal'}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Friday Match #{currentSession?.id || 1} • Elite Turf
                    </div>
                  </div>
                </div>

                <div>
                  {isAdmin ? (
                    (upcomingSessions[0]?.collected_amount || 0) >= 3800 ? (
                      <span className="badge badge-paid">
                        <CheckCircle2 size={13} /> Turf Fully Funded ✅
                      </span>
                    ) : (
                      <span className="badge badge-pending">
                        <Clock3 size={13} /> Collection In Progress ⏳
                      </span>
                    )
                  ) : isInSquad ? (
                    currentStatus === 'confirmed' && balanceDue === 0 ? (
                      <span className="badge badge-paid">
                        <CheckCircle2 size={13} /> Paid Full ✅
                      </span>
                    ) : (currentStatus === 'partial' || balanceDue > 0) ? (
                      <span className="badge badge-pending">
                        <Clock3 size={13} /> Partial (₹{balanceDue} due)
                      </span>
                    ) : currentStatus === 'pending' ? (
                      <span className="badge badge-pending">
                        <Clock3 size={13} /> Verification Pending
                      </span>
                    ) : currentStatus === 'rejected' ? (
                      <span className="badge badge-unpaid">
                        <AlertCircle size={13} /> Rejected
                      </span>
                    ) : (
                      <span className="badge badge-unpaid">
                        <AlertCircle size={13} /> Payment Due
                      </span>
                    )
                  ) : (
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                      Benched (Not Playing)
                    </span>
                  )}
                </div>
              </div>

              {/* Terminal Center Graphic */}
              <div className="viewfinder-inner">
                {isAdmin ? (
                  /* ADMIN TERMINAL VIEW */
                  <>
                    <div className="viewfinder-camera-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.35)' }}>
                      <Shield size={32} color="var(--amber-400)" />
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '0.2rem' }}>
                      Turf Booking & Financial Command
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.1rem' }}>
                      Friday {currentSession?.session_date} • Elite Football Turf
                    </div>

                    {/* Financial Breakdown Chips */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.65rem',
                      width: '100%',
                      maxWidth: '380px',
                      margin: '0 auto 1.25rem',
                    }}>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Turf Cost</div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>₹3,800</div>
                      </div>
                      <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '10px', padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--green-400)' }}>Collected</div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--green-400)' }}>
                          ₹{upcomingSessions[0]?.collected_amount || 0}
                        </div>
                      </div>
                      <div style={{
                        background: Math.max(0, 3800 - (upcomingSessions[0]?.collected_amount || 0)) > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                        border: Math.max(0, 3800 - (upcomingSessions[0]?.collected_amount || 0)) > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(34, 197, 94, 0.25)',
                        borderRadius: '10px',
                        padding: '0.65rem 0.5rem',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '0.72rem', color: Math.max(0, 3800 - (upcomingSessions[0]?.collected_amount || 0)) > 0 ? 'var(--amber-400)' : 'var(--green-400)' }}>Remaining</div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: Math.max(0, 3800 - (upcomingSessions[0]?.collected_amount || 0)) > 0 ? 'var(--amber-400)' : 'var(--green-400)' }}>
                          ₹{Math.max(0, 3800 - (upcomingSessions[0]?.collected_amount || 0))}
                        </div>
                      </div>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '340px', marginBottom: '1.25rem' }}>
                      {(upcomingSessions[0]?.collected_amount || 0) >= 3800
                        ? 'Turf booking fee is fully covered by player contributions! Ready for kickoff.'
                        : `Current squad split is ₹${upcomingSessions[0]?.cost_per_player || 1900} per player. Track approvals or record cash in the Admin Command.`}
                    </p>

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setActiveTab && setActiveTab('admin_command')}
                      >
                        <ShieldCheck size={15} />
                        <span>Admin Command Center</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setActiveTab && setActiveTab('user_approvals')}
                      >
                        <Users size={15} />
                        <span>Player Approvals</span>
                      </button>
                    </div>
                  </>
                ) : !isInSquad ? (
                  /* User is NOT playing: Show Bench card */
                  <>
                    <div className="viewfinder-camera-icon" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'var(--border-subtle)' }}>
                      <UserX size={30} color="var(--text-muted)" />
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '0.35rem' }}>
                      Player Bench / Out of Squad
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '340px', marginBottom: '1.25rem' }}>
                      You marked yourself as not playing for Friday {currentSession?.session_date}. If you had already paid, your funds are shifted to the next match!
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={rsvpLoading}
                      onClick={() => handleRsvp(true)}
                    >
                      <UserCheck size={16} />
                      <span>Ready to Play? Join Squad</span>
                    </button>
                  </>
                ) : currentStatus === 'confirmed' && balanceDue === 0 ? (
                  /* User is paid in full */
                  <>
                    <div className="viewfinder-camera-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.35)' }}>
                      <CheckCircle2 size={34} color="var(--green-400)" />
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '0.35rem' }}>
                      Pitch Pass Confirmed!
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--green-400)', marginBottom: '0.25rem' }}>
                      ₹{payableAmount} Paid in Full
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '340px', marginBottom: '1.25rem' }}>
                      Your match fee for Friday {currentSession?.session_date} is fully settled. See you on the pitch at 8:00 PM!
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setModalOpen(true)}
                    >
                      <CreditCard size={15} />
                      <span>Pre-pay for Future Weeks</span>
                    </button>
                  </>
                ) : (
                  /* User has payment due (partial, unpaid, or rejected) */
                  <>
                    {/* Financial Breakdown Chips */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.65rem',
                      width: '100%',
                      maxWidth: '380px',
                      margin: '0 auto 1.25rem',
                    }}>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Match Fee</div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>₹{payableAmount}</div>
                      </div>
                      <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '10px', padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--green-400)' }}>Credit / Paid</div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--green-400)' }}>-₹{amountPaid}</div>
                      </div>
                      <div style={{
                        background: balanceDue > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                        border: balanceDue > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-subtle)',
                        borderRadius: '10px',
                        padding: '0.65rem 0.5rem',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '0.72rem', color: balanceDue > 0 ? 'var(--amber-400)' : 'var(--text-muted)' }}>Balance Due</div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: balanceDue > 0 ? 'var(--amber-400)' : 'var(--green-400)' }}>
                          ₹{balanceDue}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.15rem', marginBottom: '0.25rem' }}>
                      {currentStatus === 'rejected'
                        ? 'Payment Needs Attention'
                        : currentStatus === 'pending'
                        ? (data?.current_payment?.upi_ref?.toLowerCase().includes('cash') ? '💵 Cash Payment Under Verification' : 'Payment Under Verification')
                        : hasShiftedCredit
                        ? 'Pay Remaining Match Balance'
                        : 'Match Fee Payment Process'}
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '340px', marginBottom: '1.25rem' }}>
                      {hasShiftedCredit
                        ? `You have ₹${amountPaid} credit applied. Pay the remaining ₹${balanceDue} to lock your pitch pass!`
                        : currentStatus === 'rejected'
                        ? 'Admin rejected previous reference. Click below to submit with correct UPI ID or screenshot proof.'
                        : currentStatus === 'pending'
                        ? (data?.current_payment?.upi_ref?.toLowerCase().includes('cash')
                            ? 'You marked your payment as cash given to the admin. The admin will confirm your payment shortly.'
                            : 'Your payment proof has been submitted. The admin will confirm your slot shortly.')
                        : 'Pay with any UPI App, scan the QR code, or mark cash paid to the admin.'}
                    </p>

                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{
                        padding: '0.65rem 1.5rem',
                        fontSize: '0.9rem',
                        ...(currentStatus === 'rejected' ? { background: '#dc2626' } : {})
                      }}
                      onClick={() => setModalOpen(true)}
                    >
                      <CreditCard size={17} />
                      <span>
                        {currentStatus === 'rejected'
                          ? 'Pay Again'
                          : currentStatus === 'pending'
                          ? 'Update / Re-submit Payment'
                          : `Pay ₹${balanceDue} for Turf`}
                      </span>
                    </button>
                  </>
                )}
              </div>

              {/* Bottom footer text inside terminal card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-dim)',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                {isAdmin ? (
                  <>
                    <span>Active Squad: <strong style={{ color: 'var(--text-primary)' }}>{playingSquad.length} Players</strong></span>
                    <span>Turf Target: <strong style={{ color: 'var(--amber-400)' }}>₹3,800 Total</strong></span>
                  </>
                ) : (
                  <>
                    <span>Total Lifetime Paid: <strong style={{ color: 'var(--text-primary)' }}>₹{totalPaid}</strong></span>
                    <span>Advance Credits: <strong style={{ color: 'var(--purple-400)' }}>{advanceCredits} week(s)</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SQUAD SECTION: Both Playing and Not Playing lists */}
      {(activeTab === 'dashboard' || activeTab === 'squad' || activeTab === 'all') && (
        <div className="clokin-card" style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-dim)',
            paddingBottom: '1rem',
          }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="var(--green-400)" />
                Friday Match Squad
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Friday, {currentSession?.session_date || 'Upcoming'} @ Elite Football Turf (8:00 PM – 10:00 PM)
              </p>
            </div>

            {/* Switch between Playing vs Not Playing Tabs */}
            <div style={{
              display: 'inline-flex',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '0.25rem',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
            }}>
              <button
                type="button"
                className={`squad-tab-btn ${squadTab === 'playing' ? 'active' : ''}`}
                onClick={() => setSquadTab('playing')}
              >
                Playing Squad ({playingSquad.length})
              </button>
              <button
                type="button"
                className={`squad-tab-btn ${squadTab === 'not_playing' ? 'active' : ''}`}
                onClick={() => setSquadTab('not_playing')}
              >
                Not Playing ({notPlayingSquad.length})
              </button>
            </div>
          </div>

          {squadTab === 'playing' ? (
            /* Playing Squad List */
            playingSquad.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                No players added to the playing squad yet.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '0.85rem',
              }}>
                {playingSquad.map((player, idx) => {
                  const isMe = player.user_id === user.id;
                  return (
                    <div
                      key={player.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1rem',
                        background: isMe ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                        border: isMe ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--border-dim)',
                        borderRadius: '10px',
                        boxShadow: isMe ? '0 0 15px rgba(34, 197, 94, 0.1)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: isMe ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                          color: isMe ? 'var(--green-400)' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}>
                          {idx + 1}
                        </span>
                        <div>
                          <div style={{
                            fontWeight: 700,
                            color: isMe ? 'var(--green-400)' : 'var(--text-primary)',
                            fontSize: '0.88rem',
                          }}>
                            {player.name} {isMe && <span style={{ color: 'var(--green-400)', fontSize: '0.75rem', fontWeight: 800 }}>(You)</span>}
                          </div>
                          {player.status === 'partial' && player.balance > 0 && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--amber-400)' }}>
                              Paid ₹{player.amount} • ₹{player.balance} due
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        {player.status === 'confirmed' && (
                          <span className="badge badge-paid" style={{ fontSize: '0.72rem' }}>Paid Full ✅</span>
                        )}
                        {player.status === 'partial' && (
                          <span className="badge badge-pending" style={{ fontSize: '0.72rem' }}>Partial ⚠️</span>
                        )}
                        {player.status === 'pending' && (
                          <span className="badge badge-pending" style={{ fontSize: '0.72rem' }}>Pending ⏳</span>
                        )}
                        {player.status === 'rejected' && (
                          <span className="badge badge-unpaid" style={{ fontSize: '0.72rem' }}>Rejected ❌</span>
                        )}
                        {player.status === 'unpaid' && (
                          <span className="badge badge-unpaid" style={{ fontSize: '0.72rem' }}>Unpaid ⚠️</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Not Playing Squad List */
            notPlayingSquad.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                Everyone is playing! No players marked as absent.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '0.85rem',
              }}>
                {notPlayingSquad.map((player, idx) => {
                  const isMe = player.user_id === user.id;
                  return (
                    <div
                      key={player.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1rem',
                        background: isMe ? 'rgba(248, 113, 113, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        border: isMe ? '1px solid rgba(248, 113, 113, 0.3)' : '1px solid var(--border-dim)',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}>
                          {idx + 1}
                        </span>
                        <div>
                          <div style={{
                            fontWeight: 700,
                            color: isMe ? 'var(--rose-400)' : 'var(--text-secondary)',
                            fontSize: '0.88rem',
                          }}>
                            {player.name} {isMe && '(You)'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Not Playing this match
                          </div>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-dim)',
                      }}>
                        Out ⚪
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* PAYMENT HISTORY: ONLY confirmed (done), partial, or rejected */}
      {(activeTab === 'dashboard' || activeTab === 'history' || activeTab === 'all') && (
        <div className="clokin-card" style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={20} color="var(--green-400)" />
                Payment History
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Showing completed (done), partial, and rejected transaction logs only.
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.04)', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              Filtered: Confirmed / Partial / Rejected only
            </span>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <History size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>No completed or rejected payments recorded yet.</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Payments that are verified, partially compensated, or rejected by the admin will appear here.
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Match Date</th>
                    <th>Fee Payable</th>
                    <th>Amount Paid</th>
                    <th>Balance</th>
                    <th>Reference / Proof</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.payment_id}>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>Friday, {h.session_date}</strong>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-secondary)' }}>₹{h.payable || payableAmount}</span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--green-400)' }}>₹{h.amount}</strong>
                      </td>
                      <td>
                        {h.balance > 0 ? (
                          <span style={{ color: 'var(--rose-400)', fontWeight: 700 }}>₹{h.balance}</span>
                        ) : (
                          <span style={{ color: 'var(--green-400)', fontWeight: 600 }}>₹0</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <span>
                          {(() => {
                            const ref = h.upi_ref || '';
                            if (ref.includes('[screenshot:')) {
                              const clean = ref.replace(/\[screenshot:.*?\]/g, '').replace(/Screenshot Attached/g, '').trim();
                              return clean ? `${clean} (Screenshot Sent)` : 'Screenshot Sent';
                            }
                            return ref || '—';
                          })()}
                        </span>
                        {h.screenshot_url && (
                          <a
                            href={h.screenshot_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              marginLeft: '0.5rem',
                              fontSize: '0.75rem',
                              color: 'var(--blue-400)',
                              textDecoration: 'underline',
                            }}
                          >
                            View Proof
                          </a>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {h.submitted_at ? new Date(h.submitted_at).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        {h.status === 'confirmed' && (
                          <span className="badge badge-paid">
                            Done / Confirmed ✅
                          </span>
                        )}
                        {h.status === 'partial' && (
                          <span className="badge badge-pending">
                            Partial (₹{h.balance} due) ⚠️
                          </span>
                        )}
                        {h.status === 'rejected' && (
                          <span className="badge badge-unpaid">
                            Rejected ❌
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MATCH SCHEDULE: Upcoming Friday Fixtures */}
      {(activeTab === 'schedule' || activeTab === 'all') && (
        <div className="clokin-card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} color="var(--green-400)" />
            Upcoming Friday Matches
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Schedule of forthcoming sessions at Elite Football Turf (8:00 PM – 10:00 PM)
          </p>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                {isAdmin ? (
                  <tr>
                    <th>Session Date</th>
                    <th>Slot Time</th>
                    <th>Match Fee</th>
                    <th>Turf Collection (from ₹3,800)</th>
                    <th>Turf Booking Status</th>
                    <th style={{ textAlign: 'right' }}>Squad Action</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Session Date</th>
                    <th>Slot Time</th>
                    <th>Match Fee</th>
                    <th>Your Status</th>
                    <th>Action</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {upcomingSessions.map((row, idx) => {
                  const s = row.session;
                  const status = row.status;
                  const collected = row.collected_amount || 0;
                  const target = row.total_turf_target || 3800;
                  const costPerPlayer = row.cost_per_player || s.cost_per_person || 1900;
                  const isTurfPaid = row.is_turf_paid || (collected >= target);

                  return (
                    <tr key={s.id}>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>Friday, {s.session_date}</strong>
                        {idx === 0 && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: 'var(--green-400)', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                            Next Match
                          </span>
                        )}
                      </td>
                      <td>{s.start_time || '20:00'} – {s.end_time || '22:00'}</td>

                      {isAdmin ? (
                        /* ADMIN VIEW */
                        <>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              ₹{costPerPlayer}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              per player
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <strong style={{ color: collected >= target ? 'var(--green-400)' : 'var(--text-primary)', fontSize: '0.92rem' }}>
                                ₹{collected}
                              </strong>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>/ ₹{target}</span>
                            </div>
                            <div style={{
                              width: '110px',
                              height: '5px',
                              background: 'rgba(255,255,255,0.08)',
                              borderRadius: '9999px',
                              overflow: 'hidden',
                              marginTop: '4px'
                            }}>
                              <div style={{
                                width: `${Math.min(100, Math.round((collected / target) * 100))}%`,
                                height: '100%',
                                background: collected >= target ? 'var(--green-500)' : 'linear-gradient(90deg, #3b82f6, #10b981)',
                                borderRadius: '9999px',
                              }} />
                            </div>
                          </td>
                          <td>
                            {isTurfPaid ? (
                              <span className="badge badge-paid" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                <CheckCircle2 size={12} />
                                <span>Paid for Turf ✅</span>
                              </span>
                            ) : collected > 0 ? (
                              <span className="badge badge-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Clock3 size={12} />
                                <span>Pending (₹{Math.max(0, target - collected)} left)</span>
                              </span>
                            ) : (
                              <span className="badge badge-unpaid" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                <AlertCircle size={12} />
                                <span>Unpaid (₹{target} due)</span>
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => {
                                if (setActiveTab) setActiveTab('admin_command');
                                else window.location.href = '/admin';
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.78rem',
                                padding: '0.35rem 0.75rem',
                              }}
                            >
                              <Users size={13} />
                              <span>Manage Squad</span>
                            </button>
                          </td>
                        </>
                      ) : (
                        /* REGULAR PLAYER VIEW */
                        <>
                          <td>₹{costPerPlayer}</td>
                          <td>
                            {status === 'confirmed' && <span className="badge badge-paid">Paid ✅</span>}
                            {status === 'partial' && <span className="badge badge-pending">Partial ⚠️</span>}
                            {status === 'pending' && <span className="badge badge-pending">Pending ⏳</span>}
                            {status === 'rejected' && <span className="badge badge-unpaid">Rejected ❌</span>}
                            {status === 'unpaid' && <span className="badge badge-unpaid">Unpaid</span>}
                          </td>
                          <td>
                            {(status === 'unpaid' || status === 'rejected' || status === 'partial') ? (
                              <button
                                className="btn btn-sm btn-primary"
                                style={status === 'rejected' ? { background: '#dc2626' } : {}}
                                onClick={() => setModalOpen(true)}
                              >
                                {status === 'rejected' ? 'Pay Again' : status === 'partial' ? 'Pay Balance' : 'Pay'}
                              </button>
                            ) : status === 'pending' ? (
                              <span style={{ color: 'var(--amber-400)', fontSize: '0.8rem', fontWeight: 600 }}>Pending ⏳</span>
                            ) : (
                              <span style={{ color: 'var(--green-400)', fontSize: '0.8rem', fontWeight: 600 }}>Covered ✓</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Dialog Modal */}
      <PaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        config={config}
        onPaymentSuccess={handlePaymentSuccess}
        balanceDue={balanceDue}
        payableAmount={payableAmount}
        amountPaid={amountPaid}
        currentSession={currentSession}
        upcomingSessions={upcomingSessions}
      />
    </div>
  );
}

