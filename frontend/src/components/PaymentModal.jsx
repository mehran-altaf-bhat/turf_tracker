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
  FileCheck
} from 'lucide-react';

export default function PaymentModal({ isOpen, onClose, config, onPaymentSuccess }) {
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
  const totalAmount = weeks * costPerWeek;
  const vpa = config?.vpa || '7006869014@hdfc';
  const payeeName = config?.name || 'FAISAL RASHID BHAT';

  // Dynamic UPI URI reflecting selected weeks amount
  const upiUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Turf Fee for ${weeks} week(s)`)}`;

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
            marginBottom: '1rem',
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

        {/* Dynamic UPI QR Card styled like Image 1 */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '1.5rem 1.25rem 1.25rem',
          textAlign: 'center',
          color: '#0f172a',
          margin: '1.25rem 0',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        }}>
          {/* Header Payee Name */}
          <h2 style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            color: '#0f172a',
            marginBottom: '1rem',
            textTransform: 'uppercase',
          }}>
            {payeeName}
          </h2>

          {/* QR Code */}
          <div style={{
            display: 'inline-flex',
            padding: '10px',
            background: '#fff',
            borderRadius: '14px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          }}>
            <QRCodeSVG
              value={upiUrl}
              size={195}
              level="H"
              includeMargin={false}
            />
          </div>

          {/* Amount Display */}
          <div style={{
            marginTop: '0.85rem',
            fontSize: '1.4rem',
            fontWeight: 800,
            color: '#059669',
          }}>
            ₹{totalAmount}
          </div>

          {/* UPI ID Footer */}
          <div style={{
            marginTop: '0.5rem',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: '#1e293b',
            letterSpacing: '0.02em',
          }}>
            UPI ID: <span style={{ color: '#0f172a' }}>{vpa}</span>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
            Scan with GPay, PhonePe, Paytm or any UPI App
          </div>
        </div>

        {/* Mobile UPI Deep Link */}
        <div style={{ marginBottom: '1.5rem' }}>
          <a
            href={upiUrl}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.9rem' }}
          >
            <ExternalLink size={16} />
            <span>Open in UPI App (Pay ₹{totalAmount})</span>
          </a>
        </div>

        {/* Payment Confirmation Form */}
        <form onSubmit={handleSubmit}>
          {/* 1. UTR Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="upi-ref-input">
              UPI Reference / UTR Number (12 digits)
            </label>
            <input
              id="upi-ref-input"
              type="text"
              className="form-input"
              placeholder="e.g. 423589102431 or Transaction ID"
              value={upiRef}
              onChange={(e) => setUpiRef(e.target.value)}
            />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            margin: '0.75rem 0',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            <span>OR ATTACH PROOF</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          </div>

          {/* 2. Screenshot Upload */}
          <div className="form-group">
            <label className="form-label">Payment Screenshot</label>
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
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1.25rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.02)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--pitch-green)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              >
                <Upload size={24} color="var(--pitch-green-light)" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>
                  Click to Upload Payment Screenshot
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  PNG, JPG, or JPEG (Max 10MB)
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--border-accent)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src={screenshotPreview}
                    alt="Payment proof preview"
                    style={{
                      width: '46px',
                      height: '46px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <FileCheck size={15} color="var(--pitch-green-light)" />
                      <span>{screenshotFile?.name || 'Screenshot selected'}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--pitch-green-light)' }}>
                      Ready to submit with payment
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={handleRemoveScreenshot}
                  title="Remove screenshot"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ flex: 2 }}
            >
              {submitting ? (uploadStatus || 'Submitting...') : `Submit Payment (₹${totalAmount})`}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
