import os
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

from typing import Optional

# Load .env
env_path = find_dotenv(usecwd=True)
if env_path:
    load_dotenv(env_path)
else:
    load_dotenv(Path(__file__).parent.parent / ".env")


def get_smtp_config() -> dict:
    db_settings = {}
    try:
        try:
            from backend.database import service_client
        except ImportError:
            from database import service_client
        db = service_client()
        res = db.table("system_settings").select("key, value").execute().data or []
        db_settings = {row["key"]: row["value"] for row in res}
    except Exception as e:
        pass

    user = (db_settings.get("SMTP_USER") or os.environ.get("SMTP_USER", "")).strip()
    raw_pwd = (db_settings.get("SMTP_PASSWORD") or os.environ.get("SMTP_PASSWORD", "")).strip()
    pwd = raw_pwd.replace(" ", "")

    host = (db_settings.get("SMTP_HOST") or os.environ.get("SMTP_HOST", "")).strip()
    if not host and "@gmail.com" in user.lower():
        host = "smtp.gmail.com"

    port_str = str(db_settings.get("SMTP_PORT") or os.environ.get("SMTP_PORT") or "").strip()
    try:
        port = int(port_str) if port_str else 587
    except Exception:
        port = 587

    admin_email = (db_settings.get("ADMIN_EMAIL") or os.environ.get("ADMIN_EMAIL", "mehranbhat010@gmail.com")).strip()
    from_name = (db_settings.get("SMTP_FROM_NAME") or os.environ.get("SMTP_FROM_NAME", "ASEEF XI — Friday Football")).strip()
    app_url = (db_settings.get("APP_URL") or os.environ.get("APP_URL", "https://turf-tracker.vercel.app")).strip()

    return {
        "user": user,
        "password": pwd,
        "host": host,
        "port": port,
        "admin_email": admin_email,
        "from_name": from_name,
        "app_url": app_url,
        "configured": bool(host and user and pwd),
    }


def save_smtp_config(user: str, password: str, admin_email: Optional[str] = None, host: Optional[str] = None, port: Optional[int] = None) -> dict:
    try:
        from backend.database import service_client
    except ImportError:
        from database import service_client
    db = service_client()
    clean_user = user.strip()
    clean_pwd = password.strip().replace(" ", "")
    clean_admin = (admin_email or clean_user).strip()
    clean_host = (host or ("smtp.gmail.com" if "@gmail.com" in clean_user.lower() else "")).strip()
    clean_port = str(port or 587)

    settings = [
        ("SMTP_USER", clean_user),
        ("SMTP_PASSWORD", clean_pwd),
        ("ADMIN_EMAIL", clean_admin),
        ("SMTP_HOST", clean_host),
        ("SMTP_PORT", clean_port),
    ]
    for k, v in settings:
        db.table("system_settings").upsert({"key": k, "value": v}, on_conflict="key").execute()

    return get_smtp_config()


def is_smtp_configured() -> bool:
    return get_smtp_config()["configured"]


def _send_email_sync(to_email: str, subject: str, html_content: str, text_content: str = ""):
    cfg = get_smtp_config()
    safe_subject = subject.encode("ascii", "replace").decode("ascii")
    if not cfg["configured"]:
        print(f"[EMAIL SERVICE] (Mock / Unconfigured SMTP) To: {to_email} | Subject: {safe_subject}")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{cfg['from_name']} <{cfg['user']}>"
        msg["To"] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        if cfg["port"] == 465:
            with smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=15) as server:
                server.login(cfg["user"], cfg["password"])
                server.sendmail(cfg["user"], [to_email], msg.as_string())
        else:
            with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as server:
                server.starttls()
                server.login(cfg["user"], cfg["password"])
                server.sendmail(cfg["user"], [to_email], msg.as_string())

        print(f"[EMAIL SERVICE] Email sent successfully to {to_email}: '{safe_subject}'")
    except Exception as e:
        print(f"[EMAIL SERVICE ERROR] Failed sending to {to_email}: {e}")


def test_smtp_connection(target_email: Optional[str] = None) -> dict:
    """
    Tests SMTP connection and sends a test verification email.
    """
    cfg = get_smtp_config()
    if not cfg["configured"]:
        missing = []
        if not cfg["user"]:
            missing.append("SMTP_USER")
        if not cfg["password"]:
            missing.append("SMTP_PASSWORD")
        if not cfg["host"]:
            missing.append("SMTP_HOST")
        return {
            "success": False,
            "configured": False,
            "message": f"SMTP is not configured. Missing environment variables: {', '.join(missing)}.",
            "details": {
                "smtp_user": cfg["user"] or "Not Set",
                "smtp_host": cfg["host"] or "Not Set",
                "smtp_port": cfg["port"],
                "admin_email": cfg["admin_email"],
            },
        }

    dest = target_email or cfg["admin_email"]
    test_subject = "⚡ ASEEF XI — SMTP Email Verification Test"
    test_html = f"""
    <div style="font-family:sans-serif; background:#0f172a; color:#f8fafc; padding:24px; border-radius:12px;">
        <h2 style="color:#10b981; margin-top:0;">⚽ Turf Tracker Email System Connected!</h2>
        <p>This is a test verification email from <strong>ASEEF XI Turf Tracker</strong>.</p>
        <p>Your Gmail SMTP credentials are configured and working properly!</p>
        <hr style="border-color:#334155; margin:16px 0;" />
        <p style="font-size:13px; color:#94a3b8;">
            Host: <code>{cfg['host']}</code> | Port: <code>{cfg['port']}</code> | Sender: <code>{cfg['user']}</code>
        </p>
    </div>
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = test_subject
        msg["From"] = f"{cfg['from_name']} <{cfg['user']}>"
        msg["To"] = dest
        msg.attach(MIMEText("Test email from Turf Tracker", "plain", "utf-8"))
        msg.attach(MIMEText(test_html, "html", "utf-8"))

        if cfg["port"] == 465:
            with smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=15) as server:
                server.login(cfg["user"], cfg["password"])
                server.sendmail(cfg["user"], [dest], msg.as_string())
        else:
            with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as server:
                server.starttls()
                server.login(cfg["user"], cfg["password"])
                server.sendmail(cfg["user"], [dest], msg.as_string())

        return {
            "success": True,
            "configured": True,
            "message": f"Test email sent successfully to {dest}!",
            "details": {
                "recipient": dest,
                "smtp_user": cfg["user"],
                "smtp_host": cfg["host"],
                "smtp_port": cfg["port"],
            },
        }
    except Exception as e:
        return {
            "success": False,
            "configured": True,
            "message": f"SMTP Authentication or Connection failed: {str(e)}",
            "details": {
                "error": str(e),
                "smtp_user": cfg["user"],
                "smtp_host": cfg["host"],
                "smtp_port": cfg["port"],
            },
        }



def _dispatch_async(func, *args):
    thread = threading.Thread(target=func, args=args, daemon=True)
    thread.start()


def send_admin_new_user_notification(player_name: str, player_email: str, player_phone: str = None):
    """
    Sends an immediate notification to the turf administrator when a new player signs up.
    """
    cfg = get_smtp_config()
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
Review and approve them here: {cfg['app_url']}/app
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
                    <a href="{cfg['app_url']}/app" style="display:inline-block; background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:#ffffff; text-decoration:none; font-size:15px; font-weight:700; padding:14px 34px; border-radius:10px; box-shadow:0 8px 20px rgba(16,185,129,0.35); text-transform:none;">
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
    _dispatch_async(_send_email_sync, cfg["admin_email"], subject, html_content, text_content)


def send_player_approved_notification(player_name: str, player_email: str):
    """
    Sends a high-aesthetic celebration email to the player when the admin approves their account.
    """
    cfg = get_smtp_config()
    subject = f"⚽ You're Cleared for the Pitch! Account Approved — ASEEF XI"

    text_content = f"""
Welcome to the Pitch, {player_name}! ⚽

Your account has officially been APPROVED by the ASEEF XI Turf Administrator.

You now have full access to:
- Friday Match Hub & Squad Lineups
- Direct 1-Click Match Fee payments via UPI & QR
- Match schedule and real-time squad roster status

Match Schedule: Every Friday Night (8:00 PM – 10:00 PM) at Elite Football Turf

Log in to your dashboard here: {cfg['app_url']}/app
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
                    <a href="{cfg['app_url']}/app" style="display:inline-block; background:linear-gradient(135deg, #10b981 0%, #047857 100%); color:#ffffff; text-decoration:none; font-size:16px; font-weight:800; padding:15px 40px; border-radius:12px; box-shadow:0 10px 25px rgba(16,185,129,0.4); letter-spacing:0.2px;">
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


import json
from datetime import timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))


def format_turf_time(t: str) -> str:
    if not t:
        return ""
    t = str(t).strip()
    if "am" in t.lower() or "pm" in t.lower():
        return t
    parts = t.split(":")
    if parts:
        try:
            hour = int(parts[0])
            min_str = parts[1].zfill(2) if len(parts) > 1 else "00"
            if hour >= 12:
                ampm = "PM"
                if hour > 12:
                    hour -= 12
            elif 1 <= hour <= 11:
                ampm = "PM"  # Football turf matches are evening
            else:
                hour = 12
                ampm = "AM"
            return f"{hour}:{min_str} {ampm}"
        except Exception:
            return t
    return t


def parse_match_datetime_ist(date_str: str, time_str: str) -> datetime:
    parts = str(time_str).strip().split(":")
    hour = 20
    minute = 0
    if parts:
        try:
            h = int(parts[0])
            m = int(parts[1][:2]) if len(parts) > 1 and parts[1][:2].isdigit() else 0
            if "pm" in time_str.lower() and h < 12:
                h += 12
            elif "am" in time_str.lower() and h == 12:
                h = 0
            elif "am" not in time_str.lower() and "pm" not in time_str.lower():
                if 1 <= h <= 11:
                    h += 12  # turf matches are evening
            hour = h
            minute = m
        except Exception:
            pass
    try:
        dt_naive = datetime.strptime(date_str, "%Y-%m-%d")
    except Exception:
        dt_naive = datetime.now()
    return dt_naive.replace(hour=hour, minute=minute, second=0, microsecond=0, tzinfo=IST)


def send_match_reminder_email(
    player_name: str,
    player_email: str,
    session_info: dict,
    payment_info: dict,
    reminder_type: str = "1day",
):
    """
    Sends a personalized match reminder email to a squad player.
    Supports '1day' (24 hours prior) and '3hours' (match day final alert).
    """
    cfg = get_smtp_config()

    ground_name = session_info.get("ground_name") or "Elite Football Turf"
    session_date = session_info.get("session_date") or ""
    start_time = session_info.get("start_time") or "20:00"
    end_time = session_info.get("end_time") or "22:00"

    formatted_start = format_turf_time(start_time)
    formatted_end = format_turf_time(end_time)
    formatted_time = f"{formatted_start} – {formatted_end}" if formatted_start and formatted_end else "8:00 PM – 10:00 PM"

    try:
        dt_obj = datetime.strptime(session_date, "%Y-%m-%d")
        formatted_date = dt_obj.strftime("%A, %d %B %Y")
    except Exception:
        formatted_date = f"Friday, {session_date}"

    is_paid = payment_info.get("is_paid", False)
    amount_paid = payment_info.get("amount_paid", 0)
    balance = payment_info.get("balance", 0)
    payable = payment_info.get("payable", 200)

    try:
        from backend.database import UPI_VPA, UPI_NAME
    except ImportError:
        UPI_VPA = "7006869014@hdfc"
        UPI_NAME = "FAISAL RASHID BHAT"

    upi_pay_url = (
        f"upi://pay?pa={UPI_VPA}&pn={UPI_NAME.replace(' ', '%20')}&am={balance}&cu=INR"
        f"&tn=Turf%20Match%20Fee%20{session_date}"
    )

    if reminder_type == "3hours":
        badge_text = "🔥 3-HOUR MATCH COUNTDOWN"
        badge_bg = "rgba(239, 68, 68, 0.15)"
        badge_border = "rgba(239, 68, 68, 0.35)"
        badge_color = "#f87171"
        headline = f"Kickoff in 3 Hours, {player_name}!"
        subject = f"🔥 Kickoff in 3 Hours! Match Tonight at {ground_name} ({formatted_time})"
        urgency_note = (
            f"The countdown is on! The match kicks off tonight at <strong style='color:#ffffff;'>{formatted_start}</strong>. "
            f"Please arrive at the ground 15 minutes before whistle for kit up and team warm-ups."
        )
    else:
        badge_text = "📅 24-HOUR MATCH REMINDER"
        badge_bg = "rgba(16, 185, 129, 0.15)"
        badge_border = "rgba(16, 185, 129, 0.35)"
        badge_color = "#34d399"
        headline = f"Match Day is Tomorrow, {player_name}!"
        subject = f"⚽ Match Tomorrow: ASEEF XI Friday Football at {ground_name} ({formatted_time})"
        urgency_note = (
            f"The pitch is booked and your squad spot is ready! We play tomorrow, <strong style='color:#ffffff;'>{formatted_date}</strong>. "
            f"Review the match details below and ensure your gear and payment are set."
        )

    # Payment Status Box
    if is_paid:
        payment_box_html = f"""
        <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:12px; padding:18px 20px; margin-bottom:24px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:22px;">✅</span>
                <div>
                    <strong style="color:#10b981; font-size:15px; display:block;">Squad Spot Confirmed & Paid</strong>
                    <span style="color:#cbd5e1; font-size:13px;">Match fee of ₹{amount_paid} is fully settled. Just bring your boots and game face!</span>
                </div>
            </div>
        </div>
        """
        payment_text = f"Payment Status: Paid in Full (₹{amount_paid}) - Squad Confirmed"
    else:
        payment_box_html = f"""
        <div style="background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.35); border-radius:12px; padding:18px 20px; margin-bottom:24px;">
            <div style="margin-bottom:12px;">
                <strong style="color:#fbbf24; font-size:15px; display:block; margin-bottom:4px;">⚠️ Match Fee Pending: ₹{balance} Due</strong>
                <span style="color:#cbd5e1; font-size:13px;">Please settle your match fee via UPI or submit your payment proof to confirm your spot without pitch-side delays.</span>
            </div>
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                    <td align="center">
                        <a href="{upi_pay_url}" style="display:inline-block; background:#fbbf24; color:#0f172a; font-weight:800; font-size:14px; text-decoration:none; padding:10px 24px; border-radius:8px; margin-right:8px;">
                            ⚡ Pay ₹{balance} via UPI App
                        </a>
                        <a href="{cfg['app_url']}/app" style="display:inline-block; background:rgba(255,255,255,0.08); color:#f1f5f9; font-weight:600; font-size:13px; text-decoration:none; padding:10px 18px; border-radius:8px; border:1px solid rgba(255,255,255,0.15);">
                            Submit Screenshot →
                        </a>
                    </td>
                </tr>
            </table>
        </div>
        """
        payment_text = f"Payment Status: Outstanding (₹{balance} due). Settle via UPI ({UPI_VPA}) or at {cfg['app_url']}/app"

    text_content = f"""
{headline}

{urgency_note}

Match Details:
- Ground: {ground_name}
- Date: {formatted_date}
- Timing: {formatted_time} (Arrive 15 min prior)
- Match Fee: ₹{payable}

{payment_text}

Open Match Hub: {cfg['app_url']}/app
"""

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#070b14; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#070b14; padding:35px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="590" border="0" cellspacing="0" cellpadding="0" style="max-width:590px; background:linear-gradient(180deg, #0f172a 0%, #090d16 100%); border:1px solid #1e293b; border-radius:20px; overflow:hidden; box-shadow:0 30px 60px -15px rgba(0,0,0,0.7);">
          
          <!-- Top Badge & Header Banner -->
          <tr>
            <td style="padding:36px 36px 28px; text-align:center; background:radial-gradient(ellipse at top, rgba(16,185,129,0.18) 0%, transparent 70%); border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="display:inline-block; padding:5px 16px; background:{badge_bg}; border:1px solid {badge_border}; border-radius:999px; font-size:12px; font-weight:800; color:{badge_color}; text-transform:uppercase; letter-spacing:1.2px; margin-bottom:14px;">
                {badge_text}
              </div>
              <h1 style="margin:0; font-size:26px; font-weight:900; color:#ffffff; letter-spacing:-0.5px; text-shadow:0 2px 8px rgba(0,0,0,0.4);">
                {headline}
              </h1>
              <p style="margin:8px 0 0; font-size:14px; color:#94a3b8;">
                ASEEF XI &bull; Friday Night Football
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:32px 36px;">
              <p style="margin:0 0 22px; font-size:15px; line-height:1.65; color:#cbd5e1;">
                {urgency_note}
              </p>

              <!-- Payment Box -->
              {payment_box_html}

              <!-- Match Venue Details Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#0a0f1d; border:1px solid #1e293b; border-radius:14px; margin-bottom:26px; overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.04);">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size:22px; padding-right:14px; vertical-align:top;">📍</td>
                        <td>
                          <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; font-weight:700; display:block;">Match Ground</span>
                          <strong style="color:#ffffff; font-size:16px;">{ground_name}</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.04);">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size:22px; padding-right:14px; vertical-align:top;">📅</td>
                        <td>
                          <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; font-weight:700; display:block;">Date</span>
                          <strong style="color:#10b981; font-size:15px;">{formatted_date}</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.04);">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size:22px; padding-right:14px; vertical-align:top;">⏰</td>
                        <td>
                          <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; font-weight:700; display:block;">Timing Slot</span>
                          <strong style="color:#38bdf8; font-size:15px;">{formatted_time}</strong>
                          <span style="color:#94a3b8; font-size:12px; margin-left:6px;">(Whistle at {formatted_start})</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size:22px; padding-right:14px; vertical-align:top;">⏱️</td>
                        <td>
                          <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; font-weight:700; display:block;">Arrival Guidance</span>
                          <strong style="color:#fbbf24; font-size:14px;">Please arrive 15 minutes before kickoff</strong>
                          <span style="color:#94a3b8; font-size:12px; display:block; margin-top:2px;">Allows time for bib allocation, boots, and team warm-up.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Match Checklist -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:14px 18px; margin-bottom:26px;">
                <tr>
                  <td>
                    <strong style="color:#ffffff; font-size:13px; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:8px;">Match Checklist</strong>
                    <div style="font-size:13px; color:#94a3b8; line-height:1.7;">
                      ⚽ Turf studs / football boots &bull; 🛡️ Shin pads recommended &bull; 💧 Water bottle &bull; ⏱️ On-time arrival
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Hub CTA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
                <tr>
                  <td align="center">
                    <a href="{cfg['app_url']}/app" style="display:inline-block; background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:#ffffff; text-decoration:none; font-size:15px; font-weight:800; padding:14px 38px; border-radius:12px; box-shadow:0 8px 22px rgba(16,185,129,0.35);">
                      View Match Squad & Live Lineup →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0; font-size:12px; color:#64748b; text-align:center;">
                Questions or unable to attend? Message the team group or contact the admin.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 36px; background:#05080e; border-top:1px solid rgba(255,255,255,0.05); text-align:center;">
              <p style="margin:0 0 4px; font-size:12px; font-weight:700; color:#cbd5e1;">
                ASEEF XI — Friday Night Football
              </p>
              <p style="margin:0; font-size:11px; color:#64748b;">
                Automated match reminder dispatched to registered squad players.
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


def dispatch_session_reminders(
    session_id: int, reminder_type: str = "1day", force: bool = False
) -> dict:
    """
    Dispatches reminder emails to all active approved squad players for a match session.
    Prevents duplicate sending unless force=True.
    """
    try:
        from backend.database import service_client
    except ImportError:
        from database import service_client

    db = service_client()

    # 1. Fetch Session
    session_res = db.table("turf_sessions").select("*").eq("id", session_id).single().execute()
    if not session_res.data:
        return {"success": False, "message": f"Session with ID {session_id} not found."}
    session = session_res.data

    # 2. Check duplicate prevention in system_settings
    setting_key = f"reminder_sent:{session_id}:{reminder_type}"
    existing_setting = db.table("system_settings").select("value").eq("key", setting_key).execute().data
    if existing_setting and not force:
        val_str = existing_setting[0].get("value", "")
        try:
            info = json.loads(val_str)
        except Exception:
            info = {"sent_at": val_str}
        return {
            "success": True,
            "already_sent": True,
            "message": f"{'1-Day' if reminder_type == '1day' else '3-Hour'} reminder was already sent for this match.",
            "sent_info": info,
        }

    # 3. Recalculate and fetch squad roster
    try:
        from backend.squad_service import recalculate_session_squad_split
        split_info = recalculate_session_squad_split(session_id)
        cost_per_person = split_info.get("split_cost", session.get("cost_per_person", 200))
    except Exception:
        cost_per_person = session.get("cost_per_person", 200)

    # Payments for this session
    payments = db.table("payments").select("*").eq("session_id", session_id).execute().data or []
    payments_by_user = {p["user_id"]: p for p in payments}

    # All registered profiles and users
    profiles = db.table("profiles").select("*").execute().data or []
    profile_map = {p["id"]: p for p in profiles}

    users = db.table("users").select("id, email, name, role").execute().data or []
    user_map = {u["id"]: u for u in users}

    # Collect target players:
    # If payments exist, include all non-admin users in payments.
    # Otherwise include all active, approved players.
    target_user_ids = set()
    if payments:
        for p in payments:
            u_id = p["user_id"]
            prof = profile_map.get(u_id)
            if prof and prof.get("role") != "admin":
                target_user_ids.add(u_id)
    else:
        for p in profiles:
            if p.get("role") != "admin" and p.get("is_approved") is True and p.get("is_active", True) is not False:
                target_user_ids.add(p["id"])

    recipients = []
    for u_id in target_user_ids:
        u_info = user_map.get(u_id)
        p_info = profile_map.get(u_id)
        if not u_info or not u_info.get("email"):
            continue

        email = u_info["email"].strip()
        if not email or "@" not in email:
            continue

        name = p_info.get("name") if p_info else (u_info.get("name") or "Player")

        # Payment details
        pay = payments_by_user.get(u_id)
        p_status = pay.get("status", "unpaid") if pay else "unpaid"
        amt_paid = pay.get("amount", 0) if pay and p_status in ["confirmed", "partial", "pending"] else 0
        balance = max(0, cost_per_person - amt_paid)
        is_paid = (p_status == "confirmed" and balance == 0)

        payment_data = {
            "is_paid": is_paid,
            "status": p_status,
            "amount_paid": amt_paid,
            "balance": balance,
            "payable": cost_per_person,
        }

        send_match_reminder_email(
            player_name=name,
            player_email=email,
            session_info=session,
            payment_info=payment_data,
            reminder_type=reminder_type,
        )
        recipients.append({"id": u_id, "name": name, "email": email, "is_paid": is_paid})

    # 4. Save record of sent reminder in system_settings
    now_iso = datetime.now(IST).isoformat()
    record = {
        "sent_at": now_iso,
        "count": len(recipients),
        "reminder_type": reminder_type,
        "session_id": session_id,
        "recipients": recipients,
    }
    db.table("system_settings").upsert({
        "key": setting_key,
        "value": json.dumps(record),
    }, on_conflict="key").execute()

    return {
        "success": True,
        "already_sent": False,
        "message": f"Dispatched {reminder_type} match reminder to {len(recipients)} player(s) successfully!",
        "recipients_count": len(recipients),
        "session_id": session_id,
        "reminder_type": reminder_type,
        "sent_at": now_iso,
    }


def get_session_reminder_status(session_id: int) -> dict:
    """
    Returns the status of both 1-day and 3-hour match reminders for a session.
    """
    try:
        from backend.database import service_client
    except ImportError:
        from database import service_client

    db = service_client()
    key_1day = f"reminder_sent:{session_id}:1day"
    key_3hours = f"reminder_sent:{session_id}:3hours"

    settings = (
        db.table("system_settings")
        .select("key, value")
        .in_("key", [key_1day, key_3hours])
        .execute()
        .data or []
    )
    settings_map = {s["key"]: s["value"] for s in settings}

    def parse_info(val):
        if not val:
            return None
        try:
            return json.loads(val)
        except Exception:
            return {"sent_at": val}

    return {
        "session_id": session_id,
        "reminder_1day": {
            "sent": key_1day in settings_map,
            "details": parse_info(settings_map.get(key_1day)),
        },
        "reminder_3hours": {
            "sent": key_3hours in settings_map,
            "details": parse_info(settings_map.get(key_3hours)),
        },
    }


def check_and_send_scheduled_reminders() -> list:
    """
    Evaluates upcoming match sessions against current IST time.
    Automatically triggers 1-day and 3-hour reminders if within window and not yet sent.
    """
    now_ist = datetime.now(IST)
    today_str = now_ist.strftime("%Y-%m-%d")

    try:
        from backend.database import service_client
    except ImportError:
        from database import service_client

    db = service_client()

    upcoming_sessions = (
        db.table("turf_sessions")
        .select("*")
        .gte("session_date", today_str)
        .order("session_date", desc=False)
        .limit(3)
        .execute()
        .data or []
    )

    actions = []
    for s in upcoming_sessions:
        s_id = s["id"]
        s_date = s["session_date"]
        s_start = s.get("start_time") or "20:00"

        kickoff_dt = parse_match_datetime_ist(s_date, s_start)
        hours_until = (kickoff_dt - now_ist).total_seconds() / 3600.0

        # Check 1-day reminder (18 to 30 hours before match)
        if 18.0 <= hours_until <= 30.0:
            key_1day = f"reminder_sent:{s_id}:1day"
            exists = db.table("system_settings").select("key").eq("key", key_1day).execute().data
            if not exists:
                print(f"[REMINDER CRON] Triggering 1-day reminder for session {s_id} ({s_date})")
                res = dispatch_session_reminders(s_id, reminder_type="1day", force=False)
                actions.append(res)

        # Check 3-hour reminder (1.5 to 4.0 hours before match)
        if 1.5 <= hours_until <= 4.0:
            key_3hours = f"reminder_sent:{s_id}:3hours"
            exists = db.table("system_settings").select("key").eq("key", key_3hours).execute().data
            if not exists:
                print(f"[REMINDER CRON] Triggering 3-hour reminder for session {s_id} ({s_date})")
                res = dispatch_session_reminders(s_id, reminder_type="3hours", force=False)
                actions.append(res)

    return actions
