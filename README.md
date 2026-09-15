# Pipeline OS — Sales & Growth Tracking

Secure multi-user sales platform: each employee signs in with **email + password**, works only on **their own leads**, and managers track performance on a dashboard.

**Database:** MongoDB (via Prisma) — local replica set `rs0` required by Prisma  
**App:** Next.js (App Router) + TypeScript + Tailwind


---

## Database

| Item | Value |
|------|--------|
| Engine | **MongoDB** |
| Default DB name | `pipeline_os` |
| Connection | Atlas MongoDB (`DATABASE_URL` in `.env`) |

In Atlas, allow your IP under **Network Access**. Restart `npm run dev` after changing `.env`.

| ORM | Prisma |
| Schema | `prisma/schema.prisma` |

Make sure the MongoDB Windows service is running, then:

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Seed **wipes all leads/docs** and creates only:

- Teams, products, masters (dropdowns)
- One **Admin** account (no sample companies)

Default admin (change after first login):

- Email: `admin@company.com`
- Password: `Admin@12345`

(Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` in `.env` before seeding.)

---

## Security model

1. Every user has a **hashed password** (`bcrypt`).
2. Sign-in is **email + password only** — no “pick a person” switch.
3. Session cookie is httpOnly; employees cannot open another user’s desk.
4. API routes check the logged-in user; lead updates require ownership (or Admin/Head).
5. Admin/Head create employee accounts and give each person their own password.

---

## Manager / Admin flow (example)

### Step 1 — Admin signs in

1. Open http://localhost:3000/login  
2. Email: `admin@company.com`  
3. Password: `Admin@12345`  
4. You land on **My Day** (empty until people create leads).

### Step 2 — Create 5 sales employees

Go to **Admin** → **Create employee**.

Example team:

| Name | Email | Role | Temp password |
|------|-------|------|----------------|
| Rahul Verma | rahul@company.com | Research | `Rahul@12345` |
| Priya Sharma | priya@company.com | Outreach | `Priya@12345` |
| Arjun Mehta | arjun@company.com | BDM | `Arjun@12345` |
| Neha Kapoor | neha@company.com | Presales | `Neha@12345` |
| Ananya Iyer | ananya@company.com | Head | `Ananya@12345` |

Share each password privately. **Sign out.**

### Step 3 — Manager uses the dashboard

1. Sign in as Head (`ananya@company.com` / her password).  
2. Open **Dashboard**.  
3. Use **Team member** dropdown → select Priya / Arjun / …  
4. See charts: active leads by phase, meetings, demos, win rate, team comparison.  
5. Use **Pipeline** / **Leads** to see the whole team.  
6. Assign owners when creating leads if needed.

---

## Employee flow (example: Outreach executive)

### Step 1 — Sign in

1. http://localhost:3000/login  
2. Email: `priya@company.com`  
3. Password: (the one Admin set)  
4. She only sees **her** My Day, leads, calendar, documents.

She **cannot** sign in as Arjun without Arjun’s password.

### Step 2 — Insert a new lead

1. Sidebar → **New lead**  
2. Fill company, product, contact (example):

   - Company: `Acme Manufacturing`  
   - Product: `VAPTFIX`  
   - Contact: `Suresh Patil`, CISO, email  
   - ICP: High · Source: LinkedIn  

3. Click **Create lead** → opens Lead 360 (Phase 1 Research).  
4. Lead is owned by Priya (or whoever created it).

### Step 3 — Work the lead through phases

On the lead page, use the action panels for the current phase:

| Phase | What the employee does |
|------:|-------------------------|
| 1 Research | **Qualify → Phase 2** and pick outreach owner |
| 2–3 Outreach | **Log outreach attempt** (Call/Email + response). When client agrees → **Meeting agreed** + assign BDM |
| 4 Meeting | **Schedule meeting** (date/time/link) → appears on **Calendar** |
| 5–7 | **Schedule / assign demo** → Presales sees it; shows on Calendar |
| Any | **Upload documents** on Documents page (preview in-app) |
| Any | **Drop** with a reason if the deal dies |

### Step 4 — Daily work

- **My Day** — only their due actions, meetings, demos, notifications  
- **Pipeline** — only their active leads by phase  
- **Calendar** — only their meetings/demos  
- **Documents** — upload/preview without Drive  
- **Sign out** when done

---

## End-to-end example (one deal)

1. **Admin** creates Rahul, Priya, Arjun, Neha (passwords).  
2. **Rahul** signs in → New lead “Nimbus Fintech” × GRC → Qualify → assigns **Priya**.  
3. **Priya** signs in → sees lead on My Day → logs 2 calls → Meeting agreed → assigns **Arjun**.  
4. **Arjun** schedules meeting Tue 11:00 → shows on Calendar → completes → moves toward requirement/demo.  
5. **Arjun/Neha** books demo → Neha prepares → document “Proposal” uploaded under Documents.  
6. **Ananya (Head)** opens Dashboard → selects Priya → sees her outreach activity; selects Arjun → meetings/demos charts.

---

## Admin CRUD

On **Admin** (Head / Admin roles):

| Entity | Create | Edit | Deactivate | Delete |
|--------|--------|------|------------|--------|
| Users | Yes | Yes (incl. password reset) | Yes | Yes (blocked if active leads / last Admin / yourself) |
| Teams | Yes | — | — | Yes (if no members) |
| Products | Yes | Toggle active | Yes | Yes (if no leads) |
| Masters | Yes | — | — | Yes |

On a **Lead 360** page: edit company/details, reassign owner (managers), soft-delete lead, phase actions, document delete.

| Route | Who | Purpose |
|-------|-----|---------|
| `/login` | All | Email + password sign-in |
| `/` | All | My Day (scoped) |
| `/leads/new` | All | Create company + lead |
| `/leads` | All | Lead list (scoped) |
| `/leads/[id]` | Owner / involved / manager | Lead 360 + actions |
| `/pipeline` | All | 8-phase board (scoped) |
| `/calendar` | All | Meetings + demos |
| `/documents` | All | In-app document library |
| `/dashboard` | Head / Admin | Member selector + charts |
| `/admin` | Head / Admin | Create users, masters, products |
| `/workspace/*` | Role queues | Research / Outreach / Meetings / Demos |

---

## Useful commands

```bash
npx prisma db push     # sync MongoDB collections to schema
npm run db:seed        # wipe business data + recreate admin/masters
npm run dev            # http://localhost:3000
```

---

## Production checklist

- Change `ADMIN_PASSWORD` before seed / first deploy  
- Use a MongoDB URI with auth (`mongodb://user:pass@host:27017/pipeline_os`)  
- Set `NODE_ENV=production` (secure cookies)  
- Put `/uploads` on durable storage (or S3) behind backups  
- Force password reset on first employee login (recommended next hardening step)
