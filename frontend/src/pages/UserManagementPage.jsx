import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Users,
  UserCheck,
  Shield,
  Search,
  Pencil,
  Trash2,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  MessageCircle,
  Clock,
  UserX,
  ShieldCheck,
} from 'lucide-react';

export default function UserManagementPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'admin'
  const [toast, setToast] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  // Delete Modal State
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getAllUsers();
      setUsers(data.users || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Approve Player Account
  const handleApproveUser = async (u) => {
    setApprovingId(u.id);
    try {
      const res = await api.approveUser(u.id);
      showToast(res.message || `Account approved for "${u.name}"! They can now log in.`);
      await loadUsers();
    } catch (err) {
      showToast(err.message || 'Failed to approve account', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditPhone(u.phone || '');
    setEditRole(u.role || 'user');
    setEditError(null);
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setEditError('Player name cannot be empty');
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await api.updateUser(editingUser.id, {
        name: editName.trim(),
        phone: editPhone.trim() || '',
        role: editRole,
      });
      showToast(res.message || 'Player updated successfully!');
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setEditError(err.message || 'Failed to update player');
    } finally {
      setSavingEdit(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    if (currentUser && currentUser.id === deletingUser.id) {
      alert('You cannot delete your own logged-in admin account.');
      setDeletingUser(null);
      return;
    }
    setIsDeleting(true);
    try {
      const res = await api.deleteUser(deletingUser.id);
      showToast(res.message || `Removed "${deletingUser.name}" successfully`);
      setDeletingUser(null);
      await loadUsers();
    } catch (err) {
      alert(err.message || 'Failed to delete player');
    } finally {
      setIsDeleting(false);
    }
  };

  // Counts
  const totalCount = users.length;
  const pendingUsers = users.filter((u) => !u.is_approved);
  const pendingCount = pendingUsers.length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const approvedCount = totalCount - pendingCount;

  // Filtering
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    if (roleFilter === 'pending') return !u.is_approved;
    if (roleFilter === 'approved') return u.is_approved;
    if (roleFilter === 'admin') return u.role === 'admin';

    return true;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            background: toast.type === 'error' ? '#ef4444' : '#059669',
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
            fontSize: '0.9rem',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          padding: '1.5rem 1.75rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={20} />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Player & User Approvals
              </h2>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
              Players register with their Name, Email, Phone, and Password. Review and approve their accounts before they can log in.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadUsers}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                padding: '0.55rem 0.95rem',
              }}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              <span>Refresh Directory</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Approvals Alert Banner */}
      {pendingCount > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1.5px solid #fcd34d',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#fef08a',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1rem',
                flexShrink: 0,
              }}
            >
              ⏳
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.95rem' }}>
                {pendingCount} New Player Registration{pendingCount > 1 ? 's' : ''} Pending Your Approval
              </div>
              <div style={{ fontSize: '0.82rem', color: '#b45309' }}>
                Players cannot log in until you approve them below.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setRoleFilter('pending')}
            style={{
              background: '#d97706',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            View Pending ({pendingCount})
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          marginBottom: '1.25rem',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.85rem',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
          <Search
            size={16}
            color="#94a3b8"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search by name, phone, role, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${roleFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.78rem', borderRadius: '9999px', padding: '0.35rem 0.85rem' }}
            onClick={() => setRoleFilter('all')}
          >
            All Users ({totalCount})
          </button>

          <button
            type="button"
            className={`btn btn-sm ${roleFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              fontSize: '0.78rem',
              borderRadius: '9999px',
              padding: '0.35rem 0.85rem',
              background: roleFilter === 'pending' ? '#d97706' : (pendingCount > 0 ? '#fef3c7' : undefined),
              color: roleFilter === 'pending' ? '#ffffff' : (pendingCount > 0 ? '#92400e' : undefined),
              borderColor: pendingCount > 0 ? '#fcd34d' : undefined,
              fontWeight: pendingCount > 0 ? 700 : 500,
            }}
            onClick={() => setRoleFilter('pending')}
          >
            Pending Approval ({pendingCount})
          </button>

          <button
            type="button"
            className={`btn btn-sm ${roleFilter === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.78rem', borderRadius: '9999px', padding: '0.35rem 0.85rem' }}
            onClick={() => setRoleFilter('approved')}
          >
            Approved ({approvedCount})
          </button>

          <button
            type="button"
            className={`btn btn-sm ${roleFilter === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.78rem', borderRadius: '9999px', padding: '0.35rem 0.85rem' }}
            onClick={() => setRoleFilter('admin')}
          >
            Admins ({adminCount})
          </button>
        </div>
      </div>

      {/* Users Table / Directory */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚽</div>
            <div style={{ fontWeight: 600 }}>Loading players directory...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <Users size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>No players found</div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              {searchQuery ? `No players match your search "${searchQuery}"` : 'No players in this category.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Player Name
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Phone / WhatsApp
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Email
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Approval Status
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Role
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => {
                  const isCurrentAdmin = currentUser && currentUser.id === u.id;
                  const cleanPhone = (u.phone || '').replace(/[^0-9]/g, '');
                  const isPending = !u.is_approved;

                  return (
                    <tr
                      key={u.id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isPending ? '#fffdf7' : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isPending ? '#fefce8' : '#fbfcfe')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isPending ? '#fffdf7' : 'transparent')}
                    >
                      {/* Player Avatar & Name */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: u.role === 'admin' ? '#fef3c7' : (isPending ? '#fef08a' : '#ecfdf5'),
                              color: u.role === 'admin' ? '#b45309' : (isPending ? '#854d0e' : '#047857'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              border: u.role === 'admin' ? '1px solid #fde68a' : (isPending ? '1px solid #fef08a' : '1px solid #a7f3d0'),
                              flexShrink: 0,
                            }}
                          >
                            {(u.name || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                                {u.name}
                              </span>
                              {isCurrentAdmin && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    background: '#e0e7ff',
                                    color: '#3730a3',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '4px',
                                    fontWeight: 700,
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                              ID: {u.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone / WhatsApp */}
                      <td style={{ padding: '1rem 1rem' }}>
                        {u.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <Phone size={14} color="#059669" />
                            <a
                              href={`tel:${u.phone}`}
                              style={{
                                color: '#0f172a',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                textDecoration: 'none',
                              }}
                            >
                              {u.phone}
                            </a>
                            {cleanPhone.length >= 10 && (
                              <a
                                href={`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Chat on WhatsApp"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  marginLeft: '0.2rem',
                                }}
                              >
                                <MessageCircle size={13} />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>
                            No phone set
                          </span>
                        )}
                      </td>

                      {/* Email */}
                      <td style={{ padding: '1rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.82rem',
                            color: '#334155',
                          }}
                        >
                          <Mail size={13} color="#64748b" />
                          <span>{u.email || '—'}</span>
                        </span>
                      </td>

                      {/* Approval Status */}
                      <td style={{ padding: '1rem 1rem' }}>
                        {isPending ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              background: '#fffbeb',
                              color: '#b45309',
                              fontWeight: 700,
                              border: '1.5px solid #fde68a',
                            }}
                          >
                            <Clock size={12} />
                            <span>Pending Approval</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              background: '#ecfdf5',
                              color: '#047857',
                              fontWeight: 600,
                              border: '1px solid #a7f3d0',
                            }}
                          >
                            <ShieldCheck size={12} />
                            <span>Approved</span>
                          </span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '1rem 1rem' }}>
                        {u.role === 'admin' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '9999px',
                              background: '#fffbeb',
                              color: '#b45309',
                              fontWeight: 700,
                              border: '1px solid #fde68a',
                            }}
                          >
                            <Shield size={12} color="#d97706" />
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '9999px',
                              background: '#f1f5f9',
                              color: '#475569',
                              fontWeight: 600,
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            <UserCheck size={12} />
                            <span>Player</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                          {isPending && (
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => handleApproveUser(u)}
                              disabled={approvingId === u.id}
                              title="Approve this player account"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.78rem',
                                padding: '0.35rem 0.75rem',
                                background: '#059669',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 700,
                              }}
                            >
                              {approvingId === u.id ? <RefreshCw size={12} className="spin" /> : <CheckCircle2 size={13} />}
                              <span>Approve</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOpenEdit(u)}
                            title="Edit Player"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.78rem',
                              padding: '0.35rem 0.7rem',
                            }}
                          >
                            <Pencil size={13} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled={isCurrentAdmin}
                            onClick={() => setDeletingUser(u)}
                            title={isCurrentAdmin ? 'Cannot delete yourself' : (isPending ? 'Reject & Delete Request' : 'Delete Player')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.78rem',
                              padding: '0.35rem 0.7rem',
                              background: isCurrentAdmin ? '#f1f5f9' : '#fff1f2',
                              color: isCurrentAdmin ? '#94a3b8' : '#e11d48',
                              border: isCurrentAdmin ? '1px solid #e2e8f0' : '1px solid #fecdd3',
                              cursor: isCurrentAdmin ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                            <span>{isPending ? 'Deny' : 'Delete'}</span>
                          </button>
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

      {/* ================= EDIT PLAYER MODAL ================= */}
      {editingUser && (
        <div className="modal-backdrop" onClick={() => setEditingUser(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '480px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Pencil size={16} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Edit Player Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  background: '#fef2f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <AlertCircle size={15} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Player Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Faisal Rashid..."
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Phone / WhatsApp Number
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                  Used for WhatsApp match roster updates.
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Account Role & Permissions
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    background: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="user">Regular Player (Squad member)</option>
                  <option value="admin">Administrator (Full admin console & edit access)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingUser(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEdit}
                  style={{
                    background: '#059669',
                    borderColor: '#059669',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {savingEdit ? <RefreshCw size={15} className="spin" /> : <CheckCircle2 size={15} />}
                  <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deletingUser && (
        <div className="modal-backdrop" onClick={() => !isDeleting && setDeletingUser(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <Trash2 size={24} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              Remove {deletingUser.name}?
            </h3>

            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Are you sure you want to permanently remove <strong>{deletingUser.name}</strong>?
              All associated match payment records for this player will also be cleaned up.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                {isDeleting ? <RefreshCw size={15} className="spin" /> : <Trash2 size={15} />}
                <span>{isDeleting ? 'Deleting...' : 'Yes, Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
