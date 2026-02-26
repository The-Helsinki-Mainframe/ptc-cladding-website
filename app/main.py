"""
PTC Cladding Website — Backend
FastAPI: API endpoints + static file serving.
API routes MUST be defined before the static mount.
"""

import os
import sqlite3
import smtplib
import logging
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, field_validator
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent
STATIC   = BASE_DIR / "static"
DB_PATH  = BASE_DIR / "data" / "ptc.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# ── Config ────────────────────────────────────────────────────────────────────
SMTP_HOST    = os.getenv("SMTP_HOST", "")
SMTP_PORT    = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER    = os.getenv("SMTP_USER", "")
SMTP_PASS    = os.getenv("SMTP_PASS", "")
FROM_EMAIL   = os.getenv("FROM_EMAIL", "noreply@ptcgr.com")
NOTIFY_EMAIL = os.getenv("NOTIFY_EMAIL", "info@ptcgr.com")

# ── Database ──────────────────────────────────────────────────────────────────
def get_db():
    return sqlite3.connect(str(DB_PATH))

def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS bookings (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT NOT NULL,
                email      TEXT NOT NULL,
                company    TEXT,
                phone      TEXT,
                message    TEXT,
                date       TEXT NOT NULL,
                time       TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS brochure_leads (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT NOT NULL,
                email      TEXT NOT NULL,
                company    TEXT,
                phone      TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS contact_messages (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT NOT NULL,
                email      TEXT NOT NULL,
                company    TEXT,
                phone      TEXT,
                message    TEXT,
                created_at TEXT NOT NULL
            );
        """)
        conn.commit()

init_db()
log.info("DB ready at %s", DB_PATH)

# ── Email ─────────────────────────────────────────────────────────────────────
def send_email(subject: str, body: str):
    if not SMTP_HOST or not SMTP_USER:
        log.warning("SMTP not configured — email skipped: %s", subject)
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = FROM_EMAIL
        msg["To"]      = NOTIFY_EMAIL
        msg.attach(MIMEText(body, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(FROM_EMAIL, NOTIFY_EMAIL, msg.as_string())
        log.info("Email sent: %s", subject)
    except Exception as exc:
        log.error("Email failed: %s", exc)

# ── Pydantic models ───────────────────────────────────────────────────────────
class BookingRequest(BaseModel):
    name: str; email: str; company: str = ""; phone: str = ""
    message: str = ""; date: str; time: str

    @field_validator("name", "email")
    @classmethod
    def not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("required")
        return v

class BrochureRequest(BaseModel):
    name: str; email: str; company: str = ""; phone: str = ""

    @field_validator("name", "email")
    @classmethod
    def not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("required")
        return v

class ContactRequest(BaseModel):
    name: str; email: str; company: str = ""; phone: str = ""; message: str = ""

    @field_validator("name", "email")
    @classmethod
    def not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("required")
        return v

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="PTC Cladding", docs_url=None, redoc_url=None)

# API routes — registered BEFORE static mount so they take precedence
@app.get("/api/health")
def health():
    return {"status": "ok", "ts": datetime.utcnow().isoformat()}

@app.post("/api/book")
def api_book(req: BookingRequest):
    now = datetime.utcnow().isoformat()
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO bookings (name,email,company,phone,message,date,time,created_at) VALUES(?,?,?,?,?,?,?,?)",
                (req.name,req.email,req.company,req.phone,req.message,req.date,req.time,now)
            )
            conn.commit()
    except Exception as e:
        log.error("DB booking error: %s", e)
        raise HTTPException(500, "Database error")

    send_email(
        f"Meeting Request: {req.name} — {req.date} {req.time}",
        f"""<h2 style="font-family:sans-serif">New Meeting Request — PTC Cladding</h2>
<table style="font-family:sans-serif;border-collapse:collapse">
  <tr><td style="padding:6px 12px;color:#666">Name</td><td style="padding:6px 12px;font-weight:bold">{req.name}</td></tr>
  <tr><td style="padding:6px 12px;color:#666">Email</td><td style="padding:6px 12px"><a href="mailto:{req.email}">{req.email}</a></td></tr>
  <tr><td style="padding:6px 12px;color:#666">Company</td><td style="padding:6px 12px">{req.company or '—'}</td></tr>
  <tr><td style="padding:6px 12px;color:#666">Phone</td><td style="padding:6px 12px">{req.phone or '—'}</td></tr>
  <tr><td style="padding:6px 12px;color:#666">Date</td><td style="padding:6px 12px;font-weight:bold;color:#FF6200">{req.date}</td></tr>
  <tr><td style="padding:6px 12px;color:#666">Time</td><td style="padding:6px 12px;font-weight:bold;color:#FF6200">{req.time}</td></tr>
  <tr><td style="padding:6px 12px;color:#666">Notes</td><td style="padding:6px 12px">{req.message or '—'}</td></tr>
</table>
<p style="font-family:sans-serif;color:#aaa;font-size:11px;margin-top:16px">Submitted {now} UTC · ptc.moosehq.lv</p>"""
    )
    log.info("Booking: %s <%s> %s %s", req.name, req.email, req.date, req.time)
    return {"status": "ok"}

@app.post("/api/download-brochure")
def api_brochure(req: BrochureRequest):
    now = datetime.utcnow().isoformat()
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO brochure_leads (name,email,company,phone,created_at) VALUES(?,?,?,?,?)",
                (req.name,req.email,req.company,req.phone,now)
            )
            conn.commit()
    except Exception as e:
        log.error("DB brochure error: %s", e)
        raise HTTPException(500, "Database error")

    send_email(
        f"Brochure Download: {req.name}",
        f"""<h2 style="font-family:sans-serif">Brochure Download — PTC Cladding</h2>
<table style="font-family:sans-serif;border-collapse:collapse">
  <tr><td style="padding:6px 12px;color:#666">Name</td><td style="padding:6px 12px;font-weight:bold">{req.name}</td></tr>
  <tr><td style="padding:6px 12px;color:#666">Email</td><td style="padding:6px 12px"><a href="mailto:{req.email}">{req.email}</a></td></tr>
  <tr><td style="padding:6px 12px;color:#666">Company</td><td style="padding:6px 12px">{req.company or '—'}</td></tr>
  <tr><td style="padding:6px 12px;color:#666">Phone</td><td style="padding:6px 12px">{req.phone or '—'}</td></tr>
</table>
<p style="font-family:sans-serif;color:#aaa;font-size:11px;margin-top:16px">Submitted {now} UTC · ptc.moosehq.lv</p>"""
    )
    log.info("Brochure: %s <%s>", req.name, req.email)
    return {"status": "ok"}

@app.post("/api/contact")
def api_contact(req: ContactRequest):
    now = datetime.utcnow().isoformat()
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO contact_messages (name,email,company,phone,message,created_at) VALUES(?,?,?,?,?,?)",
                (req.name,req.email,req.company,req.phone,req.message,now)
            )
            conn.commit()
    except Exception as e:
        log.error("DB contact error: %s", e)
        raise HTTPException(500, "Database error")

    send_email(
        f"Website Enquiry: {req.name}",
        f"""<h2 style="font-family:sans-serif">New Enquiry — PTC Cladding Website</h2>
<table style="font-family:sans-serif;border-collapse:collapse">
  <tr><td style="padding:6px 12px;color:#666">Name</td><td style="padding:6px 12px;font-weight:bold">{req.name}</td></tr>
  <tr><td style="padding:6px 12px;color:#666">Email</td><td style="padding:6px 12px"><a href="mailto:{req.email}">{req.email}</a></td></tr>
  <tr><td style="padding:6px 12px;color:#666">Company</td><td style="padding:6px 12px">{req.company or '—'}</td></tr>
  <tr><td style="padding:6px 12px;color:#666">Phone</td><td style="padding:6px 12px">{req.phone or '—'}</td></tr>
  <tr><td style="padding:6px 12px;color:#666;vertical-align:top">Message</td><td style="padding:6px 12px">{req.message or '—'}</td></tr>
</table>
<p style="font-family:sans-serif;color:#aaa;font-size:11px;margin-top:16px">Submitted {now} UTC · ptc.moosehq.lv</p>"""
    )
    log.info("Contact message: %s <%s>", req.name, req.email)
    return {"status": "ok"}

# Static files — mounted LAST (catches everything not matched above)
# html=True → serves index.html for / and unknown paths (SPA behaviour)
app.mount("/", StaticFiles(directory=str(STATIC), html=True), name="static")
