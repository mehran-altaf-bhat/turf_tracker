import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  Users,
  Share2,
  Copy,
  PlusCircle,
  AlertCircle,
  Check,
  ArrowRight
} from 'lucide-react';

export default function AdminPage() {
  const [overview, setOverview] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminOverview();
      setOverview(data);
      if (data.sessions && data.sessions.length > 0) {
        // Pick current or first session
        const initialId = data.current_session?.session?.id || data.sessions[0].session.id;
        setSelectedSessionId(initialId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRoster = async (sessionId) => {
    if (!sessionId) return;
    try {
      setRosterLoading(true);
      const data = await api.getSessionRoster(sessionId);
      setRosterData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRosterLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadRoster(selectedSessionId);
    }
  }, [selectedSessionId]);

  const handleConfirm = async (paymentId) => {
    try {
      await api.confirmPayment(paymentId);
      setToast('Payment confirmed successfully!');
      setTimeout(() => setToast(null), 4000);
      loadRoster(selectedSessionId);
      loadOverview();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (paymentId) => {
    if (!window.confirm('Are you sure you want to reject this payment?')) return;
    try {
      await api.rejectPayment(paymentId);
      setToast('Payment marked as rejected.');
      setTimeout(() => setToast(null), 4000);
      loadRoster(selectedSessionId);
      loadOverview();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleManualPay = async (userId) => {
    try {
      await api.manualPay({
        user_id: userId,
        session_id: selectedSessionId,
        amount: 200,
        payment_method: 'Cash / Ground Payment',
      });
      setToast('Player marked as paid (Cash/Direct)!');
      setTimeout(() => setToast(null), 4000);
      loadRoster(selectedSessionId);
      loadOverview();
    } catch (err) {
      alert(err.message);
    }
  };

  const copyWhatsAppText = () => {
    if (!rosterData?.whatsapp_text) return;
    navigator.clipboard.writeText(rosterData.whatsapp_text);
    setCopied(true);
    setToast('WhatsApp roster copied to clipboard!');
    setTimeout(() => {
      setCopied(false);
      setToast(null);
    }, 4000);
  };

  if (loading && !overview) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚽</div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Admin Command Center...</p>
      </div>
    );
  }

  const stats = overview?.stats || {};
  const sessions = overview?.sessions || [];
  const currentSessionObj = sessions.find((s) => s.session.id === selectedSessionId)?.session;

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div className="toast-bar">
          <CheckCircle size={18} color="var(--pitch-green-light)" />
          <span>{toast}</span>
        </div>
      )}

      {/* Admin Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '0.4rem' }}>
            <ShieldCheck size={14} /> Admin Command Center
          </span>
          <h2 style={{ fontSize: '1.75rem' }}>Turf Finance & Roster Management</h2>
        </div>

        {/* WhatsApp Share Button */}
        <button
          className="btn btn-whatsapp"
          onClick={copyWhatsAppText}
          disabled={!rosterData}
        >
          {copied ? <Check size={18} /> : <Share2 size={18} />}
          <span>{copied ? 'Copied to Clipboard!' : 'Copy WhatsApp Match List'}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-label">Total Revenue Collected</div>
          <div className="stat-val" style={{ color: 'var(--pitch-green-light)' }}>
            ₹{stats.total_revenue_collected?.toLocaleString() || 0}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Pending Approvals</div>
          <div className="stat-val" style={{ color: stats.total_pending_approvals > 0 ? 'var(--amber)' : '#fff' }}>
            {stats.total_pending_approvals || 0}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Registered Players</div>
          <div className="stat-val" style={{ color: '#60a5fa' }}>
            {stats.total_players_registered || 0}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Total Sessions</div>
          <div className="stat-val">
            {stats.total_sessions_count || 0}
          </div>
        </div>
      </div>

      {/* Match Session Selector Bar */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <label className="form-label" htmlFor="session-select">Select Friday Session to Manage:</label>
            <select
              id="session-select"
              className="form-input"
              style={{ minWidth: '260px', padding: '0.6rem 1rem' }}
              value={selectedSessionId || ''}
              onChange={(e) => setSelectedSessionId(Number(e.target.value))}
            >
              {sessions.map((item) => (
                <option key={item.session.id} value={item.session.id}>
                  Friday, {item.session.session_date} — ({item.confirmed_count} Paid, ₹{item.collected_amount})
                </option>
              ))}
            </select>
          </div>

          {currentSessionObj && (
            <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <div>
                Slot: <strong style={{ color: '#fff' }}>{currentSessionObj.start_time || '20:00'} - {currentSessionObj.end_time || '22:00'}</strong>
              </div>
              <div>
                Fee: <strong style={{ color: 'var(--pitch-green-light)' }}>₹{currentSessionObj.cost_per_person || 200}</strong>
              </div>
              <div>
                Collected: <strong style={{ color: '#34d399' }}>₹{rosterData?.summary?.total_collected || 0}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Roster & Attendance Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem' }}>
              Player Roster & Payment Status
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {rosterData ? (
                <>
                  <strong style={{ color: '#34d399' }}>{rosterData.summary.confirmed_count} Paid</strong> •{' '}
                  <strong style={{ color: '#fbbf24' }}>{rosterData.summary.pending_count} Pending</strong> •{' '}
                  <strong style={{ color: '#f87171' }}>{rosterData.summary.unpaid_count} Unpaid</strong>
                </>
              ) : 'Loading roster...'}
            </p>
          </div>

          <button
            className="btn btn-sm btn-whatsapp"
            onClick={copyWhatsAppText}
          >
            <Copy size={15} />
            <span>Copy WhatsApp Roster</span>
          </button>
        </div>

        {rosterLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Updating player roster...
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Player Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>UPI Ref / UTR</th>
                  <th>Submitted At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rosterData?.roster?.map((player) => (
                  <tr key={player.user_id}>
                    <td>
                      <strong style={{ color: '#fff' }}>{player.name}</strong>
                    </td>
                    <td>
                      <span className={`role-tag ${player.role}`}>{player.role}</span>
                    </td>
                    <td>
                      {player.status === 'confirmed' && (
                        <span className="badge badge-paid">Paid ✅</span>
                      )}
                      {player.status === 'pending' && (
                        <span className="badge badge-pending">Pending ⏳</span>
                      )}
                      {player.status === 'unpaid' && (
                        <span className="badge badge-unpaid">Unpaid ⚠️</span>
                      )}
                    </td>
                    <td>₹{player.amount || 200}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {player.upi_ref || '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {player.submitted_at
                        ? new Date(player.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {player.status === 'pending' && player.payment && (
                          <>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleConfirm(player.payment.id)}
                              title="Approve / Confirm Payment"
                            >
                              <CheckCircle size={15} />
                              <span>Approve</span>
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleReject(player.payment.id)}
                              title="Reject Payment"
                            >
                              <XCircle size={15} />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {player.status === 'unpaid' && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleManualPay(player.user_id)}
                            title="Player paid cash at turf"
                          >
                            <span>Mark Paid (Cash)</span>
                          </button>
                        )}

                        {player.status === 'confirmed' && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--pitch-green-light)' }}>
                            Verified ✓
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WhatsApp Preview Box */}
      {rosterData?.whatsapp_text && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
              📱 WhatsApp Message Preview (Ready to Share)
            </h4>
            <button className="btn btn-sm btn-secondary" onClick={copyWhatsAppText}>
              <Copy size={14} />
              <span>Copy</span>
            </button>
          </div>
          <pre style={{
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            color: '#e2e8f0',
            lineHeight: 1.6,
          }}>
            {rosterData.whatsapp_text}
          </pre>
        </div>
      )}
    </div>
  );
}
