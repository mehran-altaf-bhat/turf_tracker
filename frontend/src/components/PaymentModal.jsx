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
} from 'lucide-react';

export default function PaymentModal({
  isOpen,
  onClose,
  config,
  onPaymentSuccess,
  balanceDue = null,
  payableAmount = null,
  amountPaid = 0,
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

  const costPerWeek = config?.cost_per_person || 200;
  const standardFee = payableAmount || costPerWeek;

  // If user has a balance due for this week, week 1 pays balanceDue, additional weeks pay full fee
  const hasPartialBalance = balanceDue !== null && balanceDue > 0 && balanceDue < standardFee;
  const currentWeekPayable = hasPartialBalance ? balanceDue : standardFee;
  const totalAmount = weeks === 1 ? currentWeekPayable : (currentWeekPayable + (weeks - 1) * costPerWeek);

  const vpa = config?.vpa || '7006869014@hdfc';
  const payeeName = config?.name || 'FAISAL RASHID BHAT';

  // Dynamic UPI URI reflecting selected weeks or balance amount
  const upiUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(
    hasPartialBalance && weeks === 1
      ? `Turf Balance Payment (₹${totalAmount})`
      : `Turf Fee for ${weeks} week(s)`
  )}`;

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
      style={{ maxWidth: '520px', width: '95%' }}
      closedby="any"
      onClose={onClose}
    >
      <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#0f172a' }}>
              <span>⚽</span>
              <span>{hasPartialBalance && weeks === 1 ? 'Pay Match Fee Balance' : 'Pay for Friday Turf'}</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Elite Football Turf (8:00 PM - 10:00 PM)
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
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            color: '#be123c',
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
            background: '#f8fafc',
            border: '1px solid #eaecf0',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
              Match Fee Breakdown:
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
              <span>Total Match Fee:</span>
              <strong style={{ color: '#0f172a' }}>₹{standardFee}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#059669', marginBottom: '0.4rem' }}>
              <span>Compensated / Shifted Credit:</span>
              <strong>-₹{amountPaid}</strong>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.95rem',
              fontWeight: 800,
              color: '#0f172a',
              borderTop: '1px dashed #cbd5e1',
              paddingTop: '0.4rem',
            }}>
              <span>Remaining Balance to Pay:</span>
              <span style={{ color: '#059669' }}>₹{balanceDue}</span>
            </div>
          </div>
        )}

        {/* Advance Weeks Selector */}
        <div>
          <label className="form-label" style={{ fontSize: '0.85rem', color: '#334155' }}>
            Select Number of Weeks / Advance Sessions:
          </label>
          <div className="weeks-selector">
            {[1, 2, 3, 4].map((w) => {
              const previewAmount = w === 1 ? currentWeekPayable : (currentWeekPayable + (w - 1) * costPerWeek);
              return (
                <div
                  key={w}
                  className={`week-btn ${weeks === w ? 'active' : ''}`}
                  onClick={() => setWeeks(w)}
                >
                  <div className="week-count">{w} {w === 1 ? 'Week' : 'Weeks'}</div>
                  <div className="week-amount">₹{previewAmount}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Amount Highlight */}
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '10px',
          padding: '0.85rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '1rem 0',
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>
              {hasPartialBalance && weeks === 1 ? 'Net Balance Due' : `Amount Payable (${weeks} ${weeks === 1 ? 'Match' : 'Matches'})`}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
              Receiver: {payeeName}
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>
            ₹{totalAmount}
          </div>
        </div>

        {/* QR Code Block */}
        <div style={{ textAlign: 'center', margin: '0.75rem 0' }}>
          <div className="qr-container" style={{ margin: '0 auto' }}>
            <QRCodeSVG
              value={upiUrl}
              size={180}
              level="H"
              includeMargin={true}
            />
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
            UPI ID: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{vpa}</strong>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
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
        <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
          {/* Screenshot Upload Section */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <ImageIcon size={15} color="#059669" />
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
                  border: '2px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: '#f8fafc',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#059669';
                  e.currentTarget.style.background = '#f0fdf4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.background = '#f8fafc';
                }}
              >
                <Upload size={24} color="#64748b" style={{ margin: '0 auto 0.4rem' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                  Click to upload payment screenshot
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  PNG, JPG or JPEG (Max 10MB)
                </div>
              </div>
            ) : (
              <div style={{
                position: 'relative',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid #a7f3d0',
                background: '#ecfdf5',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}>
                <img
                  src={screenshotPreview}
                  alt="Proof"
                  style={{
                    width: '60px',
                    height: '60px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FileCheck size={16} />
                    <span>Screenshot Selected</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#047857', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {screenshotFile?.name}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: '#ffffff', color: '#dc2626', border: '1px solid #fecdd3', padding: '0.35rem 0.6rem' }}
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
            <label className="form-label" htmlFor="upi-ref" style={{ fontSize: '0.85rem', color: '#334155' }}>
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

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
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
                <span>Submit ₹{totalAmount} Proof</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
