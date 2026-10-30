# Email delivery fix (contact form, registration, password reset)

## What was broken

### 1. Contact form: "logged in Brevo but never delivered"

`backend/routes/contact.py` sent every message to a literal placeholder:

```python
"to": [{"email": "your_admin_email@domain.com", "name": "System Admin"}]
```

Brevo accepted the request (hence the log entry) but the recipient domain does
not exist, so the message was bounced/undelivered. The sender was also hardcoded
to `calebbenyofoni2@gmail.com`, which is not the verified Brevo sender, and the
endpoint always returned `success` because sending happened in a background
task after the response.

### 2. Registration / password reset: nothing at all in Brevo

`backend/services/email_service.py` used raw SMTP on `smtp-relay.brevo.com:587`.
The backend is hosted on **Render**, and Render blocks outbound SMTP ports
`25`, `465` and `587` on free web services. The TCP connection fails before any
mail reaches Brevo, so no log entry is created. The exception was swallowed and
printed to stdout, while the API still returned "check your email".

Bonus bug: `FRONTEND_URL=http://localhost:5173`, so even delivered verification
and reset links pointed at localhost. The hardcoded fallback in the email service
also used the now-unreachable `https://menen-oshs-app.pxxl.click`; the real
frontend is `https://menenoshs.onrender.com`.

### 3. The link targets returned 404 on the live site

The frontend is hosted without an SPA fallback rule, and its prerender script
only emitted HTML shells for `/about` and `/downloads`. Requests to
`/verify-email` and `/reset-password` returned **404 Not Found** on
`https://menenoshs.onrender.com`, so a delivered email would still dead-end.
The same applied to `/login` and `/register`.

## What changed

- `backend/services/email_service.py`
  - Sends through the **Brevo HTTP API v3 over HTTPS** (port 443), which is not
    blocked by Render/Railway/Heroku/DigitalOcean.
  - Keeps SMTP as a fallback (adds port `2525` automatically when 587 is blocked).
  - Trims whitespace from env values (`FROM_EMAIL` had a trailing space, which
    makes the sender invalid).
  - Logs the real provider response (`messageId`) or the exact rejection reason.
  - Resolves a public `FRONTEND_URL` for links and never emits localhost links
    outside development.
  - Adds plain-text alternatives (better deliverability), `Reply-To`, `Date` and
    `Message-ID` headers.
  - New `send_contact_message()` template.

- `backend/routes/contact.py`
  - Delivers to a real mailbox: `CONTACT_RECIPIENT_EMAIL` → `ADMIN_EMAIL` →
    fallback, `Reply-To` = the visitor's address, sender = verified `FROM_EMAIL`.
  - Sends synchronously and returns `502` when delivery fails, instead of always
    claiming success.

- `backend/routes/auth.py`
  - Sends verification / reset emails synchronously (off the event loop) and
    logs the result. Registration now returns `emailSent: true|false` and an
    honest message when the email could not be sent.

- `frontend/src/components/About.tsx`
  - Shows the backend error message instead of a generic failure.

- `frontend/scripts/prerender.mjs`
  - Emits HTML shells for `/login`, `/register`, `/verify-email` and
    `/reset-password` so those URLs resolve on the static host (verified by a
    production build). Uses `https://menenoshs.onrender.com` as the app base.

- Canonical/SEO URLs updated from the dead `menen-oshs-app.pxxl.click` domain to
  `https://menenoshs.onrender.com` in `frontend/index.html`,
  `frontend/public/robots.txt`, `frontend/public/sitemap.xml`,
  `frontend/public/llms.txt` and `frontend/src/components/Seo.tsx`.

## Required environment variables

Set these on the Render service (Environment → Environment Variables), then
redeploy. `.env` is git-ignored, so editing it locally does not change Render.

| Variable | Value |
| --- | --- |
| `BREVO_API_KEY` | Brevo API key (`xkeysib-...`) of the account owning the sender |
| `FROM_EMAIL` | Verified Brevo sender, e.g. `calebbenyofoni2@mail.brevosend.com` |
| `FROM_NAME` | `MERP Student Assistant` |
| `CONTACT_RECIPIENT_EMAIL` | Real inbox that should receive contact messages |
| `FRONTEND_URL` | `https://menenoshs.onrender.com` |
| `ENVIRONMENT` | `production` |

### Brevo authorised IPs

The Brevo account currently has **authorised IPs** enabled. That is why API
calls fail from other machines with:

```
401 {"message": "We have detected you are using an unrecognised IP address ..."}
```

Contact-form emails work from Render because Render's egress IP is allow-listed.
If Render's outbound IP changes (or you move hosts), sending breaks again:

- add the new outbound IPs in Brevo → Security → Authorised IPs, or
- disable IP restriction for API keys, or
- use a paid Render instance with a static outbound IP.

## Verification

Locally (SMTP fallback, since the local IP is not allow-listed):

```
cd backend
python -c "from services.email_service import EmailService; print(EmailService().send_verification_email('you@example.com','TEST'))"
```

On Render, check the logs for:

```
Email accepted by Brevo API: to=... messageId=<...>
```

and confirm the message appears in Brevo → Transactional → Logs with status
*delivered*.
