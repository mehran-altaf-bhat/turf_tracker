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
  Eye,
  UserPlus,
  Phone,
  X,
  Trash2,
} from 'lucide-react';

export default function AdminPage({ setActiveTab }) {
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
  const [feesModalOpen, setFeesModalOpen] = useState(false);
  const [rowFeeInputs, setRowFeeInputs] = useState({});
  const [savingMatchId, setSavingMatchId] = useState(null);
  const [previewScreenshot, setPreviewScreenshot] = useState(null);

  // Screenshot preview lightbox

  // Manage Players Modal
  const [managePlayersModalOpen, setManagePlayersModalOpen] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [deletingUserId, setDeletingUserId] = useState(null);

  // Edit player paid amount & balance
  const [editPaymentModalOpen, setEditPaymentModalOpen] = useState(false);
  const [targetPlayer, setTargetPlayer] = useState(null);
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [paymentNoteInput, setPaymentNoteInput] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Add Match Session / Old Friday state
  const [addSessionModalOpen, setAddSessionModalOpen] = useState(false);
  const [sessionDateInput, setSessionDateInput] = useState('');
  const [sessionCostInput, setSessionCostInput] = useState('200');
  const [sessionStartTimeInput, setSessionStartTimeInput] = useState('20:00');
  const [sessionEndTimeInput, setSessionEndTimeInput] = useState('22:00');
  const [sessionStatusInput, setSessionStatusInput] = useState('completed');
  const [sessionPopulateSquad, setSessionPopulateSquad] = useState(true);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const [batchAddingPast, setBatchAddingPast] = useState(false);

  const getSuggestedPastFridays = () => {
    const today = new Date();
    const suggestions = [];
    const currentDay = today.getDay(); // 0: Sun, 5: Fri
    let daysBack = (currentDay - 5 + 7) % 7;
    if (daysBack === 0) daysBack = 7;

    for (let i = 0; i < 6; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - (daysBack + i * 7));
      const iso = d.toISOString().split('T')[0];
      const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      suggestions.push({ iso, label: formatted });
    }
    return suggestions;
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionDateInput) {
      setSessionError('Please select a match date');
      return;
    }
    setSavingSession(true);
    setSessionError(null);
    try {
      const res = await api.createSession({
        session_date: sessionDateInput,
        start_time: sessionStartTimeInput,
        end_time: sessionEndTimeInput,
        cost_per_person: Number(sessionCostInput) || 200,
        status: sessionStatusInput,
        populate_all_players: sessionPopulateSquad,
      });
      setToast(res.message || 'Friday match record created!');
      setTimeout(() => setToast(null), 4000);
      setAddSessionModalOpen(false);
      setSessionDateInput('');

      const newSid = res.session?.id;
      const data = await api.getAdminOverview();
      setOverview(data);
      if (newSid) {
        setSelectedSessionId(newSid);
        loadRoster(newSid);
      }
    } catch (err) {
      setSessionError(err.message || 'Failed to create match session');
    } finally {
      setSavingSession(false);
    }
  };

  const handleQuickAddPastFridays = async (weeks = 4) => {
    if (!window.confirm(`Generate the last ${weeks} Friday match records automatically with registered players squad?`)) return;
    setBatchAddingPast(true);
    setSessionError(null);
    try {
      const res = await api.addPastFridays({
        weeks_count: weeks,
        cost_per_person: 200,
        status: 'completed',
        populate_all_players: true,
      });
      setToast(res.message);
      setTimeout(() => setToast(null), 5000);
      setAddSessionModalOpen(false);
      const data = await api.getAdminOverview();
      setOverview(data);
    } catch (err) {
      alert(err.message || 'Failed to add past Fridays');
    } finally {
      setBatchAddingPast(false);
    }
  };

  const handleDeleteSession = async (sessionId, sessionDate) => {
    if (!sessionId) return;
    if (!window.confirm(`Are you sure you want to permanently delete the match session for Friday ${sessionDate} and all its payment records?`)) return;
    try {
      const res = await api.deleteSession(sessionId);
      setToast(res.message || 'Match session removed');
      setTimeout(() => setToast(null), 4000);
      const data = await api.getAdminOverview();
      setOverview(data);
      if (data.sessions && data.sessions.length > 0) {
        const nextId = data.current_session?.session?.id || data.sessions[0].session.id;
        setSelectedSessionId(nextId);
        loadRoster(nextId);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete session');
    }
  };

  const handleDeleteUser = async (userId, playerName) => {
    if (!window.confirm(`Are you sure you want to permanently remove "${playerName}" and their data from the turf tracker?`)) return;
    setDeletingUserId(userId);
    try {
      const res = await api.deleteUser(userId);
      setToast(res.message || `Removed "${playerName}"!`);
      setTimeout(() => setToast(null), 4000);
      await Promise.all([loadOverview(), loadRoster(selectedSessionId)]);
    } catch (err) {
      alert(err.message || 'Failed to remove player');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleClearAllData = async () => {
    const confirmation = window.prompt(
      'Type CLEAR to confirm clearing ALL match payment and attendance records.\nThis will reset all session balances to a clean slate:'
    );
    if (confirmation !== 'CLEAR') return;
    try {
      const res = await api.clearAllData();
      setToast(res.message);
      setTimeout(() => setToast(null), 5000);
      await Promise.all([loadOverview(), loadRoster(selectedSessionId)]);
    } catch (err) {
      alert(err.message || 'Failed to clear data');
    }
  };

  const openEditPaymentModal = (player) => {
    setTargetPlayer(player);
    setAmountPaidInput(player.amount_paid !== undefined ? String(player.amount_paid) : String(player.amount || 0));
    setPaymentNoteInput(player.upi_ref || '');
    setEditPaymentModalOpen(true);
  };

  const handleSavePaymentAmount = async (e) => {
    e.preventDefault();
    if (!targetPlayer) return;
    setSavingPayment(true);
    try {
      const amt = Number(amountPaidInput) || 0;
      if (targetPlayer.payment_id) {
        await api.updatePaymentAmount(targetPlayer.payment_id, {
          amount_paid: amt,
          note: paymentNoteInput || undefined,
        });
      } else {
        await api.manualPay({
          user_id: targetPlayer.user_id,
          session_id: selectedSessionId,
          amount: amt,
          payment_method: paymentNoteInput || 'Cash / Direct',
        });
      }
      setToast(`Updated payment for ${targetPlayer.name}: Paid ₹${amt}!`);
      setTimeout(() => setToast(null), 4000);
      setEditPaymentModalOpen(false);
      loadRoster(selectedSessionId);
      loadOverview();
    } catch (err) {
      alert(err.message || 'Failed to update payment');
    } finally {
      setSavingPayment(false);
    }
  };

  const loadOverview = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminOverview();
      setOverview(data);
      if (data.sessions && data.sessions.length > 0) {
        setSelectedSessionId((prev) => {
          if (prev && data.sessions.some((s) => s.session.id === prev)) {
            return prev;
          }
          return data.current_session?.session?.id || data.sessions[0].session.id;
        });
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

  const handleClearBalance = async (paymentId, playerName) => {
    try {
      await api.clearBalance(paymentId);
      setToast(`Balance cleared for ${playerName}! Marked as Paid Full ✅`);
      setTimeout(() => setToast(null), 4000);
      loadRoster(selectedSessionId);
      loadOverview();
    } catch (err) {
      alert(err.message || 'Failed to clear balance');
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

  const handleUpdateMatchFee = async (sessionId) => {
    const feeVal = parseInt(rowFeeInputs[sessionId], 10);
    if (isNaN(feeVal) || feeVal <= 0) {
      alert('Please enter a valid match fee (greater than 0)');
      return;
    }
    try {
      setSavingMatchId(sessionId);
      await api.updateSessionFee(sessionId, feeVal);
      setToast(`Match fee updated to ₹${feeVal}!`);
      setTimeout(() => setToast(null), 4000);
      await loadOverview();
      if (selectedSessionId === sessionId) {
        loadRoster(sessionId);
      }
    } catch (err) {
      alert(err.message || 'Failed to update fee');
    } finally {
      setSavingMatchId(null);
    }
  };

  const handleSaveSquad = async (playerIds, totalTurfCost = 3800) => {
    try {
      const res = await api.updateSessionSquad(selectedSessionId, playerIds, totalTurfCost);
      setToast(res.message || `Match squad updated! ${playerIds.length} player(s) confirmed.`);
      setTimeout(() => setToast(null), 5000);
      await Promise.all([loadRoster(selectedSessionId), loadOverview()]);
    } catch (err) {
      alert(err.message || 'Failed to update match squad');
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
          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--amber-400)', border: '1px solid rgba(245, 158, 11, 0.35)', marginBottom: '0.4rem' }}>
            <ShieldCheck size={14} /> Admin Command Center
          </span>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--text-primary)' }}>Turf Squad & Payment Management</h2>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            style={{
              background: '#047857',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: 600,
            }}
            onClick={() => {
              setSessionError(null);
              setAddSessionModalOpen(true);
            }}
            title="Add old Friday match records or schedule custom matches"
          >
            <Calendar size={17} />
            <span>+ Add Friday / Old Record</span>
          </button>



          <button
            type="button"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}
            onClick={() => {
              if (setActiveTab) {
                setActiveTab('users');
              } else {
                setPlayerSearchQuery('');
                setManagePlayersModalOpen(true);
              }
            }}
            title="Open dedicated User Management module"
          >
            <Users size={17} color="#2563eb" />
            <span>Manage Players ({overview?.all_profiles?.length || 0})</span>
          </button>

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

          <button
            type="button"
            className="btn btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 600,
              background: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--rose-400)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '0.5rem 0.85rem',
            }}
            onClick={handleClearAllData}
            title="Reset and clear all match payments data"
          >
            <Trash2 size={15} />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-label">Total Revenue Collected</div>
          <div className="stat-val" style={{ color: 'var(--pitch-green-dark)' }}>
            ₹{stats.total_revenue_collected?.toLocaleString() || 0}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Pending Approvals</div>
          <div className="stat-val" style={{ color: stats.total_pending_approvals > 0 ? 'var(--amber)' : 'var(--text-primary)' }}>
            {stats.total_pending_approvals || 0}
          </div>
        </div>

        <div
          className="stat-box"
          style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => {
            setPlayerSearchQuery('');
            setManagePlayersModalOpen(true);
          }}
          title="Click to view and manage registered players"
        >
          <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Registered Players</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--blue-400)', fontWeight: 700 }}>Manage 👥</span>
          </div>
          <div className="stat-val" style={{ color: 'var(--blue-400)' }}>
            {stats.total_players_registered || 0}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Total Sessions</div>
          <div className="stat-val" style={{ color: 'var(--text-primary)' }}>
            {stats.total_sessions_count || 0}
          </div>
        </div>
      </div>

      {/* Match Session Selector Bar */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <label className="form-label" htmlFor="session-select">Select Friday Match Session:</label>
              <select
                id="session-select"
                className="form-input"
                style={{ minWidth: '340px', padding: '0.65rem 1rem' }}
                value={selectedSessionId || ''}
                onChange={(e) => setSelectedSessionId(Number(e.target.value))}
              >
                {sessions.map((item) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isPast = item.session.session_date < todayStr;
                  return (
                    <option key={item.session.id} value={item.session.id}>
                      {isPast ? '⏪ [Past Match] ' : '⚽ [Upcoming] '}
                      Friday, {item.session.session_date} — Fee: ₹{item.session.cost_per_person || 200} ({item.confirmed_count} Paid, ₹{item.collected_amount})
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1rem' }}
              onClick={() => {
                const initialMap = {};
                sessions.forEach((s) => {
                  initialMap[s.session.id] = s.session.cost_per_person || 200;
                });
                setRowFeeInputs(initialMap);
                setFeesModalOpen(true);
              }}
              title="View and edit fee for every match session"
            >
              <DollarSign size={16} color="#fbbf24" />
              <span>Edit Match Fees</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 0.95rem' }}
              onClick={() => {
                setSessionError(null);
                setAddSessionModalOpen(true);
              }}
              title="Add past Friday match records or schedule new games"
            >
              <PlusCircle size={16} color="#059669" />
              <span>+ Add Match Record</span>
            </button>

            {sessions.length > 1 && (
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: 'var(--rose-400)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontWeight: 600,
                }}
                onClick={() => handleDeleteSession(selectedSessionId, currentSessionObj?.session_date)}
                title="Delete this match session and its payments"
              >
                <Trash2 size={15} />
                <span>Delete Match</span>
              </button>
            )}
          </div>

          {currentSessionObj && (
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <div>
                Slot: <strong style={{ color: 'var(--text-primary)' }}>{currentSessionObj.start_time || '20:00'} - {currentSessionObj.end_time || '22:00'}</strong>
              </div>
              <div>
                Squad Size: <strong style={{ color: 'var(--blue-400)' }}>{currentSquadCount} Players</strong>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                Fee:
                {editingFee ? (
                  <form onSubmit={handleSaveFee} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>₹</span>
                    <input
                      type="number"
                      value={feeInput}
                      onChange={(e) => setFeeInput(e.target.value)}
                      style={{
                        width: '75px',
                        padding: '0.25rem 0.4rem',
                        fontSize: '0.85rem',
                        background: 'var(--bg-layer-1)',
                        border: '1px solid var(--border-focus)',
                        color: 'var(--text-primary)',
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
                    <strong style={{ color: 'var(--amber-400)', fontSize: '1rem' }}>₹{currentSessionObj.cost_per_person || 200}</strong>
                    <button
                      onClick={startEditFee}
                      type="button"
                      className="btn-ghost"
                      style={{
                        padding: '0.2rem 0.45rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.05)',
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
                Target: <strong style={{ color: 'var(--text-primary)' }}>₹{rosterData?.summary?.expected_total || 0}</strong>
              </div>
              <div>
                Collected: <strong style={{ color: 'var(--green-400)' }}>₹{rosterData?.summary?.total_collected || 0}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Roster & Attendance Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Users size={20} color="var(--green-400)" />
              Match Squad ({currentSquadCount} Players)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {rosterData ? (
                <>
                  <strong style={{ color: 'var(--green-400)' }}>{rosterData.summary.confirmed_count} Paid</strong> •{' '}
                  <strong style={{ color: 'var(--amber-400)' }}>{rosterData.summary.pending_count} Pending</strong> •{' '}
                  <strong style={{ color: 'var(--rose-400)' }}>{rosterData.summary.unpaid_count} Unpaid</strong>
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
            <h4 style={{ fontSize: '1.2rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>No Players Selected for This Friday Yet</h4>
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
                  <th>Match Fee</th>
                  <th>Paid</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th>UPI Ref / Proof</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rosterData?.roster?.map((player, idx) => {
                  const fee = player.payable || currentSessionObj?.cost_per_person || 200;
                  const paid = player.amount_paid || 0;
                  const balance = player.balance !== undefined ? player.balance : Math.max(0, fee - paid);
                  return (
                    <tr key={player.user_id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{idx + 1}</td>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>{player.name}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {player.role}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>₹{fee}</span>
                      </td>
                      <td>
                        <strong style={{ color: paid > 0 ? 'var(--green-400)' : 'var(--text-muted)' }}>
                          ₹{paid}
                        </strong>
                      </td>
                      <td>
                        {balance > 0 ? (
                          <span style={{ color: 'var(--rose-400)', fontWeight: 700, background: 'rgba(248, 113, 113, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(248, 113, 113, 0.3)' }}>
                            ₹{balance} due
                          </span>
                        ) : (
                          <span style={{ color: 'var(--green-400)', fontWeight: 600, background: 'rgba(34, 197, 94, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                            ₹0 (Clear)
                          </span>
                        )}
                      </td>
                      <td>
                        {player.status === 'confirmed' && (
                          <span className="badge badge-paid">Paid ✅</span>
                        )}
                        {player.status === 'partial' && (
                          <span className="badge badge-pending">Partial ⚠️</span>
                        )}
                        {player.status === 'pending' && (
                          <span className="badge badge-pending">Pending ⏳</span>
                        )}
                        {player.status === 'rejected' && (
                          <span className="badge badge-unpaid">
                            Rejected ❌
                          </span>
                        )}
                        {player.status === 'unpaid' && (
                          <span className="badge badge-unpaid">Unpaid ❌</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                          {player.upi_ref && (
                            player.upi_ref.toLowerCase().includes('cash') ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: 'rgba(34, 197, 94, 0.15)',
                                color: 'var(--green-400)',
                                border: '1px solid rgba(34, 197, 94, 0.35)',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                              }}>
                                <span>💵</span>
                                <span>{player.upi_ref}</span>
                              </span>
                            ) : (
                              <span style={{ fontFamily: player.upi_ref?.includes('Screenshot') ? 'inherit' : 'monospace', fontSize: '0.8rem' }}>
                                {player.upi_ref}
                              </span>
                            )
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
                                background: 'rgba(59, 130, 246, 0.12)',
                                color: 'var(--blue-400)',
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
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* Edit / Update Paid Button (Allows setting e.g. 200 of 230) */}
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.65rem' }}
                            onClick={() => openEditPaymentModal(player)}
                            title="Edit Paid Amount & Balance"
                          >
                            <Pencil size={12} />
                            <span>Edit Paid</span>
                          </button>

                          {player.status === 'pending' && player.payment && (
                            <>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleConfirm(player.payment.id)}
                                title={player.upi_ref?.toLowerCase().includes('cash') ? "Confirm Cash Received" : "Approve / Confirm Payment"}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                }}
                              >
                                <CheckCircle size={14} />
                                <span>{player.upi_ref?.toLowerCase().includes('cash') ? 'Confirm Cash' : 'Approve'}</span>
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleReject(player.payment.id)}
                                title="Reject Payment"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}

                          {player.status === 'unpaid' && (
                            <>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleManualPay(player.user_id)}
                                title="Mark full payment via Cash"
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

                          {player.status === 'partial' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              style={{ background: '#059669', color: '#ffffff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              onClick={() => handleClearBalance(player.payment_id, player.name)}
                              title="Clear remaining balance (Mark Paid Full)"
                            >
                              <Check size={13} />
                              <span>Clear Bal</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
            background: 'var(--bg-layer-1)',
            border: '1px solid var(--border-subtle)',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            color: 'var(--text-primary)',
            lineHeight: 1.6,
          }}>
            {rosterData.whatsapp_text}
          </pre>
        </div>
      )}

      {/* Match Squad Selector Modal with Dynamic Split */}
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
            background: 'rgba(10, 15, 30, 0.75)',
            backdropFilter: 'blur(6px)',
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
              padding: '1.5rem',
              textAlign: 'center',
              background: 'var(--bg-layer-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <Eye size={18} color="var(--green-400)" /> Payment Screenshot Proof
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
                background: 'var(--bg-layer-1)',
                padding: '0.5rem',
              }}
            >
              <img
                src={previewScreenshot}
                alt="Payment Screenshot Proof"
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
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

      {/* Match Fees Management Modal */}
      {feesModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setFeesModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
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
              maxWidth: '650px',
              width: '100%',
              padding: '1.75rem',
              background: 'linear-gradient(135deg, rgba(20, 29, 53, 0.98) 0%, rgba(15, 22, 41, 0.98) 100%)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <DollarSign size={20} color="var(--amber-400)" /> Manage Match Fees (Per Match)
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Set the match fee for each Friday session. Changes immediately update player dashboards, QR codes, and roster targets.
                </p>
              </div>
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
                onClick={() => setFeesModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="table-wrap" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Match Date</th>
                    <th>Slot</th>
                    <th>Current Fee</th>
                    <th>Update Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((item) => {
                    const s = item.session;
                    const isSelected = s.id === selectedSessionId;
                    return (
                      <tr key={s.id} style={{ background: isSelected ? 'rgba(34, 197, 94, 0.08)' : undefined }}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)' }}>Friday, {s.session_date}</strong>
                          {isSelected && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--green-400)', fontWeight: 600 }}>
                              (Selected)
                            </span>
                          )}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {item.confirmed_count} Paid • ₹{item.collected_amount}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {s.start_time || '20:00'} - {s.end_time || '22:00'}
                        </td>
                        <td>
                          <strong style={{ color: 'var(--amber-400)', fontSize: '1rem' }}>
                            ₹{s.cost_per_person || 200}
                          </strong>
                        </td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>₹</span>
                            <input
                              type="number"
                              value={rowFeeInputs[s.id] ?? (s.cost_per_person || 200)}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRowFeeInputs((prev) => ({ ...prev, [s.id]: val }));
                              }}
                              style={{
                                width: '75px',
                                padding: '0.25rem 0.4rem',
                                fontSize: '0.85rem',
                                background: 'var(--bg-layer-1)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                                borderRadius: '4px',
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                              disabled={savingMatchId === s.id}
                              onClick={() => handleUpdateMatchFee(s.id)}
                            >
                              {savingMatchId === s.id ? '...' : 'Save'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFeesModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Amount & Balance Modal */}
      {editPaymentModalOpen && targetPlayer && (
        <div className="modal-backdrop" onClick={() => setEditPaymentModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '460px', width: '95%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Update Player Payment</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {targetPlayer.name} • Match #{selectedSessionId}
                </p>
              </div>
              <button className="btn-close" onClick={() => setEditPaymentModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePaymentAmount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Fee & Balance Live Summary */}
              {(() => {
                const matchFee = targetPlayer.payable || currentSessionObj?.cost_per_person || 200;
                const enteredAmt = Number(amountPaidInput) || 0;
                const balance = Math.max(0, matchFee - enteredAmt);
                return (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Match Fee (Payable):</span>
                      <strong style={{ color: 'var(--text-primary)' }}>₹{matchFee}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Amount Paid:</span>
                      <strong style={{ color: 'var(--green-400)' }}>₹{enteredAmt}</strong>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      borderTop: '1px dashed var(--border-subtle)',
                      paddingTop: '0.4rem',
                      color: balance > 0 ? 'var(--rose-400)' : 'var(--green-400)',
                    }}>
                      <span>Balance Due:</span>
                      <span>{balance > 0 ? `₹${balance} due` : '₹0 (Fully Paid)'}</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>
                  Enter Amount Paid by Player (₹):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#64748b' }}>₹</span>
                  <input
                    type="number"
                    className="form-input"
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                    placeholder="e.g. 200"
                    min="0"
                    style={{ fontSize: '1.05rem', fontWeight: 700 }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>
                  Payment Method / UTR Note:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={paymentNoteInput}
                  onChange={(e) => setPaymentNoteInput(e.target.value)}
                  placeholder="e.g. Cash / GPay / Partial payment"
                  maxLength={60}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditPaymentModalOpen(false)}
                  disabled={savingPayment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingPayment}
                >
                  {savingPayment ? 'Saving...' : 'Save Payment & Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Manage Players Modal */}
      {managePlayersModalOpen && (
        <div className="modal-backdrop" onClick={() => setManagePlayersModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '540px', width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)' }}>
                  <Users size={20} color="var(--blue-400)" />
                  <span>Registered Turf Players</span>
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Manage group members or permanently remove users from the turf system.
                </p>
              </div>
              <button className="btn-close" onClick={() => setManagePlayersModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Top action bar inside modal */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1, minWidth: '180px', fontSize: '0.85rem' }}
                placeholder="Search registered players..."
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
              />
              {setActiveTab && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => {
                    setManagePlayersModalOpen(false);
                    setActiveTab('users');
                  }}
                >
                  <Users size={14} />
                  <span>Open User Management</span>
                </button>
              )}
            </div>

            {/* Players List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '0.5rem',
              background: 'var(--bg-layer-1)',
            }}>
              {(() => {
                const list = (overview?.all_profiles || []).filter((p) =>
                  (p.name || '').toLowerCase().includes(playerSearchQuery.toLowerCase())
                );
                if (list.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No players found matching "{playerSearchQuery}"
                    </div>
                  );
                }
                return list.map((p) => {
                  const isAdmin = p.role === 'admin';
                  const isDeleting = deletingUserId === p.id;
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0.85rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-dim)',
                        borderRadius: '8px',
                        marginBottom: '0.45rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: isAdmin ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.12)',
                          color: isAdmin ? 'var(--amber-400)' : 'var(--green-400)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {(p.name || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {isAdmin ? '🛡️ Turf Administrator' : '⚽ Regular Player'}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isAdmin ? (
                          <span style={{ fontSize: '0.72rem', color: 'var(--amber-400)', background: 'rgba(245, 158, 11, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                            Admin
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              background: 'rgba(248, 113, 113, 0.12)',
                              color: 'var(--rose-400)',
                              border: '1px solid rgba(248, 113, 113, 0.25)',
                              padding: '0.35rem 0.65rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                            }}
                            onClick={() => handleDeleteUser(p.id, p.name)}
                            disabled={isDeleting}
                            title={`Permanently delete ${p.name}`}
                          >
                            <Trash2 size={13} />
                            <span>{isDeleting ? 'Removing...' : 'Remove User'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setManagePlayersModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD FRIDAY MATCH / OLD RECORD MODAL ================= */}
      {addSessionModalOpen && (
        <div className="modal-backdrop" onClick={() => !savingSession && !batchAddingPast && setAddSessionModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '520px', width: '95%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: 'var(--green-400)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Add Friday Match / Old Record
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    Record past Friday matches or schedule new match dates
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddSessionModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {sessionError && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(248, 113, 113, 0.12)',
                  border: '1px solid rgba(248, 113, 113, 0.3)',
                  borderRadius: '8px',
                  color: 'var(--rose-400)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{sessionError}</span>
              </div>
            )}

            {/* Quick Suggestions for Past Fridays */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                ⚡ Quick Select Recent Past Fridays:
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {getSuggestedPastFridays().map((item) => (
                  <button
                    key={item.iso}
                    type="button"
                    className="btn btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.3rem 0.65rem',
                      borderRadius: '6px',
                      background: sessionDateInput === item.iso ? 'var(--green-600)' : 'rgba(255, 255, 255, 0.04)',
                      color: sessionDateInput === item.iso ? '#ffffff' : 'var(--text-primary)',
                      border: sessionDateInput === item.iso ? '1px solid var(--green-500)' : '1px solid var(--border-subtle)',
                      fontWeight: 600,
                    }}
                    onClick={() => {
                      setSessionDateInput(item.iso);
                      setSessionStatusInput('completed');
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateSession}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Match Friday Date *
                </label>
                <input
                  type="date"
                  required
                  value={sessionDateInput}
                  onChange={(e) => setSessionDateInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-layer-1)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Match Fee / Person (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={sessionCostInput}
                    onChange={(e) => setSessionCostInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-layer-1)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Match Status
                  </label>
                  <select
                    value={sessionStatusInput}
                    onChange={(e) => setSessionStatusInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.9rem',
                      background: 'var(--bg-layer-1)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  >
                    <option value="completed">Completed / Old Match</option>
                    <option value="open">Open / Upcoming Match</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={sessionStartTimeInput}
                    onChange={(e) => setSessionStartTimeInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-layer-1)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    End Time
                  </label>
                  <input
                    type="text"
                    value={sessionEndTimeInput}
                    onChange={(e) => setSessionEndTimeInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-layer-1)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={sessionPopulateSquad}
                    onChange={(e) => setSessionPopulateSquad(e.target.checked)}
                    style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--green-500)' }}
                  />
                  <div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Populate all registered players into this match squad
                    </span>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Recommended for old matches so you can immediately see the players and record payments/attendance.
                    </div>
                  </div>
                </label>
              </div>

              {/* Batch option */}
              <div
                style={{
                  padding: '0.85rem 1rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Need to add multiple past Fridays?
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Auto-creates the last 4 Friday match records with full player rosters.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  disabled={batchAddingPast || savingSession}
                  onClick={() => handleQuickAddPastFridays(4)}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0.4rem 0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <PlusCircle size={14} color="var(--green-400)" />
                  <span>{batchAddingPast ? 'Generating...' : 'Batch Add 4 Past Fridays'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAddSessionModalOpen(false)}
                  disabled={savingSession || batchAddingPast}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingSession || batchAddingPast}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    minWidth: '150px',
                    justifyContent: 'center',
                  }}
                >
                  {savingSession ? <Clock size={16} className="spin" /> : <CheckCircle size={16} />}
                  <span>{savingSession ? 'Creating...' : 'Save Match Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
