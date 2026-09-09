import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { X, Check, Search, Users, Shield, UserCheck, AlertCircle, UserPlus } from 'lucide-react';

export default function SquadModal({
  isOpen,
  onClose,
  sessionDate,
  allPlayers = [],
  currentSquadIds = [],
  onSaveSquad,
  onPlayerCreated,
}) {
  const dialogRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [localPlayers, setLocalPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [quickAdding, setQuickAdding] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSelectedIds(new Set(currentSquadIds));
    setLocalPlayers(allPlayers);
    setSearch('');
    setError(null);
  }, [currentSquadIds, allPlayers, isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }

    const handleBackdropClick = (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inDialog = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!inDialog) onClose();
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => dialog.removeEventListener('click', handleBackdropClick);
  }, [isOpen, onClose]);

  const togglePlayer = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    const allIds = allPlayers.map((p) => p.id);
    setSelectedIds(new Set(allIds));
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSaveSquad(Array.from(selectedIds));
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update squad');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAddPlayer = async (nameToAdd) => {
    const clean = (nameToAdd || search).trim();
    if (!clean) return;
    setQuickAdding(true);
    setError(null);
    try {
      const res = await api.createPlayerWithoutEmail({ name: clean });
      if (res.user) {
        const newP = {
          id: res.user.id,
          name: res.user.name,
          role: res.user.role || 'user',
        };
        setLocalPlayers((prev) => [...prev, newP]);
        setSelectedIds((prev) => new Set([...prev, res.user.id]));
        setSearch('');
        if (onPlayerCreated) {
          onPlayerCreated(newP);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to add player');
    } finally {
      setQuickAdding(false);
    }
  };

  const filteredPlayers = localPlayers.filter((p) =>
    (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <dialog
      ref={dialogRef}
      className="custom-modal"
      style={{ maxWidth: '600px', width: '95%' }}
      closedby="any"
      onClose={onClose}
    >
      <div className="modal-content" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Users size={20} color="var(--pitch-green)" />
              Select Match Squad
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Friday, {sessionDate} @ Elite Football Turf
            </p>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem',
            color: '#be123c',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        {/* Counter and Quick Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: '#f8fafc',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1rem',
          border: '1px solid var(--border-subtle)',
        }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selected Squad: </span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--pitch-green-dark)' }}>
              {selectedIds.size}
            </strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}> / {localPlayers.length} registered players</span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleSelectAll}
            >
              Select All
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleClearAll}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Search Bar & Quick Add Player */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem', fontSize: '0.9rem' }}
              placeholder="Search or type player name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search.trim() && !localPlayers.some((p) => (p.name || '').toLowerCase() === search.trim().toLowerCase()) && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', fontSize: '0.82rem', borderColor: '#93c5fd', color: '#1d4ed8', background: '#eff6ff' }}
              onClick={() => handleQuickAddPlayer(search.trim())}
              disabled={quickAdding}
              title={`Register ${search.trim()} without email`}
            >
              <UserPlus size={15} color="#2563eb" />
              <span>{quickAdding ? 'Adding...' : `+ Add "${search.trim()}"`}</span>
            </button>
          )}
        </div>

        {/* Player Checkbox List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem',
          background: '#ffffff',
          marginBottom: '1.5rem',
        }}>
          {filteredPlayers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>No players found matching "{search}"</p>
              {search.trim() && (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: '#2563eb', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => handleQuickAddPlayer(search.trim())}
                  disabled={quickAdding}
                >
                  <UserPlus size={14} />
                  <span>{quickAdding ? 'Adding...' : `+ Add "${search.trim()}" (No Email)`}</span>
                </button>
              )}
            </div>
          ) : (
            filteredPlayers.map((player) => {
              const isChecked = selectedIds.has(player.id);
              return (
                <div
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isChecked ? '#ecfdf5' : 'transparent',
                    border: isChecked ? '1px solid #a7f3d0' : '1px solid transparent',
                    cursor: 'pointer',
                    marginBottom: '0.35rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: 'var(--pitch-green)',
                        cursor: 'pointer',
                      }}
                    />
                    <div>
                      <strong style={{ color: isChecked ? '#065f46' : 'var(--text-primary)', fontSize: '0.925rem' }}>
                        {player.name}
                      </strong>
                      <span className={`role-tag ${player.role}`} style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>
                        {player.role}
                      </span>
                    </div>
                  </div>

                  {isChecked && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--pitch-green-dark)', fontWeight: 600 }}>
                      ✓ In Squad
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : `Confirm & Save Squad (${selectedIds.size} Players)`}
          </button>
        </div>
      </div>
    </dialog>
  );
}
