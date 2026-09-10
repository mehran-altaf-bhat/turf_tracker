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
  Smartphone,
  Banknote,
  Info,
  CheckCircle,
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

  // Payment Method: 'upi' | 'cash'
  const [paymentMethod, setPaymentMethod] = useState('upi');

  // UPI Form State
  const [upiRef, setUpiRef] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [desktopNotice, setDesktopNotice] = useState(false);

  // Cash Form State
  const [cashNote, setCashNote] = useState('');

  // General Status
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState(null);

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

  // UPI URIs
  const genericUpiUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(upiNote)}`;
  const gpayUrl = `tez://upi/pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(upiNote)}`;
  const phonepeUrl = `phonepe://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(upiNote)}`;
  const paytmUrl = `paytmmp://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(upiNote)}`;

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
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleLaunchUpi = (url) => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    window.location.href = url;
    if (!isMobile) {
      setDesktopNotice(true);
      setTimeout(() => setDesktopNotice(false), 6000);
    }
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

  // Submit UPI Payment
  const handleSubmitUpi = async (e) => {
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
        setUploadStatus('Uploading screenshot proof...');
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

  // Submit Cash Payment
  const handleSubmitCash = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      setUploadStatus('Submitting cash payment notice...');
      const noteSuffix = cashNote.trim() ? ` — ${cashNote.trim()}` : '';
      const cashRef = `Paid Cash to Admin (Hand-to-Hand)${noteSuffix}`;

      await onPaymentSuccess({
        weeks_count: 1,
        upi_ref: cashRef,
        screenshot_url: null,
        amount: totalAmount,
      });

      // Reset
      setCashNote('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit cash payment notice.');
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
      <div className="modal-content" style={{ padding: '1.25rem 1.5rem', maxWidth: '480px', margin: '0 auto' }}>
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
              {hasPartialBalance ? 'Remaining Balance Due' : 'Your Match Share'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              Receiver: <strong style={{ color: 'var(--text-primary)' }}>{payeeName}</strong>
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--green-400)', letterSpacing: '-0.02em' }}>
            ₹{totalAmount}
          </div>
        </div>

        {/* Payment Method Selector Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.4rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '0.25rem',
          marginBottom: '1rem',
        }}>
          <button
            type="button"
            className={`btn btn-sm ${paymentMethod === 'upi' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPaymentMethod('upi')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '0.45rem',
              border: paymentMethod === 'upi' ? 'none' : 'transparent',
            }}
          >
            <Smartphone size={14} />
            <span>Pay via UPI / QR</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${paymentMethod === 'cash' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPaymentMethod('cash')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '0.45rem',
              border: paymentMethod === 'cash' ? 'none' : 'transparent',
            }}
          >
            <Banknote size={14} />
            <span>Paid Cash to Admin</span>
          </button>
        </div>

        {/* TAB 1: UPI PAYMENT MODE */}
        {paymentMethod === 'upi' && (
          <div>
            {/* Desktop Notice if triggered */}
            {desktopNotice && (
              <div style={{
                background: 'rgba(96, 165, 250, 0.12)',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                borderRadius: '8px',
                padding: '0.6rem 0.85rem',
                color: 'var(--blue-400)',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                marginBottom: '0.85rem',
              }}>
                <Info size={15} style={{ flexShrink: 0 }} />
                <span>UPI apps open directly on mobile phones. On computer, please scan the QR code using your phone camera or GPay/PhonePe/Paytm app.</span>
              </div>
            )}

            {/* Quick App Launcher Buttons */}
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Open in Your Mobile UPI App:
              </div>

              {/* Primary "Any UPI App" Button */}
              <button
                type="button"
                onClick={() => handleLaunchUpi(genericUpiUrl)}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  padding: '0.55rem',
                  marginBottom: '0.45rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.25)',
                }}
              >
                <ExternalLink size={15} />
                <span>Pay via Any UPI App (Mobile)</span>
              </button>

              {/* Individual App Shortcuts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => handleLaunchUpi(gpayUrl)}
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.4rem', justifyContent: 'center' }}
                  title="Open Google Pay"
                >
                  <span>Google Pay</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunchUpi(phonepeUrl)}
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.4rem', justifyContent: 'center' }}
                  title="Open PhonePe"
                >
                  <span>PhonePe</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunchUpi(paytmUrl)}
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.4rem', justifyContent: 'center' }}
                  title="Open Paytm"
                >
                  <span>Paytm</span>
                </button>
              </div>
            </div>

            {/* Side-by-Side QR & Copy UPI Section */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-dim)',
              borderRadius: '10px',
              padding: '0.75rem',
              marginBottom: '0.85rem',
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
                <QRCodeSVG value={genericUpiUrl} size={105} level="M" />
              </div>

              {/* Copy UPI Box */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Or enter UPI ID manually:
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-layer-1)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '0.4rem 0.55rem',
                  marginBottom: '0.4rem',
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
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Scan with your phone camera or copy ID into any UPI app.
                </div>
              </div>
            </div>

            {/* UPI Verification Form */}
            <form onSubmit={handleSubmitUpi}>
              {/* Screenshot Upload Bar */}
              <div style={{ marginBottom: '0.55rem' }}>
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
                      gap: '0.45rem',
                      border: '1px dashed var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.85rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
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
                    <Upload size={15} color="var(--green-400)" />
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
        )}

        {/* TAB 2: CASH PAYMENT MODE */}
        {paymentMethod === 'cash' && (
          <form onSubmit={handleSubmitCash}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              borderRadius: '10px',
              padding: '1.15rem',
              marginBottom: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--green-400)',
                  fontSize: '1.2rem',
                  flexShrink: 0,
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                }}>
                  💵
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Handed Cash Directly to Admin
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Cash will be verified and approved by the turf admin.
                  </p>
                </div>
              </div>

              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.82rem',
                lineHeight: 1.5,
                color: 'var(--text-secondary)',
                marginBottom: '0.85rem',
              }}>
                <div>• Amount: <strong style={{ color: 'var(--green-400)', fontSize: '0.95rem' }}>₹{totalAmount}</strong></div>
                <div>• Turf Admin: <strong style={{ color: 'var(--text-primary)' }}>Faisal Rashid (Admin)</strong></div>
                <div style={{ marginTop: '0.35rem', color: 'var(--amber-400)', fontSize: '0.76rem' }}>
                  ⏳ Once submitted, your status will be <strong>"Pending Cash Confirmation"</strong> until the admin confirms receipt in the Admin Center.
                </div>
              </div>

              {/* Optional Cash Note */}
              <div>
                <label className="form-label" htmlFor="cash-note" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Add Note for Admin (Optional):
                </label>
                <input
                  id="cash-note"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Paid in cash at the pitch / Given before match"
                  value={cashNote}
                  onChange={(e) => setCashNote(e.target.value)}
                  maxLength={60}
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                />
              </div>
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
                style={{
                  padding: '0.55rem 1.35rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <CheckCircle size={15} />
                <span>{submitting ? (uploadStatus || 'Processing...') : `Submit Cash Notice (₹${totalAmount})`}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
