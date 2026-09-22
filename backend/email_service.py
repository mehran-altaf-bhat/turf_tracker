import os
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

# Load .env
env_path = find_dotenv(usecwd=True)
if env_path:
    load_dotenv(env_path)
else:
    load_dotenv(Path(__file__).parent.parent / ".env")

SMTP_HOST = os.environ.get("SMTP_HOST", "").strip()
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER", "").strip()
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "").strip()
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "mehranbhat010@gmail.com").strip()
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "ASEEF XI — Friday Football").strip()
APP_URL = os.environ.get("APP_URL", "http://localhost:5173").strip()


def is_smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def _send_email_sync(to_email: str, subject: str, html_content: str, text_content: str = ""):
    safe_subject = subject.encode("ascii", "replace").decode("ascii")
    if not is_smtp_configured():
        print(f"[EMAIL SERVICE] (Mock / Unconfigured SMTP) To: {to_email} | Subject: {safe_subject}")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
        msg["To"] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_USER, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_USER, [to_email], msg.as_string())

        print(f"[EMAIL SERVICE] Email sent successfully to {to_email}: '{safe_subject}'")
    except Exception as e:
        print(f"[EMAIL SERVICE ERROR] Failed sending to {to_email}: {e}")


def _dispatch_async(func, *args):
    thread = threading.Thread(target=func, args=args, daemon=True)
    thread.start()


def send_admin_new_user_notification(player_name: str, player_email: str, player_phone: str = None):
    """
    Sends an immediate notification to the turf administrator when a new player signs up.
    """
    timestamp = datetime.now().strftime("%d %b %Y, %I:%M %p")
    phone_display = player_phone.strip() if player_phone and player_phone.strip() else "Not provided"

    subject = f"⚡ Action Required: New Player Registration ({player_name})"

    text_content = f"""
New Player Registered — ASEEF XI Turf Tracker

Player Name: {player_name}
Email: {player_email}
Phone: {phone_display}
Registered At: {timestamp}

This player is currently pending your approval before they can log in or join match squads.
Review and approve them here: {APP_URL}/app
"""

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Player Registration</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0e17; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0a0e17; padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" border="0" cellspacing="0" cellpadding="0" style="max-width:580px; background:linear-gradient(180deg, #111827 0%, #0b1120 100%); border:1px solid #1e293b; border-radius:18px; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding:32px 36px 24px; border-bottom:1px solid rgba(255,255,255,0.06); text-align:center; background:linear-gradient(90deg, rgba(16,185,129,0.08) 0%, rgba(251,191,36,0.08) 100%);">
              <div style="display:inline-block; padding:6px 14px; background:rgba(251,191,36,0.15); border:1px solid rgba(251,191,36,0.3); border-radius:999px; font-size:12px; font-weight:700; color:#fbbf24; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">
                ⚡ New Player Registration
              </div>
              <h1 style="margin:0; font-size:24px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">ASEEF XI — Friday Football</h1>
              <p style="margin:8px 0 0; font-size:14px; color:#94a3b8;">Turf Admin Command Notification</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:32px 36px;">
              <p style="margin:0 0 20px; font-size:16px; line-height:1.6; color:#cbd5e1;">
                Hello <strong>Turf Administrator</strong>,
              </p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#94a3b8;">
                A new player has just registered for <strong style="color:#ffffff;">ASEEF XI Friday Football</strong> and is waiting for your approval before they can access the pitch hub or join the match squad.
              </p>

              <!-- Player Details Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#0f172a; border:1px solid #1e293b; border-radius:12px; margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.04);">
                    <span style="font-size:12px; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; font-weight:700; display:block; margin-bottom:4px;">Player Name</span>
                    <strong style="font-size:17px; color:#10b981;">{player_name}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.04);">
                    <span style="font-size:12px; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; font-weight:700; display:block; margin-bottom:4px;">Email Address</span>
                    <span style="font-size:15px; color:#f1f5f9; font-family:monospace;">{player_email}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.04);">
                    <span style="font-size:12px; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; font-weight:700; display:block; margin-bottom:4px;">Phone Number</span>
                    <span style="font-size:15px; color:#f1f5f9;">{phone_display}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <span style="font-size:12px; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; font-weight:700; display:block; margin-bottom:4px;">Registered At</span>
                    <span style="font-size:14px; color:#94a3b8;">{timestamp}</span>
                  </td>
                </tr>
              </table>

              <!-- Call to Action -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="{APP_URL}/app" style="display:inline-block; background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:#ffffff; text-decoration:none; font-size:15px; font-weight:700; padding:14px 34px; border-radius:10px; box-shadow:0 8px 20px rgba(16,185,129,0.35); text-transform:none;">
                      Review & Approve in Admin Command →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0; font-size:13px; color:#64748b; text-align:center;">
                Unapproved players cannot view match lineups or be added to the Friday squad until you approve them.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px; background:#070b13; border-top:1px solid rgba(255,255,255,0.05); text-align:center;">
              <p style="margin:0; font-size:12px; color:#475569;">
                ASEEF XI Turf Football Tracking System &bull; Automated Admin Dispatch
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    _dispatch_async(_send_email_sync, ADMIN_EMAIL, subject, html_content, text_content)


def send_player_approved_notification(player_name: str, player_email: str):
    """
    Sends a high-aesthetic celebration email to the player when the admin approves their account.
    """
    subject = f"⚽ You're Cleared for the Pitch! Account Approved — ASEEF XI"

    text_content = f"""
Welcome to the Pitch, {player_name}! ⚽

Your account has officially been APPROVED by the ASEEF XI Turf Administrator.

You now have full access to:
- Friday Match Hub & Squad Lineups
- Direct 1-Click Match Fee payments via UPI & QR
- Match schedule and real-time squad roster status

Match Schedule: Every Friday Night (8:00 PM – 10:00 PM) at Elite Football Turf

Log in to your dashboard here: {APP_URL}/app
"""

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Approved — Welcome to ASEEF XI</title>
</head>
<body style="margin:0; padding:0; background-color:#070b14; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#070b14; padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; background:linear-gradient(180deg, #0f172a 0%, #090d16 100%); border:1px solid #1e293b; border-radius:20px; overflow:hidden; box-shadow:0 30px 60px -15px rgba(0,0,0,0.7);">
          
          <!-- Hero Header with Gold & Turf Green Accents -->
          <tr>
            <td style="padding:44px 36px 32px; text-align:center; background:radial-gradient(ellipse at top, rgba(16,185,129,0.2) 0%, transparent 70%); border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="display:inline-block; font-size:42px; margin-bottom:12px; filter:drop-shadow(0 4px 12px rgba(16,185,129,0.4));">
                ⚽
              </div>
              <div style="display:inline-block; padding:5px 16px; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.35); border-radius:999px; font-size:12px; font-weight:800; color:#34d399; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:16px;">
                Account Officially Cleared
              </div>
              <h1 style="margin:0; font-size:28px; font-weight:900; color:#ffffff; letter-spacing:-0.5px; text-shadow:0 2px 10px rgba(0,0,0,0.5);">
                Lace Up Your Boots, {player_name}!
              </h1>
              <p style="margin:10px 0 0; font-size:15px; color:#94a3b8;">You're ready to take the pitch with ASEEF XI</p>
            </td>
          </tr>

          <!-- Main Message -->
          <tr>
            <td style="padding:36px;">
              <p style="margin:0 0 20px; font-size:16px; line-height:1.7; color:#e2e8f0;">
                Great news! Your player profile has been <strong style="color:#10b981;">reviewed and approved</strong> by the Turf Administrator. You are now officially cleared to participate in our Friday night football matches!
              </p>

              <!-- Feature Highlights Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#0a0f1d; border:1px solid #1e293b; border-radius:14px; margin-bottom:30px; overflow:hidden;">
                <tr>
                  <td style="padding:20px; border-bottom:1px solid rgba(255,255,255,0.04);">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size:22px; padding-right:14px; vertical-align:top;">📅</td>
                        <td>
                          <strong style="color:#ffffff; font-size:15px; display:block; margin-bottom:2px;">Friday Match Schedule</strong>
                          <span style="font-size:13px; color:#94a3b8;">Every Friday Night &bull; 8:00 PM – 10:00 PM at Elite Football Turf.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px; border-bottom:1px solid rgba(255,255,255,0.04);">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size:22px; padding-right:14px; vertical-align:top;">👥</td>
                        <td>
                          <strong style="color:#ffffff; font-size:15px; display:block; margin-bottom:2px;">Match Squad & Lineup</strong>
                          <span style="font-size:13px; color:#94a3b8;">View the match squad, line-up status, and confirmed teammates in real time.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size:22px; padding-right:14px; vertical-align:top;">⚡</td>
                        <td>
                          <strong style="color:#ffffff; font-size:15px; display:block; margin-bottom:2px;">Seamless Match Payments</strong>
                          <span style="font-size:13px; color:#94a3b8;">1-click UPI launch (GPay, PhonePe, Paytm), dynamic QR codes, and instant confirmation receipts.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="{APP_URL}/app" style="display:inline-block; background:linear-gradient(135deg, #10b981 0%, #047857 100%); color:#ffffff; text-decoration:none; font-size:16px; font-weight:800; padding:15px 40px; border-radius:12px; box-shadow:0 10px 25px rgba(16,185,129,0.4); letter-spacing:0.2px;">
                      Enter Match Hub & Squad →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Ground Rule Tip -->
              <div style="background:rgba(251,191,36,0.08); border-left:3px solid #fbbf24; padding:14px 18px; border-radius:0 8px 8px 0;">
                <p style="margin:0; font-size:13px; color:#fde68a; line-height:1.5;">
                  <strong>⚡ Turf Protocol:</strong> Please arrive 15 minutes prior to kickoff (7:45 PM). Ensure your match fee is settled or submitted before match day to lock in your squad spot!
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px; background:#05080e; border-top:1px solid rgba(255,255,255,0.05); text-align:center;">
              <p style="margin:0 0 6px; font-size:13px; font-weight:700; color:#cbd5e1;">
                ASEEF XI — Elite Friday Football
              </p>
              <p style="margin:0; font-size:11px; color:#64748b;">
                You received this confirmation because you registered for the ASEEF XI turf football team.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    _dispatch_async(_send_email_sync, player_email, subject, html_content, text_content)
