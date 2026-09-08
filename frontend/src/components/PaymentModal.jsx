import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, CheckCircle, ExternalLink, QrCode, AlertCircle } from 'lucide-react';

export default function PaymentModal({ isOpen, onClose, config, onPaymentSuccess }) {
  const dialogRef = useRef(null);
  const [weeks, setWeeks] = useState(1);
  const [upiRef, setUpiRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const costPerWeek = config?.cost_per_person || 200;
  const totalAmount = weeks * costPerWeek;
  const vpa = config?.vpa || 'turftracker@upi';
  const payeeName = config?.name || 'Elite Football Turf';

  // Construct UPI URI
  const upiUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Turf Fee for ${weeks} week(s)`)}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }

    // Light-dismiss fallback for browsers without closedby support
    const handleBackdropClick = (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inDialog = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!inDialog) {
        onClose();
      }
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => dialog.removeEventListener('click', handleBackdropClick);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!upiRef.trim()) {
      setError('Please enter your 12-digit UPI reference / UTR number.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onPaymentSuccess({
        weeks_count: weeks,
        upi_ref: upiRef.trim(),
      });
      setUpiRef('');
      setWeeks(1);
      onClose();
    } catch (err) {
      setError(err.message || 'Payment submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="custom-modal"
      closedby="any"
      onClose={onClose}
    >
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.25rem' }}>⚽ Pay for Friday Turf</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Elite Football Turf (8:00 PM - 10:00 PM)
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
            padding: '0.75rem 1rem',
            color: '#fca5a5',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Advance Weeks Selector */}
        <div>
          <label className="form-label">Select Number of Weeks / Advance Sessions:</label>
          <div className="weeks-selector">
            {[1, 2, 3, 4].map((w) => (
              <div
                key={w}
                className={`week-btn ${weeks === w ? 'active' : ''}`}
                onClick={() => setWeeks(w)}
              >
                <div className="week-count">{w} {w === 1 ? 'Week' : 'Weeks'}</div>
                <div className="week-amount">₹{w * costPerWeek}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic QR Code */}
        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
          <div className="qr-container">
            <QRCodeSVG
              value={upiUrl}
              size={180}
              level="M"
              includeMargin={false}
            />
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Scan with <strong style={{ color: '#fff' }}>GPay, PhonePe, Paytm</strong> or any UPI App
          </div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--pitch-green-light)',
            marginTop: '0.25rem'
          }}>
            Amount: ₹{totalAmount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            UPI ID: {vpa}
          </div>
        </div>

        {/* Mobile UPI Deep Link */}
        <div style={{ marginBottom: '1.25rem' }}>
          <a
            href={upiUrl}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.85rem' }}
          >
            <ExternalLink size={15} />
            <span>Open in UPI App (Mobile)</span>
          </a>
        </div>

        {/* UPI Reference Input */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="upi-ref-input">
              UPI Reference / UTR Number (12 digits) *
            </label>
            <input
              id="upi-ref-input"
              type="text"
              className="form-input"
              placeholder="e.g. 423589102431 or Transaction ID"
              value={upiRef}
              onChange={(e) => setUpiRef(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Check your UPI app's transaction history for the 12-digit UTR/Ref number.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ flex: 2 }}
            >
              {submitting ? 'Submitting...' : `Submit Payment (₹${totalAmount})`}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
