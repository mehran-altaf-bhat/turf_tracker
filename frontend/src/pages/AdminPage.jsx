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
  const [feesModalOpen, setFeesModalOpen] = useState(false);
  const [rowFeeInputs, setRowFeeInputs] = useState({});
  const [savingMatchId, setSavingMatchId] = useState(null);
  const [previewScreenshot, setPreviewScreenshot] = useState(null);

  // Add player without email modal
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPhone, setNewPlayerPhone] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState('user');
  const [addToSquadImmediately, setAddToSquadImmediately] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  const [addUserError, setAddUserError] = useState(null);

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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const cleanName = newPlayerName.trim();
    if (!cleanName) {
      setAddUserError('Please enter player name');
      return;
    }
    setCreatingUser(true);
    setAddUserError(null);
    try {
      const res = await api.createPlayerWithoutEmail({
        name: cleanName,
        phone: newPlayerPhone.trim() || undefined,
        role: newPlayerRole,
        add_to_current_squad: addToSquadImmediately,
        session_id: selectedSessionId,
      });
      setToast(res.message);
      setTimeout(() => setToast(null), 4000);
      setNewPlayerName('');
      setNewPlayerPhone('');
      setAddUserModalOpen(false);
      await Promise.all([loadOverview(), loadRoster(selectedSessionId)]);
    } catch (err) {
      setAddUserError(err.message || 'Failed to add player');
    } finally {
      setCreatingUser(false);
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
          <span className="badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', marginBottom: '0.4rem' }}>
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
              background: '#2563eb',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: 600,
            }}
            onClick={() => {
              setAddUserError(null);
              setNewPlayerName('');
              setNewPlayerPhone('');
              setAddToSquadImmediately(true);
              setAddUserModalOpen(true);
            }}
          >
            <UserPlus size={18} />
            <span>+ Add Player (No Email)</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}
            onClick={() => {
              setPlayerSearchQuery('');
              setManagePlayersModalOpen(true);
            }}
            title="View and manage all registered players"
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
              background: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fecdd3',
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
            <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}>Manage 👥</span>
          </div>
          <div className="stat-val" style={{ color: '#2563eb' }}>
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
                style={{ minWidth: '320px', padding: '0.65rem 1rem' }}
                value={selectedSessionId || ''}
                onChange={(e) => setSelectedSessionId(Number(e.target.value))}
              >
                {sessions.map((item) => (
                  <option key={item.session.id} value={item.session.id}>
                    Friday, {item.session.session_date} — Fee: ₹{item.session.cost_per_person || 200} ({item.confirmed_count} Paid, ₹{item.collected_amount})
                  </option>
                ))}
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
          </div>

          {currentSessionObj && (
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <div>
                Slot: <strong style={{ color: 'var(--text-primary)' }}>{currentSessionObj.start_time || '20:00'} - {currentSessionObj.end_time || '22:00'}</strong>
              </div>
              <div>
                Squad Size: <strong style={{ color: '#2563eb' }}>{currentSquadCount} Players</strong>
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
                        background: '#ffffff',
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
                    <strong style={{ color: '#b45309', fontSize: '1rem' }}>₹{currentSessionObj.cost_per_person || 200}</strong>
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
                        background: '#f8fafc',
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
                Collected: <strong style={{ color: 'var(--pitch-green-dark)' }}>₹{rosterData?.summary?.total_collected || 0}</strong>
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
              <Users size={20} color="var(--pitch-green)" />
              Match Squad ({currentSquadCount} Players)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {rosterData ? (
                <>
                  <strong style={{ color: 'var(--pitch-green-dark)' }}>{rosterData.summary.confirmed_count} Paid</strong> •{' '}
                  <strong style={{ color: '#b45309' }}>{rosterData.summary.pending_count} Pending</strong> •{' '}
                  <strong style={{ color: '#be123c' }}>{rosterData.summary.unpaid_count} Unpaid</strong>
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
            background: '#f8fafc',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed #cbd5e1',
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
                        <span style={{ color: '#475569', fontWeight: 600 }}>₹{fee}</span>
                      </td>
                      <td>
                        <strong style={{ color: paid > 0 ? '#059669' : '#64748b' }}>
                          ₹{paid}
                        </strong>
                      </td>
                      <td>
                        {balance > 0 ? (
                          <span style={{ color: '#dc2626', fontWeight: 700, background: '#fef2f2', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #fecdd3' }}>
                            ₹{balance} due
                          </span>
                        ) : (
                          <span style={{ color: '#059669', fontWeight: 600, background: '#ecfdf5', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                            ₹0 (Clear)
                          </span>
                        )}
                      </td>
                      <td>
                        {player.status === 'confirmed' && (
                          <span className="badge badge-paid">Paid Full ✅</span>
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
                          <span className="badge badge-unpaid">Unpaid ⚠️</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
                          {player.upi_ref && (
                            <span style={{ fontFamily: player.upi_ref?.includes('Screenshot') ? 'inherit' : 'monospace', fontSize: '0.8rem' }}>
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
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
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
                                title="Approve / Confirm Payment"
                              >
                                <CheckCircle size={14} />
                                <span>Approve</span>
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
            background: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            color: '#1e293b',
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
        onPlayerCreated={() => {
          loadOverview();
          loadRoster(selectedSessionId);
        }}
      />

      {/* Screenshot Lightbox Modal */}
      {previewScreenshot && (
        <div
          className="modal-backdrop"
          onClick={() => setPreviewScreenshot(null)}
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
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              textAlign: 'center',
              background: '#ffffff',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <Eye size={18} color="var(--pitch-green)" /> Payment Screenshot Proof
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
                background: '#f8fafc',
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
              background: '#ffffff',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <DollarSign size={20} color="#b45309" /> Manage Match Fees (Per Match)
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
                      <tr key={s.id} style={{ background: isSelected ? '#ecfdf5' : undefined }}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)' }}>Friday, {s.session_date}</strong>
                          {isSelected && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--pitch-green-dark)', fontWeight: 600 }}>
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
                          <strong style={{ color: '#b45309', fontSize: '1rem' }}>
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
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
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
                <h3 style={{ fontSize: '1.25rem', color: '#0f172a' }}>Update Player Payment</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
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
                    background: '#f8fafc',
                    border: '1px solid #eaecf0',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: '#64748b' }}>Match Fee (Payable):</span>
                      <strong style={{ color: '#0f172a' }}>₹{matchFee}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: '#64748b' }}>Amount Paid:</span>
                      <strong style={{ color: '#059669' }}>₹{enteredAmt}</strong>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      borderTop: '1px dashed #cbd5e1',
                      paddingTop: '0.4rem',
                      color: balance > 0 ? '#dc2626' : '#059669',
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

      {/* Add Player Without Email Modal */}
      {addUserModalOpen && (
        <div className="modal-backdrop" onClick={() => setAddUserModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '480px', width: '95%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#0f172a' }}>
                  <UserPlus size={20} color="#2563eb" />
                  <span>Add Player (Without Email)</span>
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Quickly add players directly to your turf group without requiring an email address.
                </p>
              </div>
              <button className="btn-close" onClick={() => setAddUserModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {addUserError && (
              <div style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '8px',
                padding: '0.75rem',
                color: '#be123c',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                {addUserError}
              </div>
            )}

            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  Player Full Name *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Tariq Ahmad, Zahid Khan"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  Phone / WhatsApp Number (Optional)
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 9876543210"
                  value={newPlayerPhone}
                  onChange={(e) => setNewPlayerPhone(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  Role
                </label>
                <select
                  className="form-input"
                  value={newPlayerRole}
                  onChange={(e) => setNewPlayerRole(e.target.value)}
                >
                  <option value="user">Regular Player</option>
                  <option value="admin">Turf Admin</option>
                </select>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #eaecf0',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  cursor: 'pointer',
                }}
                onClick={() => setAddToSquadImmediately(!addToSquadImmediately)}
              >
                <input
                  type="checkbox"
                  id="add-squad-check"
                  checked={addToSquadImmediately}
                  onChange={(e) => setAddToSquadImmediately(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }}
                />
                <label htmlFor="add-squad-check" style={{ fontSize: '0.84rem', color: '#1e293b', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                  Add to current match squad ({currentSessionObj?.session_date ? `Friday, ${currentSessionObj.session_date}` : 'Selected Session'})
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAddUserModalOpen(false)}
                  disabled={creatingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={creatingUser}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 600,
                    minWidth: '130px',
                  }}
                >
                  {creatingUser ? 'Adding...' : '+ Add Player'}
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
                <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#0f172a' }}>
                  <Users size={20} color="#2563eb" />
                  <span>Registered Turf Players</span>
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
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
              <button
                type="button"
                className="btn btn-sm btn-primary"
                style={{ background: '#2563eb', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                onClick={() => {
                  setManagePlayersModalOpen(false);
                  setAddUserModalOpen(true);
                }}
              >
                <UserPlus size={14} />
                <span>+ Add New</span>
              </button>
            </div>

            {/* Players List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              border: '1px solid #eaecf0',
              borderRadius: '10px',
              padding: '0.5rem',
              background: '#f8fafc',
            }}>
              {(() => {
                const list = (overview?.all_profiles || []).filter((p) =>
                  (p.name || '').toLowerCase().includes(playerSearchQuery.toLowerCase())
                );
                if (list.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
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
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        marginBottom: '0.45rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: isAdmin ? '#fef3c7' : '#ecfdf5',
                          color: isAdmin ? '#b45309' : '#059669',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {(p.name || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {isAdmin ? '🛡️ Turf Administrator' : '⚽ Regular Player'}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isAdmin ? (
                          <span style={{ fontSize: '0.72rem', color: '#b45309', background: '#fef3c7', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                            Admin
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fecdd3',
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
    </div>
  );
}
