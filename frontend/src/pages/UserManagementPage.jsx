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
  Lock,
  Key,
} from 'lucide-react';

export default function UserManagementPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'pending' | 'approved'
  const [toast, setToast] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  // Admin Profile Modal State
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminError, setAdminError] = useState(null);

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
      setUsers((data.users || []).filter((u) => u.role !== 'admin'));
      if (data.admin_user) {
        setAdminUser(data.admin_user);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdminEdit = () => {
    const a = adminUser || currentUser || {};
    setAdminName(a.name || currentUser?.name || 'Administrator');
    setAdminEmail(a.email || currentUser?.email || 'mehranbhat010@gmail.com');
    setAdminPhone(a.phone || currentUser?.phone || '');
    setAdminError(null);
    setAdminModalOpen(true);
  };

  const handleSaveAdminProfile = async (e) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      setAdminError('Please provide a valid administrator email address');
      return;
    }
    setSavingAdmin(true);
    setAdminError(null);
    try {
      const res = await api.updateAdminProfile({
        name: adminName.trim(),
        email: adminEmail.trim().toLowerCase(),
        phone: adminPhone.trim(),
      });
      showToast(res.message || 'Admin email and profile updated successfully!');
      setAdminModalOpen(false);
      await loadUsers();
    } catch (err) {
      setAdminError(err.message || 'Failed to update admin profile');
    } finally {
      setSavingAdmin(false);
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

  // Counts (Squad Players only - Admin is separate)
  const totalCount = users.length;
  const pendingUsers = users.filter((u) => !u.is_approved);
  const pendingCount = pendingUsers.length;
  const approvedCount = totalCount - pendingCount;

  // Filtering (strictly squad players only)
  const filteredUsers = users.filter((u) => {
    if (u.role === 'admin') return false; // Admin is separate
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    if (roleFilter === 'pending') return !u.is_approved;
    if (roleFilter === 'approved') return u.is_approved;

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
          background: 'linear-gradient(135deg, rgba(20, 29, 53, 0.9) 0%, rgba(15, 22, 41, 0.98) 100%)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
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
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: 'var(--green-400)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={20} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Player & User Approvals
              </h2>
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Review registered squad players and approve accounts so they can log in and participate in matches.
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
                gap: '0.45rem',
                fontSize: '0.85rem',
                padding: '0.55rem 1rem',
              }}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              <span>Refresh Directory</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Administrator Account Card (Separated from Squad Players) */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '14px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--amber-400)',
                border: '1.5px solid rgba(245, 158, 11, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              👑
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {adminUser?.name || currentUser?.name || 'Mehran'}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: 'var(--amber-400)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <ShieldCheck size={12} />
                  System Administrator (Dedicated)
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Lock size={11} /> Self-Deletion Blocked
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.35rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mail size={13} color="var(--amber-400)" />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {adminUser?.email || currentUser?.email || 'mehranbhat010@gmail.com'}
                  </span>
                </div>
                {(adminUser?.phone || currentUser?.phone) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Phone size={13} color="var(--green-400)" />
                    <span>{adminUser?.phone || currentUser?.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleOpenAdminEdit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.82rem',
                padding: '0.5rem 1rem',
              }}
            >
              <Pencil size={14} />
              <span>Change Admin Email & Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Approvals Alert Banner */}
      {pendingCount > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.06) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 4px 20px rgba(245, 158, 11, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.2)',
                color: 'var(--amber-400)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
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
              <div style={{ fontWeight: 800, color: 'var(--amber-400)', fontSize: '0.95rem' }}>
                {pendingCount} New Player Registration{pendingCount > 1 ? 's' : ''} Pending Your Approval
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Players cannot log in until you approve them below.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setRoleFilter('pending')}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
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
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search by name, phone, role, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem 0.6rem 2.25rem',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-layer-1)',
              color: 'var(--text-primary)',
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
                color: 'var(--text-muted)',
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
              background: roleFilter === 'pending'
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : (pendingCount > 0 ? 'rgba(245, 158, 11, 0.12)' : undefined),
              color: roleFilter === 'pending'
                ? '#ffffff'
                : (pendingCount > 0 ? 'var(--amber-400)' : undefined),
              border: pendingCount > 0 && roleFilter !== 'pending'
                ? '1px solid rgba(245, 158, 11, 0.3)'
                : undefined,
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
        </div>
      </div>

      {/* Users Table / Directory */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚽</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Loading players directory...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
            <Users size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>No players found</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {searchQuery ? `No players match your search "${searchQuery}"` : 'No players in this category.'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Player Name</th>
                  <th>Phone / WhatsApp</th>
                  <th>Email</th>
                  <th>Approval Status</th>
                  <th>Role</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
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
                        backgroundColor: isPending ? 'rgba(245, 158, 11, 0.04)' : undefined,
                        borderLeft: isPending ? '3px solid var(--amber-400)' : '3px solid transparent',
                      }}
                    >
                      {/* Player Avatar & Name */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: u.role === 'admin'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : (isPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.12)'),
                              color: u.role === 'admin'
                                ? 'var(--amber-400)'
                                : (isPending ? 'var(--amber-400)' : 'var(--green-400)'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '1rem',
                              border: u.role === 'admin'
                                ? '1.5px solid rgba(245, 158, 11, 0.35)'
                                : (isPending ? '1.5px solid rgba(245, 158, 11, 0.35)' : '1.5px solid rgba(34, 197, 94, 0.3)'),
                              flexShrink: 0,
                            }}
                          >
                            {(u.name || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                {u.name}
                              </span>
                              {isCurrentAdmin && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    background: 'rgba(96, 165, 250, 0.15)',
                                    color: 'var(--blue-400)',
                                    border: '1px solid rgba(96, 165, 250, 0.3)',
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: '4px',
                                    fontWeight: 700,
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                              ID: {u.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone / WhatsApp */}
                      <td>
                        {u.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <Phone size={14} color="var(--green-400)" />
                            <a
                              href={`tel:${u.phone}`}
                              style={{
                                color: 'var(--text-primary)',
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
                                  background: 'rgba(34, 197, 94, 0.15)',
                                  color: 'var(--green-400)',
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                  marginLeft: '0.2rem',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <MessageCircle size={13} />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                            No phone set
                          </span>
                        )}
                      </td>

                      {/* Email */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <Mail size={13} color="var(--text-muted)" />
                          <span>{u.email || '—'}</span>
                        </span>
                      </td>

                      {/* Approval Status */}
                      <td>
                        {isPending ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              background: 'rgba(245, 158, 11, 0.12)',
                              color: 'var(--amber-400)',
                              fontWeight: 700,
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                            }}
                          >
                            <Clock size={12} />
                            <span>Pending Approval</span>
                          </span>
                        ) : (
                          <span className="badge badge-paid" style={{ fontSize: '0.75rem' }}>
                            <ShieldCheck size={12} />
                            <span>Approved</span>
                          </span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td>
                        {u.role === 'admin' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '9999px',
                              background: 'rgba(245, 158, 11, 0.12)',
                              color: 'var(--amber-400)',
                              fontWeight: 700,
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                            }}
                          >
                            <Shield size={12} color="var(--amber-400)" />
                            <span>System Admin</span>
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
                              background: 'rgba(34, 197, 94, 0.08)',
                              color: 'var(--green-400)',
                              fontWeight: 600,
                              border: '1px solid rgba(34, 197, 94, 0.25)',
                            }}
                          >
                            <span>⚽ Squad Player</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                          {isPending && (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleApproveUser(u)}
                              disabled={approvingId === u.id}
                              title="Approve this player account"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.78rem',
                                padding: '0.35rem 0.75rem',
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
                              background: isCurrentAdmin ? 'rgba(255,255,255,0.03)' : 'rgba(248, 113, 113, 0.1)',
                              color: isCurrentAdmin ? 'var(--text-muted)' : 'var(--rose-400)',
                              border: isCurrentAdmin ? '1px solid var(--border-dim)' : '1px solid rgba(248, 113, 113, 0.25)',
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
                    background: 'rgba(96, 165, 250, 0.15)',
                    color: 'var(--blue-400)',
                    border: '1px solid rgba(96, 165, 250, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Pencil size={16} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
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
                  color: 'var(--text-muted)',
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
                <AlertCircle size={15} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Phone / WhatsApp Number
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
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
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  Used for WhatsApp match roster updates.
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Account Role
                </label>
                <div
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.88rem',
                    background: 'var(--bg-layer-1)',
                    color: editingUser?.role === 'admin' ? 'var(--amber-400)' : 'var(--green-400)',
                    fontWeight: 600,
                  }}
                >
                  {editingUser?.role === 'admin' ? '🛡️ System Administrator (Dedicated)' : '⚽ Squad Player'}
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  {editingUser?.role === 'admin'
                    ? 'This is the dedicated system administrator account.'
                    : 'Players cannot be promoted to admin. Only one separate administrator account exists.'}
                </div>
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
                background: 'rgba(248, 113, 113, 0.15)',
                color: 'var(--rose-400)',
                border: '1px solid rgba(248, 113, 113, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <Trash2 size={24} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Remove {deletingUser.name}?
            </h3>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Are you sure you want to permanently remove <strong style={{ color: 'var(--text-primary)' }}>{deletingUser.name}</strong>?
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
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                }}
              >
                {isDeleting ? <RefreshCw size={15} className="spin" /> : <Trash2 size={15} />}
                <span>{isDeleting ? 'Deleting...' : 'Yes, Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT ADMIN PROFILE MODAL ================= */}
      {adminModalOpen && (
        <div className="modal-backdrop" onClick={() => !savingAdmin && setAdminModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '450px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: 'var(--amber-400)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Key size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Update Admin Email & Profile
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Dedicated Administrator Account
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '10px',
                padding: '0.75rem 0.9rem',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
              }}
            >
              <Lock size={15} color="var(--amber-400)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--amber-400)' }}>Permanent Account:</strong> Modifying this email updates your administrator login credentials directly. Self-deletion is disabled for system security.
              </div>
            </div>

            {adminError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{adminError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdminProfile}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Admin Email (Login ID) *
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-layer-1)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Administrator Name
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Administrator Name"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-layer-1)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Phone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="e.g. 7051880655"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-layer-1)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAdminModalOpen(false)}
                  disabled={savingAdmin}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingAdmin}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {savingAdmin ? <RefreshCw size={14} className="spin" /> : <CheckCircle2 size={15} />}
                  <span>{savingAdmin ? 'Updating...' : 'Save Admin Details'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
