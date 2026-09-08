import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Search, Users, Shield, UserCheck, AlertCircle } from 'lucide-react';

export default function SquadModal({ isOpen, onClose, sessionDate, allPlayers = [], currentSquadIds = [], onSaveSquad }) {
  const dialogRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSelectedIds(new Set(currentSquadIds));
    setSearch('');
    setError(null);
  }, [currentSquadIds, isOpen]);

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

  const filteredPlayers = allPlayers.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
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
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} color="var(--pitch-green-light)" />
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
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem',
            color: '#fca5a5',
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
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1rem',
          border: '1px solid var(--border-subtle)',
        }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selected Squad: </span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--pitch-green-light)' }}>
              {selectedIds.size}
            </strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}> / {allPlayers.length} registered players</span>
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

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem', fontSize: '0.9rem' }}
            placeholder="Search players by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Player Checkbox List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem',
          background: 'rgba(8, 12, 20, 0.6)',
          marginBottom: '1.5rem',
        }}>
          {filteredPlayers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No matching players found.
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
                    background: isChecked ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                    border: isChecked ? '1px solid var(--border-accent)' : '1px solid transparent',
                    cursor: 'pointer',
                    marginBottom: '0.35rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent div click
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: 'var(--pitch-green)',
                        cursor: 'pointer',
                      }}
                    />
                    <div>
                      <strong style={{ color: isChecked ? '#fff' : 'var(--text-secondary)', fontSize: '0.925rem' }}>
                        {player.name}
                      </strong>
                      <span className={`role-tag ${player.role}`} style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>
                        {player.role}
                      </span>
                    </div>
                  </div>

                  {isChecked && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--pitch-green-light)', fontWeight: 600 }}>
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
