import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';
import {
  X,
  AlertCircle,
  Upload,
  Trash2,
  Copy,
  Check,
  Calendar,
  ExternalLink,
} from 'lucide-react';

export default function PaymentModal({
  isOpen,
  onClose,
  config,
  onPaymentSuccess,
  balanceDue = null,
  payableAmount = null,
  amountPaid = 0,
  currentSession = null,
}) {
  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);

  const [upiRef, setUpiRef] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const costPerWeek = config?.cost_per_person || 200;
  const standardFee = payableAmount || costPerWeek;

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); // e.g. "11 Sept"
    } catch {
      return dateStr;
    }
  };

  const currentDateLabel = currentSession?.session_date
    ? formatDateLabel(currentSession.session_date)
    : 'Friday Match';

  // Partial balance check
  const hasPartialBalance = balanceDue !== null && balanceDue > 0 && balanceDue < standardFee;
  const totalAmount = hasPartialBalance ? balanceDue : standardFee;

  const vpa = config?.vpa || '7006869014@hdfc';
  const payeeName = config?.name || 'FAISAL RASHID BHAT';

  const upiNote = hasPartialBalance
    ? `Turf Balance (₹${totalAmount}) - ${currentDateLabel}`
    : `Turf Match Fee (₹${totalAmount}) - ${currentDateLabel}`;

  const upiUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(upiNote)}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      document.body.style.overflow = 'hidden';
      const content = dialog.querySelector('.modal-content');
      if (content) content.scrollTop = 0;
    } else {
      if (dialog.open) dialog.close();
      document.body.style.overflow = '';
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
    return () => {
      dialog.removeEventListener('click', handleBackdropClick);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(vpa);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, JPEG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Screenshot file size must be less than 10MB');
      return;
    }

    setError(null);
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanRef = upiRef.trim();

    if (!cleanRef && !screenshotFile) {
      setError('Please upload a payment screenshot OR enter your 12-digit UPI UTR number.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let screenshot_url = null;

      if (screenshotFile) {
        setUploadStatus('Uploading screenshot...');
        const uploadRes = await api.uploadScreenshot(screenshotFile);
        screenshot_url = uploadRes.screenshot_url;
      }

      setUploadStatus('Recording payment...');
      await onPaymentSuccess({
        weeks_count: 1,
        upi_ref: cleanRef || null,
        screenshot_url: screenshot_url,
        amount: totalAmount,
      });

      // Reset
      setUpiRef('');
      setScreenshotFile(null);
      setScreenshotPreview(null);
      onClose();
    } catch (err) {
      setError(err.message || 'Payment submission failed. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadStatus('');
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="custom-modal"
      closedby="any"
      onClose={onClose}
    >
      <div className="modal-content" style={{ padding: '1.25rem 1.5rem', maxWidth: '460px', margin: '0 auto' }}>
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: '0.85rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-dim)' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)', margin: 0 }}>
              <span>⚽</span>
              <span>{hasPartialBalance ? 'Pay Remaining Balance' : `Pay for Turf (${currentDateLabel})`}</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: '0.2rem 0 0' }}>
              <Calendar size={13} color="var(--green-400)" />
              <span>Elite Football Turf • Friday 8:00 PM – 10:00 PM</span>
            </p>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'var(--rose-subtle)',
            border: '1px solid rgba(248, 113, 113, 0.25)',
            borderRadius: '8px',
            padding: '0.6rem 0.85rem',
            color: 'var(--rose-400)',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '0.85rem',
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Compact Amount Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(16, 185, 129, 0.05) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.85rem',
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--green-400)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {hasPartialBalance ? 'Remaining Match Balance' : 'Your Match Share'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              Receiver: <strong style={{ color: 'var(--text-primary)' }}>{payeeName}</strong>
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--green-400)', letterSpacing: '-0.02em' }}>
            ₹{totalAmount}
          </div>
        </div>

        {/* Side-by-Side QR & UPI Info Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-dim)',
          borderRadius: '10px',
          padding: '0.85rem',
          marginBottom: '1rem',
        }}>
          {/* QR Code */}
          <div style={{
            background: '#ffffff',
            padding: '5px',
            borderRadius: '8px',
            display: 'inline-flex',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
          }}>
            <QRCodeSVG value={upiUrl} size={110} level="M" />
          </div>

          {/* UPI ID & Mobile Link */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Scan QR or use UPI ID:
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-layer-1)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.35rem 0.6rem',
              marginBottom: '0.5rem',
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {vpa}
              </span>
              <button
                type="button"
                onClick={handleCopyUpi}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedUpi ? 'var(--green-400)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 4px',
                }}
                title="Copy UPI ID"
              >
                {copiedUpi ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <a
              href={upiUrl}
              className="btn btn-sm btn-secondary"
              style={{
                width: '100%',
                justifyContent: 'center',
                fontSize: '0.75rem',
                padding: '0.35rem 0.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <ExternalLink size={12} />
              <span>Open in UPI App</span>
            </a>
          </div>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleSubmit}>
          {/* Screenshot Upload Bar */}
          <div style={{ marginBottom: '0.65rem' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {!screenshotPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--green-500)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <Upload size={16} color="var(--green-400)" />
                <span>Upload Payment Screenshot (Recommended)</span>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
                padding: '0.4rem 0.75rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                  <img
                    src={screenshotPreview}
                    alt="Proof"
                    style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--green-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {screenshotFile?.name || 'Screenshot attached'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveScreenshot}
                  style={{ background: 'none', border: 'none', color: 'var(--rose-400)', cursor: 'pointer', padding: '2px' }}
                  title="Remove screenshot"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>

          {/* UPI Reference Input */}
          <div style={{ marginBottom: '1rem' }}>
            <input
              id="upi-ref"
              type="text"
              className="form-input"
              placeholder="Or enter 12-digit UPI Ref / UTR Number"
              value={upiRef}
              onChange={(e) => setUpiRef(e.target.value)}
              maxLength={30}
              style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700 }}
            >
              {submitting ? (uploadStatus || 'Processing...') : `Submit ₹${totalAmount}`}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
