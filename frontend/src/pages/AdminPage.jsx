import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import SquadModal from '../components/SquadModal';
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
  ArrowRight,
  UserX,
  Pencil,
  Eye
} from 'lucide-react';

export default function AdminPage() {
  const [overview, setOverview] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const [squadModalOpen, setSquadModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(false);
  const [feeInput, setFeeInput] = useState('');
  const [savingFee, setSavingFee] = useState(false);
  const [previewScreenshot, setPreviewScreenshot] = useState(null);

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
      const matchFee = currentSessionObj?.cost_per_person || 200;
      await api.manualPay({
        user_id: userId,
        session_id: selectedSessionId,
        amount: matchFee,
        payment_method: 'Cash / Ground Payment',
      });
      setToast(`Player marked as paid (₹${matchFee} Cash/Direct)!`);
      setTimeout(() => setToast(null), 4000);
      loadRoster(selectedSessionId);
      loadOverview();
    } catch (err) {
      alert(err.message);
    }
  };

  const startEditFee = () => {
    setFeeInput(String(currentSessionObj?.cost_per_person || 200));
    setEditingFee(true);
  };

  const handleSaveFee = async (e) => {
    if (e) e.preventDefault();
    const feeNum = parseInt(feeInput, 10);
    if (isNaN(feeNum) || feeNum <= 0) {
      alert('Please enter a valid match fee (greater than 0)');
      return;
    }
    try {
      setSavingFee(true);
      await api.updateSessionFee(selectedSessionId, feeNum);
      setToast(`Match fee updated to ₹${feeNum} per player!`);
      setTimeout(() => setToast(null), 4000);
      setEditingFee(false);
      loadOverview();
      loadRoster(selectedSessionId);
    } catch (err) {
      alert(err.message || 'Failed to update match fee');
    } finally {
      setSavingFee(false);
    }
  };

  const handleSaveSquad = async (playerIds) => {
    try {
      await api.updateSessionSquad(selectedSessionId, playerIds);
      setToast(`Match squad updated! ${playerIds.length} player(s) selected.`);
      setTimeout(() => setToast(null), 4000);
      loadRoster(selectedSessionId);
      loadOverview();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveFromSquad = async (userId) => {
    if (!window.confirm('Remove this player from this match squad?')) return;
    try {
      await api.removePlayerFromSquad(selectedSessionId, userId);
      setToast('Player removed from match squad.');
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
    setToast('WhatsApp match roster copied to clipboard!');
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
  const currentSquadCount = rosterData?.roster?.length || 0;

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
          <h2 style={{ fontSize: '1.75rem' }}>Turf Squad & Payment Management</h2>
        </div>

        {/* Squad & WhatsApp Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => setSquadModalOpen(true)}
          >
            <Users size={18} />
            <span>Select Match Squad ({currentSquadCount})</span>
          </button>

          <button
            className="btn btn-whatsapp"
            onClick={copyWhatsAppText}
            disabled={!rosterData}
          >
            {copied ? <Check size={18} /> : <Share2 size={18} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy WhatsApp Match List'}</span>
          </button>
        </div>
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
          <div className="stat-label">Registered Players in Group</div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <label className="form-label" htmlFor="session-select">Select Friday Match Session:</label>
            <select
              id="session-select"
              className="form-input"
              style={{ minWidth: '280px', padding: '0.65rem 1rem' }}
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
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <div>
                Slot: <strong style={{ color: '#fff' }}>{currentSessionObj.start_time || '20:00'} - {currentSessionObj.end_time || '22:00'}</strong>
              </div>
              <div>
                Squad Size: <strong style={{ color: '#60a5fa' }}>{currentSquadCount} Players</strong>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                Fee:
                {editingFee ? (
                  <form onSubmit={handleSaveFee} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                    <span style={{ color: '#fff', fontWeight: 600 }}>₹</span>
                    <input
                      type="number"
                      value={feeInput}
                      onChange={(e) => setFeeInput(e.target.value)}
                      style={{
                        width: '75px',
                        padding: '0.25rem 0.4rem',
                        fontSize: '0.85rem',
                        background: '#0d1117',
                        border: '1px solid var(--pitch-green)',
                        color: '#fff',
                        borderRadius: '4px',
                      }}
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={savingFee}
                      className="btn btn-sm btn-primary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      title="Save new fee"
                    >
                      <Check size={13} />
                      <span>{savingFee ? '...' : 'Save'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingFee(false)}
                      className="btn btn-sm btn-secondary"
                      style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
                      title="Cancel"
                    >
                      <XCircle size={13} />
                    </button>
                  </form>
                ) : (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <strong style={{ color: '#fbbf24', fontSize: '1rem' }}>₹{currentSessionObj.cost_per_person || 200}</strong>
                    <button
                      onClick={startEditFee}
                      type="button"
                      className="btn-ghost"
                      style={{
                        padding: '0.2rem 0.45rem',
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: 'rgba(255,255,255,0.04)',
                      }}
                      title="Admin: Change Match Fee"
                    >
                      <Pencil size={11} />
                      <span>Edit</span>
                    </button>
                  </div>
                )}
              </div>
              <div>
                Target: <strong style={{ color: '#fff' }}>₹{rosterData?.summary?.expected_total || 0}</strong>
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
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} color="var(--pitch-green-light)" />
              Match Squad ({currentSquadCount} Players)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {rosterData ? (
                <>
                  <strong style={{ color: '#34d399' }}>{rosterData.summary.confirmed_count} Paid</strong> •{' '}
                  <strong style={{ color: '#fbbf24' }}>{rosterData.summary.pending_count} Pending</strong> •{' '}
                  <strong style={{ color: '#f87171' }}>{rosterData.summary.unpaid_count} Unpaid</strong>
                </>
              ) : 'Loading squad...'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => setSquadModalOpen(true)}
            >
              <Users size={15} />
              <span>Select / Edit Squad</span>
            </button>
            <button
              className="btn btn-sm btn-whatsapp"
              onClick={copyWhatsAppText}
            >
              <Copy size={15} />
              <span>Copy WhatsApp List</span>
            </button>
          </div>
        </div>

        {rosterLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Updating match squad...
          </div>
        ) : currentSquadCount === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed var(--border-subtle)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚽</div>
            <h4 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>No Players Selected for This Friday Yet</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem', maxWidth: '460px', margin: '0 auto 1.25rem' }}>
              Select which players from your group will be playing in this match (e.g. 20 players out of 25).
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setSquadModalOpen(true)}
            >
              <Users size={16} />
              <span>Select Match Squad</span>
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>UPI Ref / UTR</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rosterData?.roster?.map((player, idx) => (
                  <tr key={player.user_id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{idx + 1}</td>
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
                      {player.status === 'rejected' && (
                        <span className="badge badge-unpaid" style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                          Rejected ❌
                        </span>
                      )}
                      {player.status === 'unpaid' && (
                        <span className="badge badge-unpaid">Unpaid ⚠️</span>
                      )}
                    </td>
                    <td>₹{player.amount || currentSessionObj?.cost_per_person || 200}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
                        {player.upi_ref && (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {player.upi_ref}
                          </span>
                        )}
                        {player.screenshot_url && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.75rem',
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#60a5fa',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                            onClick={() => setPreviewScreenshot(player.screenshot_url)}
                            title="View Payment Screenshot Proof"
                          >
                            <Eye size={12} />
                            <span>Proof Image</span>
                          </button>
                        )}
                        {!player.upi_ref && !player.screenshot_url && (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {player.submitted_at
                        ? new Date(player.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
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
                          <>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleManualPay(player.user_id)}
                              title="Player paid cash at turf"
                            >
                              <span>Cash</span>
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleRemoveFromSquad(player.user_id)}
                              title="Remove from this match squad"
                            >
                              <UserX size={14} />
                            </button>
                          </>
                        )}

                        {player.status === 'confirmed' && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--pitch-green-light)', fontWeight: 600 }}>
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
      {rosterData?.whatsapp_text && currentSquadCount > 0 && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
              📱 WhatsApp Message Preview (Only Selected Squad)
            </h4>
            <button className="btn btn-sm btn-whatsapp" onClick={copyWhatsAppText}>
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

      {/* Match Squad Selector Modal */}
      <SquadModal
        isOpen={squadModalOpen}
        onClose={() => setSquadModalOpen(false)}
        sessionDate={currentSessionObj?.session_date}
        allPlayers={rosterData?.all_registered_players || []}
        currentSquadIds={rosterData?.roster?.map((r) => r.user_id) || []}
        onSaveSquad={handleSaveSquad}
      />

      {/* Screenshot Lightbox Modal */}
      {previewScreenshot && (
        <div
          className="modal-backdrop"
          onClick={() => setPreviewScreenshot(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '1.25rem',
              textAlign: 'center',
              background: '#0d1520',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={18} color="var(--pitch-green-light)" /> Payment Screenshot Proof
              </h4>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: '0.2rem 0.5rem',
                }}
                onClick={() => setPreviewScreenshot(null)}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                maxHeight: '65vh',
                overflowY: 'auto',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: '#000',
              }}
            >
              <img
                src={previewScreenshot}
                alt="Payment Screenshot Proof"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <a
                href={previewScreenshot}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-secondary"
              >
                Open Full Size
              </a>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setPreviewScreenshot(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
