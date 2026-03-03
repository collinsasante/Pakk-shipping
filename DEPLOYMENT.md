# Pakkmaxx — Deployment Guide

## Prerequisites
- Node.js 18+
- Vercel account (recommended) or any Node.js hosting
- Airtable account with base configured (see AIRTABLE_SCHEMA.md)
- Firebase project configured
- WhatsApp Business API access (optional — Airtable automations can handle this)

---

## Step 1: Clone and Install Dependencies

```bash
cd /Users/breezyyy/Desktop/pakk
npm install
```

---

## Step 2: Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → Email/Password
4. Go to **Project Settings** → Copy Web App config to `.env.local`
5. Generate **Service Account** key:
   - Project Settings → Service Accounts → Generate new private key
   - Copy `project_id`, `client_email`, `private_key` to `.env.local`

---

## Step 3: Set Up Airtable

1. Create a new Airtable base called **"Pakkmaxx"**
2. Create all 7 tables as documented in `AIRTABLE_SCHEMA.md`
3. Get your API key: [Airtable Account](https://airtable.com/account) → API section
4. Copy your Base ID from the URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`
5. Add both to `.env.local`

---

## Step 4: Create Admin User

Run this one-time setup to create the first super admin:

```bash
# After setting up .env.local
npm run setup-admin
```

Or manually:
1. Create user in Firebase Console → Authentication → Add user
2. Add record to Airtable Users table with:
   - FirebaseUID: (from Firebase)
   - Email: admin@yourdomain.com
   - Role: super_admin

---

## Step 5: Configure Environment Variables

```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

Required variables:
- `AIRTABLE_API_KEY` - Your Airtable personal access token
- `AIRTABLE_BASE_ID` - Your Airtable base ID (appXXXXX...)
- `NEXT_PUBLIC_FIREBASE_*` - Firebase client config (7 variables)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` - Firebase Admin SDK

---

## Step 6: Run Locally

```bash
npm run dev
```

Open http://localhost:3000

---

## Step 7: Deploy to Vercel (Production)

### Option A: CLI
```bash
npm install -g vercel
vercel
# Follow prompts, add all env variables when asked
```

### Option B: GitHub Integration
1. Push code to GitHub
2. Connect repo in Vercel dashboard
3. Add all environment variables in Vercel → Settings → Environment Variables
4. Deploy!

### Environment Variables in Vercel:
Add all variables from `.env.example` as **Production** environment variables.

For `FIREBASE_PRIVATE_KEY`, use the exact format with `\n` for newlines:
```
"-----BEGIN PRIVATE KEY-----\nXXXXX\n-----END PRIVATE KEY-----\n"
```

---

## Step 8: Set Up WhatsApp Notifications

### Via Airtable Automations (Recommended):
1. Follow the script in `AIRTABLE_SCHEMA.md`
2. Set up automation to trigger on Items.Status field change
3. Use the provided JavaScript to send WhatsApp messages

### Via WhatsApp Business API (Direct):
1. Create a Meta Business account
2. Apply for WhatsApp Business API access
3. Get your Phone Number ID and Access Token
4. Add to environment: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`
5. The app will automatically use this for notifications

---

## Post-Deployment Checklist

- [ ] Login to admin dashboard works
- [ ] Create a test customer
- [ ] Receive a test item
- [ ] Status update triggers (check WhatsApp)
- [ ] Create a container and add items
- [ ] Update container status to "Arrived in Ghana" — verify all items update
- [ ] Customer login works
- [ ] Customer can see their items

---

## System Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                     PAKKMAXX SYSTEM                     │
├──────────────┬──────────────────┬───────────────────────┤
│   Frontend   │     Backend      │      Database         │
│  Next.js 14  │  Next.js API     │      Airtable         │
│  TypeScript  │  Routes          │   7 tables            │
│  Tailwind    │  Firebase Admin  │   Linked records      │
│  App Router  │  Airtable SDK    │   Automations         │
└──────┬───────┴────────┬─────────┴───────────────────────┘
       │                │
       ▼                ▼
  Firebase Auth    WhatsApp API
  (Client auth)    (Notifications)
```

## Role Hierarchy

```
super_admin
    ├── Full access to everything
    ├── Create/manage customers
    ├── Create orders and invoices
    └── Manage containers and status

warehouse_staff
    ├── Receive items (create items)
    ├── Update item status
    ├── Manage sorting
    └── Add/remove items from containers

customer
    ├── View own items only
    ├── View own orders only
    └── Track shipment status
```

## API Routes Reference

| Method | Route                           | Role             | Description                          |
|--------|---------------------------------|------------------|--------------------------------------|
| POST   | /api/auth/verify                | Public           | Verify Firebase token                |
| GET    | /api/customers                  | Admin/Staff      | List customers                       |
| POST   | /api/customers                  | Admin            | Create customer + Firebase user      |
| GET    | /api/customers/[id]             | Admin/Staff/Own  | Get customer with items+orders       |
| PATCH  | /api/customers/[id]             | Admin            | Update customer                      |
| GET    | /api/items                      | All              | List items (filtered by role)        |
| POST   | /api/items                      | Admin/Staff      | Receive new item                     |
| GET    | /api/items/[id]                 | All              | Get item with history                |
| PATCH  | /api/items/[id]                 | Admin/Staff      | Update item fields                   |
| PATCH  | /api/items/[id]/status          | Admin/Staff      | Update status + WhatsApp notification|
| GET    | /api/orders                     | All              | List orders (filtered by role)       |
| POST   | /api/orders                     | Admin            | Create order                         |
| GET    | /api/orders/[id]                | All              | Get order with items                 |
| PATCH  | /api/orders/[id]                | Admin            | Update order (mark paid, etc.)       |
| GET    | /api/containers                 | Admin/Staff      | List containers                      |
| POST   | /api/containers                 | Admin            | Create container                     |
| GET    | /api/containers/[id]            | Admin/Staff      | Get container with items             |
| PATCH  | /api/containers/[id]/status     | Admin            | Update status (cascades to items)    |
| POST   | /api/containers/[id]/items      | Admin/Staff      | Add item to container                |
| DELETE | /api/containers/[id]/items      | Admin/Staff      | Remove item from container           |
| GET    | /api/sorting                    | Admin/Staff      | Get items in sorting                 |
| POST   | /api/sorting                    | Admin/Staff      | Mark found/missing                   |
| GET    | /api/dashboard/admin            | Admin/Staff      | Admin dashboard stats                |
| GET    | /api/dashboard/customer         | Customer/Admin   | Customer dashboard stats             |
| GET    | /api/activity-logs              | Admin            | Activity + status history logs       |
