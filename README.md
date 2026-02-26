# PTC Cladding — Company Website

Single-page website for PTC Cladding. Bento-box layout, animated counters, meeting booking and brochure download with lead capture.

**Live:** https://ptc.moosehq.lv

## Stack
- **Frontend:** Pure HTML/CSS/JS — no framework, no bundler
- **Backend:** FastAPI (Python 3.11) + SQLite
- **Hosting:** Helsinki VPS, nginx reverse proxy, Let's Encrypt SSL
- **Service:** `ptc-website.service` (systemd)

## Local Development

```bash
cd ptc-cladding-website
python3 -m venv .venv
source .venv/bin/activate
pip install -r app/requirements.txt
cp .env.example .env  # edit SMTP settings
uvicorn app.main:app --reload --port 8082
```

Open: http://localhost:8082

## Deployment (VPS)

```bash
# Pull latest
cd /root/ptc-cladding-website && git pull

# Restart service
systemctl restart ptc-website
```

## Lead Storage

SQLite at `data/ptc.db`:
- `bookings` — meeting requests (name, email, company, phone, date, time, message)
- `brochure_leads` — brochure downloads (name, email, company, phone)

Query leads:
```bash
sqlite3 data/ptc.db "SELECT * FROM bookings ORDER BY created_at DESC;"
sqlite3 data/ptc.db "SELECT * FROM brochure_leads ORDER BY created_at DESC;"
```

## Environment Variables

See `.env.example`. Copy to `.env` and configure SMTP for email notifications.

## Future: Calendly Integration
Replace the static slot picker in `static/js/app.js → buildSlotPicker()` with Calendly embed widget.
Replace `POST /api/book` with Calendly webhook.
