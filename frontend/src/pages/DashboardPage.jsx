import React, { useState, useEffect } from 'react';
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
  TrendingUp,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export default function DashboardPage({ user }) {
  const [data, setData] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

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
      console.error(err);
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

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚽</div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading your turf schedule and payment status...</p>
      </div>
    );
  }

  const currentSession = data?.current_session;
  const currentStatus = data?.current_status || 'unpaid';
  const advanceCredits = data?.advance_credits || 0;
  const totalPaid = data?.total_paid_confirmed || 0;
  const history = data?.history || [];
  const upcomingSessions = data?.upcoming_sessions || [];

  return (
    <div>
      {/* Toast message */}
      {toast && (
        <div className="toast-bar">
          <CheckCircle2 size={18} color="var(--pitch-green-light)" />
          <span>{toast}</span>
        </div>
      )}

      {/* Hero Match Banner */}
      <div className="hero-card">
        <div className="hero-glow" />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--pitch-green-light)', border: '1px solid var(--border-accent)', marginBottom: '0.6rem' }}>
                ⚽ Next Match Scheduled
              </span>
              <h2 style={{ fontSize: '1.85rem', fontWeight: 800 }}>
                {currentSession ? `Friday, ${currentSession.session_date}` : 'Upcoming Friday Match'}
              </h2>
            </div>

            {/* Status Badge */}
            <div>
              {currentStatus === 'confirmed' && (
                <span className="badge badge-paid" style={{ fontSize: '0.9rem', padding: '0.45rem 1rem' }}>
                  <CheckCircle2 size={16} /> Paid & Confirmed
                </span>
              )}
              {currentStatus === 'pending' && (
                <span className="badge badge-pending" style={{ fontSize: '0.9rem', padding: '0.45rem 1rem' }}>
                  <Clock3 size={16} /> Verification Pending
                </span>
              )}
              {currentStatus === 'unpaid' && (
                <span className="badge badge-unpaid" style={{ fontSize: '0.9rem', padding: '0.45rem 1rem' }}>
                  <AlertCircle size={16} /> Payment Due
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.75rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={17} color="var(--pitch-green-light)" />
              <strong style={{ color: '#fff' }}>8:00 PM – 10:00 PM</strong> (2 Hours)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={17} color="var(--pitch-green-light)" />
              <span>Elite Football Turf</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={17} color="var(--pitch-green-light)" />
              <span>Fee: <strong style={{ color: '#fff' }}>₹200</strong> / player</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}
              onClick={() => setModalOpen(true)}
            >
              <CreditCard size={18} />
              <span>
                {currentStatus === 'confirmed'
                  ? 'Pay for Advance Weeks (₹200/wk)'
                  : 'Pay for Turf (₹200)'}
              </span>
            </button>

            {currentStatus === 'confirmed' && (
              <span style={{ fontSize: '0.85rem', color: 'var(--pitch-green-light)' }}>
                ✓ You're all set for this Friday! Click above to pay in advance for future weeks.
              </span>
            )}
            {currentStatus === 'pending' && (
              <span style={{ fontSize: '0.85rem', color: 'var(--amber)' }}>
                Your payment reference has been submitted. The admin will verify shortly.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-label">This Friday's Status</div>
          <div className="stat-val" style={{
            fontSize: '1.35rem',
            color: currentStatus === 'confirmed' ? 'var(--pitch-green-light)' : currentStatus === 'pending' ? 'var(--amber)' : 'var(--rose)'
          }}>
            {currentStatus === 'confirmed' ? 'Confirmed ✅' : currentStatus === 'pending' ? 'Pending ⏳' : 'Not Paid ⚠️'}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Advance Prepaid Credits</div>
          <div className="stat-val" style={{ color: '#c084fc' }}>
            {advanceCredits} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Week(s)</span>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Total Amount Paid</div>
          <div className="stat-val" style={{ color: 'var(--pitch-green-light)' }}>
            ₹{totalPaid.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Upcoming Sessions List */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color="var(--pitch-green-light)" />
          Upcoming Friday Schedule & Your Status
        </h3>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time Slot</th>
                <th>Fee</th>
                <th>Your Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {upcomingSessions.map((row, idx) => {
                const s = row.session;
                const status = row.status;
                return (
                  <tr key={s.id}>
                    <td>
                      <strong style={{ color: '#fff' }}>Friday, {s.session_date}</strong>
                      {idx === 0 && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--pitch-green-light)' }}>(This Friday)</span>}
                    </td>
                    <td>{s.start_time || '20:00'} - {s.end_time || '22:00'}</td>
                    <td>₹{s.cost_per_person || 200}</td>
                    <td>
                      {status === 'confirmed' && <span className="badge badge-paid">Paid ✅</span>}
                      {status === 'pending' && <span className="badge badge-pending">Pending ⏳</span>}
                      {status === 'unpaid' && <span className="badge badge-unpaid">Unpaid</span>}
                    </td>
                    <td>
                      {status === 'unpaid' ? (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setModalOpen(true)}
                        >
                          Pay
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Covered</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History */}
      <div className="card">
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={18} color="var(--pitch-green-light)" />
          Payment History
        </h3>

        {history.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No past payment submissions found. Click "Make Payment" to record your first Friday payment.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Session Date</th>
                  <th>Amount</th>
                  <th>UPI UTR / Reference</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.payment_id}>
                    <td>Friday, {h.session_date}</td>
                    <td><strong style={{ color: 'var(--pitch-green-light)' }}>₹{h.amount}</strong></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{h.upi_ref || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                      {h.submitted_at ? new Date(h.submitted_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      {h.status === 'confirmed' && <span className="badge badge-paid">Confirmed</span>}
                      {h.status === 'pending' && <span className="badge badge-pending">Pending</span>}
                      {h.status === 'rejected' && <span className="badge badge-unpaid">Rejected</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic Payment Dialog */}
      <PaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        config={config}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
