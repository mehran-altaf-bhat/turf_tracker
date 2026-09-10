import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';
import {
  X,
  CheckCircle,
  ExternalLink,
  QrCode,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Trash2,
  FileCheck,
  CreditCard,
  Sparkles,
  Copy,
  Check,
  Calendar,
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
  upcomingSessions = [],
}) {
  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);

  const [weeks, setWeeks] = useState(1);
  const [upiRef, setUpiRef] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const costPerWeek = config?.cost_per_person || 200;
  const standardFee = payableAmount || costPerWeek;

  // Derive match dates for the 4 options
  const sessionDates = [0, 1, 2, 3].map((idx) => {
    if (upcomingSessions && upcomingSessions[idx]?.session?.session_date) {
      return upcomingSessions[idx].session.session_date;
    }
    const baseStr = currentSession?.session_date;
    if (baseStr) {
      const [y, m, d] = baseStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + idx * 7);
      const yy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    }
    return null;
  });

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); // e.g. "11 Sep"
    } catch {
      return dateStr;
    }
  };

  const currentDateLabel = formatDateLabel(sessionDates[0]) || (currentSession?.session_date ? formatDateLabel(currentSession.session_date) : 'Friday Match');

  // If user has a balance due for this week, week 1 pays balanceDue, additional weeks pay full fee
  const hasPartialBalance = balanceDue !== null && balanceDue > 0 && balanceDue < standardFee;
  const currentWeekPayable = hasPartialBalance ? balanceDue : standardFee;
  const totalAmount = weeks === 1 ? currentWeekPayable : (currentWeekPayable + (weeks - 1) * costPerWeek);

  const vpa = config?.vpa || '7006869014@hdfc';
  const payeeName = config?.name || 'FAISAL RASHID BHAT';

  // Dynamic UPI URI reflecting selected weeks or balance amount
  const upiNote = hasPartialBalance && weeks === 1
    ? `Turf Balance Payment (₹${totalAmount})`
    : weeks === 1
    ? `Turf Fee - ${currentDateLabel} (Only 1 Week)`
    : `Turf Fee for ${weeks} Weeks (Thru ${formatDateLabel(sessionDates[weeks - 1])})`;

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
      setError('Please provide your 12-digit UPI UTR number OR upload a payment screenshot.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let screenshot_url = null;

      if (screenshotFile) {
        setUploadStatus('Uploading payment screenshot...');
        const uploadRes = await api.uploadScreenshot(screenshotFile);
        screenshot_url = uploadRes.screenshot_url;
      }

      setUploadStatus('Saving payment record...');
      await onPaymentSuccess({
        weeks_count: weeks,
        upi_ref: cleanRef || null,
        screenshot_url: screenshot_url,
        amount: totalAmount,
      });

      // Reset
      setUpiRef('');
      setScreenshotFile(null);
      setScreenshotPreview(null);
      setWeeks(1);
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
      <div className="modal-content">
        <div className="modal-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)' }}>
              <span>⚽</span>
              <span>{hasPartialBalance && weeks === 1 ? 'Pay Match Fee Balance' : `Pay for Turf (${currentDateLabel})`}</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
              <Calendar size={13} color="var(--green-500)" />
              <span>Elite Football Turf • Friday 8:00 PM - 10:00 PM</span>
            </p>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'var(--rose-subtle)',
            border: '1px solid rgba(248, 113, 113, 0.25)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            color: 'var(--rose-400)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Breakdown Card if user has partial balance / shifted credit */}
        {hasPartialBalance && weeks === 1 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Match Fee Breakdown:
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              <span>Total Match Fee:</span>
              <strong style={{ color: 'var(--text-primary)' }}>₹{standardFee}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--green-400)', marginBottom: '0.4rem' }}>
              <span>Compensated / Shifted Credit:</span>
              <strong>-₹{amountPaid}</strong>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.95rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              borderTop: '1px dashed var(--border-subtle)',
              paddingTop: '0.4rem',
            }}>
              <span>Remaining Balance to Pay:</span>
              <span style={{ color: 'var(--green-400)' }}>₹{balanceDue}</span>
            </div>
          </div>
        )}

        {/* Match Date & Advance Weeks Selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.35rem' }}>
            <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
              Match Date & Duration:
            </label>
            <span style={{
              fontSize: '0.72rem',
              color: 'var(--green-400)',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              padding: '0.15rem 0.5rem',
              borderRadius: '6px',
              fontWeight: 700
            }}>
              {weeks === 1 ? 'For Only 1 Week Payment' : `${weeks} Weeks Advance`}
            </span>
          </div>

          <div style={{
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            marginBottom: '0.75rem',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}>
            <Sparkles size={14} color="var(--green-400)" />
            <span>
              <strong>Note:</strong> Pre-selected <strong>for only 1 week payment</strong> (Friday, {currentDateLabel}). You can also tap future dates to pre-pay advance weeks.
            </span>
          </div>

          <div className="weeks-selector">
            {[1, 2, 3, 4].map((w) => {
              const previewAmount = w === 1 ? currentWeekPayable : (currentWeekPayable + (w - 1) * costPerWeek);
              const dateText = formatDateLabel(sessionDates[w - 1]);
              const isSelected = weeks === w;
              return (
                <button
                  type="button"
                  key={w}
                  className={`week-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setWeeks(w)}
                  style={{
                    position: 'relative',
                    padding: '0.75rem 0.35rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  {w === 1 && (
                    <span style={{
                      position: 'absolute',
                      top: '-9px',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      background: 'var(--green-600)',
                      color: '#ffffff',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '10px',
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(34,197,94,0.3)',
                    }}>
                      Only 1 Week
                    </span>
                  )}
                  <div className="week-count" style={{ fontSize: '0.92rem', fontWeight: 800, color: isSelected ? 'var(--green-400)' : 'var(--text-primary)' }}>
                    {dateText || `Week ${w}`}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: isSelected ? 'var(--green-400)' : 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {w === 1 ? 'Current Match' : `${w} Matches`}
                  </div>
                  <div className="week-amount" style={{ marginTop: '0.25rem', fontWeight: 700, fontSize: '0.85rem' }}>
                    ₹{previewAmount}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Amount Highlight */}
        <div style={{
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          borderRadius: '10px',
          padding: '0.85rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '1rem 0',
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--green-400)', fontWeight: 700 }}>
              {hasPartialBalance && weeks === 1
                ? 'Net Balance Due'
                : weeks === 1
                ? `Only 1 Week Fee (Friday, ${currentDateLabel})`
                : `Amount Payable (${weeks} Matches through ${formatDateLabel(sessionDates[weeks - 1])})`}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Receiver: {payeeName}
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--green-400)' }}>
            ₹{totalAmount}
          </div>
        </div>

        {/* QR Code Block */}
        <div style={{ textAlign: 'center', margin: '0.75rem 0' }}>
          <div className="qr-container" style={{ margin: '0 auto' }}>
            <QRCodeSVG
              value={upiUrl}
              size={160}
              level="H"
              includeMargin={true}
            />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '0.35rem 0.75rem',
            marginTop: '0.5rem',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>UPI ID:</span>
            <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.88rem' }}>{vpa}</strong>
            <button
              type="button"
              onClick={handleCopyUpi}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: copiedUpi ? 'var(--green-500)' : 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.15rem 0.35rem',
              }}
              title="Copy UPI ID"
            >
              {copiedUpi ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Scan with Google Pay, PhonePe, Paytm, or BHIM to pay ₹{totalAmount}
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <a
              href={upiUrl}
              className="btn btn-sm btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}
            >
              <span>Open in UPI App (Mobile)</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Payment Confirmation Form */}
        <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-dim)', paddingTop: '1.25rem' }}>
          {/* Screenshot Upload Section */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <ImageIcon size={15} color="var(--green-500)" />
              <span>Payment Screenshot (Recommended)</span>
            </label>

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
                  border: '2px dashed rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '1.15rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.03)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                  e.currentTarget.style.background = 'rgba(34, 197, 94, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }}
              >
                <Upload size={22} color="var(--text-muted)" style={{ margin: '0 auto 0.35rem' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Click to upload payment screenshot
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  PNG, JPG or JPEG (Max 10MB)
                </div>
              </div>
            ) : (
              <div style={{
                position: 'relative',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                background: 'rgba(34, 197, 94, 0.06)',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}>
                <img
                  src={screenshotPreview}
                  alt="Proof"
                  style={{
                    width: '58px',
                    height: '58px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--green-400)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FileCheck size={16} />
                    <span>Screenshot Selected</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {screenshotFile?.name}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  style={{ padding: '0.35rem 0.6rem' }}
                  onClick={handleRemoveScreenshot}
                  title="Remove screenshot"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>

          {/* UPI Reference Input */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="upi-ref" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              UPI Reference / UTR Number (Optional if screenshot uploaded)
            </label>
            <input
              id="upi-ref"
              type="text"
              className="form-input"
              placeholder="e.g. 3254XXXXXXXX (12 digits)"
              value={upiRef}
              onChange={(e) => setUpiRef(e.target.value)}
              maxLength={30}
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ minWidth: '150px' }}
            >
              {submitting ? (
                <span>{uploadStatus || 'Processing...'}</span>
              ) : (
                <span>
                  {weeks === 1
                    ? `Submit ₹${totalAmount} for ${currentDateLabel}`
                    : `Submit ₹${totalAmount} (${weeks} Weeks)`}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
