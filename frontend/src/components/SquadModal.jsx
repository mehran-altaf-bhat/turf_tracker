import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Search, Calculator, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SquadModal({
  isOpen,
  onClose,
  sessionDate,
  allPlayers = [],
  currentSquadIds = [],
  onSaveSquad,
}) {
  const dialogRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [totalTurfCost, setTotalTurfCost] = useState(3800);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSelectedIds(new Set(currentSquadIds));
    setSearch('');
    setError(null);
    setTotalTurfCost(3800);
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

  const count = selectedIds.size;
  const costNum = Number(totalTurfCost) || 0;
  const splitPerPlayer = count > 0 ? Math.round(costNum / count) : 0;

  const handleSave = async () => {
    if (count === 0) {
      setError('Please select at least 1 player for the match squad.');
      return;
    }
    if (costNum <= 0) {
      setError('Total turf rent must be greater than ₹0.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaveSquad(Array.from(selectedIds), costNum);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update squad');
    } finally {
      setSaving(false);
    }
  };

  const filteredPlayers = allPlayers.filter((p) =>
    (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <dialog
      ref={dialogRef}
      className="custom-modal"
      style={{ maxWidth: '640px', width: '95%' }}
      closedby="any"
      onClose={onClose}
    >
      <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Users size={22} color="var(--pitch-green)" />
              Confirm Match Squad & Split Turf Rent
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Friday, {sessionDate || 'Match Day'} • Fixed Turf Booking Fee Split
            </p>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(248, 113, 113, 0.12)',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            color: 'var(--rose-400)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic Split Calculation Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(16, 185, 129, 0.05) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--green-400)', fontSize: '0.95rem' }}>
              <Calculator size={18} color="var(--green-400)" />
              <span>Turf Rent Split Calculator</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="total-cost-input" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Total Turf Fee (₹):
              </label>
              <input
                id="total-cost-input"
                type="number"
                min="0"
                step="50"
                value={totalTurfCost}
                onChange={(e) => setTotalTurfCost(e.target.value)}
                style={{
                  width: '110px',
                  padding: '0.4rem 0.65rem',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  background: 'var(--bg-layer-1)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: '6px',
                  textAlign: 'right',
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
            textAlign: 'center',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border-dim)',
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Turf Cost</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{costNum.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Squad Players</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: count > 0 ? 'var(--green-400)' : 'var(--text-muted)' }}>{count}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Split / Player</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--green-400)' }}>
                ₹{splitPerPlayer}
              </div>
            </div>
          </div>
          {count > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--green-300)', marginTop: '0.5rem', textAlign: 'center', fontWeight: 500 }}>
              💡 ₹{costNum} ÷ {count} players = ₹{splitPerPlayer} per confirmed player for this match.
            </div>
          )}
        </div>

        {/* Counter and Select All / Clear */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '0.65rem 0.85rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '0.75rem',
          border: '1px solid var(--border-subtle)',
        }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selected: </span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--green-400)' }}>
              {count}
            </strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}> / {allPlayers.length} approved players</span>
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
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem', fontSize: '0.9rem' }}
            placeholder="Search approved players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Player Checkbox List */}
        <div style={{
          flex: 1,
          minHeight: '200px',
          maxHeight: '320px',
          overflowY: 'auto',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem',
          background: 'var(--bg-layer-1)',
          marginBottom: '1rem',
        }}>
          {filteredPlayers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.9rem' }}>No approved players found matching "{search}"</p>
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
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isChecked ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                    border: isChecked ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid transparent',
                    cursor: 'pointer',
                    marginBottom: '0.3rem',
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
                      <strong style={{ color: isChecked ? 'var(--green-400)' : 'var(--text-primary)', fontSize: '0.925rem' }}>
                        {player.name}
                      </strong>
                      {player.role === 'admin' && (
                        <span className="role-tag admin" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>
                          Admin
                        </span>
                      )}
                    </div>
                  </div>

                  {isChecked ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--green-400)', fontSize: '0.8rem', fontWeight: 600 }}>
                      <CheckCircle2 size={15} />
                      <span>₹{splitPerPlayer}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Not in squad</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || count === 0}
            style={{
              background: '#059669',
              borderColor: '#059669',
              minWidth: '220px',
              justifyContent: 'center',
            }}
          >
            {saving ? 'Splitting & Saving...' : `Confirm Squad & Split (₹${splitPerPlayer}/player)`}
          </button>
        </div>
      </div>
    </dialog>
  );
}
