# Ship Media Digital Client Management Portal

Secure CRM-style client portal for Ship Media Digital and Livablinds lead management.

## Features

- Protected `/client-portal` route with NextAuth email and password login
- Bcrypt password hash support only, no plaintext production password storage
- Google Sheets API read/write integration
- Livablinds webhook endpoint for new lead row creation
- Two primary dashboard filters: customer search and lead status
- Customer table with protected read-only fields
- Slide-out customer detail panel
- Status updates synced to Google Sheets
- Timestamped internal notes synced to Google Sheets
- KPI cards, conversion analytics, monthly leads chart, and sales funnel
- Dark mode, light mode, desktop/tablet/mobile responsive layout

## Google Sheet Columns

Create a sheet tab named `Leads` with these columns in row 1:

1. Customer ID
2. First Name
3. Last Name
4. Phone Number
5. Email
6. Address
7. Service Requested
8. Lead Source
9. Submission Date
10. Assigned Staff
11. Current Status
12. Internal Notes

The app will create the header row automatically if the tab exists and row 1 is empty.

## Environment Setup

Copy `.env.example` to `.env.local` for local development, then set real values.

Generate a bcrypt password hash:

```bash
npm run hash-password
```

Generate `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

## Google Sheets Setup

1. Create a Google Cloud project.
2. Enable the Google Sheets API.
3. Create a service account.
4. Create a service account JSON key.
5. Share the target Google Sheet with the service account email.
6. Add the service account email and private key to environment variables.

## Livablinds Webhook

New leads can be posted to:

```txt
POST /api/customers
Header: x-livablinds-secret: <LIVABLINDS_WEBHOOK_SECRET>
```

Payload:

```json
{
  "firstName": "Avery",
  "lastName": "Williams",
  "phoneNumber": "(305) 555-0188",
  "email": "avery@example.com",
  "address": "1840 Bay Harbor Dr, Miami, FL",
  "serviceRequested": "Motorized shades",
  "leadSource": "Livablinds.com form",
  "assignedStaff": "Mia Carter"
}
```

## Local Development

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000/client-portal
```

## Vercel Deployment

1. Push this app to a Git repository.
2. Import the repository into Vercel.
3. Add all `.env.example` variables in Vercel Project Settings.
4. Set `NEXTAUTH_URL` to `https://shipmediadigital.com`.
5. Add a rewrite or link from the main site to `/client-portal`.
6. Deploy.

## Cloudflare Workers Deployment

This project is also configured for Cloudflare Workers using the Cloudflare OpenNext adapter.

The Worker routes only the portal paths, so an existing GitHub-hosted marketing website can stay on the main domain while these paths run on Cloudflare Workers:

- `https://shipmediadigital.com/client-portal*`
- `https://shipmediadigital.com/login*`
- `https://shipmediadigital.com/api/auth*`
- `https://shipmediadigital.com/api/customers*`

In Cloudflare, connect the GitHub repository to Workers Builds or deploy with Wrangler.

Build/deploy command:

```bash
npm run deploy
```

Preview command:

```bash
npm run preview
```

Required Cloudflare variables/secrets are the same values from `.env.example`. Set them in Workers & Pages > your Worker > Settings > Variables and Secrets.

For production, set:

```txt
NEXTAUTH_URL=https://shipmediadigital.com
```

## Security Notes

- Keep `PORTAL_PASSWORD_HASH`, `NEXTAUTH_SECRET`, Google credentials, and webhook secret private.
- Rotate the Livablinds webhook secret if it is exposed.
- Only `Current Status` and `Internal Notes` are changed by the portal.
- Customer identity fields are displayed read-only in the interface.
