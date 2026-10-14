# Pipeline OS — Simple Guide (Admin & User)

If you are new to this app, start here. Read it top to bottom the first time.

The database starts **empty**. There are no sample companies or fake leads. Only one Super Admin login exists until you add products and people.

---

## 1. Start the app and log in as Admin

1. In a terminal, from the project folder, run:
   ```bash
   npm run dev
   ```
2. Open the browser: **http://localhost:3000**
3. You will see the **Sign in** page.
4. Log in with the Super Admin account:
   - **Email:** `admin@company.com`
   - **Password:** `Admin@12345`

After login you land on **My Work**. The left sidebar is your menu for every page.

---

## 2. First-time Admin setup (do this before sales work)

Do these steps **in order**. Without products and users, sales people cannot create leads properly.

### Step A — Open Settings

1. In the left sidebar, click **Settings** (only Admin / Sales Manager see this).
2. This page has four sections, each with full **Create / Edit / Delete** (and Activate/Deactivate where it applies):
   - **Users**
   - **Products**
   - **SharePoint sales resources**
   - **Teams**
3. Use **Edit** on any row to change it, **Delete** to remove it (with safety checks — e.g. cannot delete a product that still has leads).

### Step B — Add products (required)

Products control Lead IDs like `VF001`, `GM001`.

**Option 1 (fast):** If the list is empty, click **Add default 5 products**.  
That creates: VaptFix (VF), GRCMentor (GM), GRCDepartment (GD), AIDL (AI), TestMyPlan (TMP).

**Option 2 (manual):**
1. Fill **Name** (example: `VaptFix`)
2. Fill **Code** (example: `VF`)
3. Prefix can be left blank (it uses the code)
4. Click **Add product**

You need at least one product before anyone creates outreach.

### Step C — Add a team (optional)

1. In **Teams**, enter a name (example: `Sales North`) and code (example: `NORTH`)
2. Click **Add team**
3. You can assign this team when creating users

### Step D — Add a sales user (exact steps)

1. Stay on **Settings** → **Users**
2. Fill the form:
   - **Name** — example: `Rahul Verma`
   - **Email** — example: `rahul@company.com` (must be unique)
   - **Password** — at least 8 characters (example: `Rahul@12345`)
   - **Role** — choose one:
     - `SalesMember` — normal salesperson (sees only own leads)
     - `SalesManager` — manager (sees all leads + Settings + Dashboard)
     - `SocialMediaManager` — like a salesperson
     - `Viewer` — mostly view
     - `SuperAdmin` — full control (use carefully)
   - **Team** — pick a team or leave “No team”
3. Click **Add user**
4. Share that email + password with the person privately

To stop someone later: click **Deactivate** on their row.  
To remove them: click **Delete** (only if they have no open leads — reassign first).

### Step E — Add SharePoint sales resources (recommended)

When a client asks for a proposal or pricing, the app can show the right SharePoint link.

1. In **SharePoint sales resources**:
   - Select **Product**
   - Select **Type** (Proposal / Pricing / Presentation / Case Study / Other)
   - Enter **Title** (example: `VaptFix Standard Proposal`)
   - Paste **SharePoint URL**
2. Click **Link resource**

Repeat for each product document you use often.

### Step F — Sign out / sign in as the new user (to test)

1. Bottom of sidebar → **Sign out**
2. Log in with the new user’s email and password
3. You should see **My Work** with their own empty queue

---

## 3. What every page does (simple)

### Pages everyone sees

| Sidebar page | What it is | What you do there |
|---|---|---|
| **My Work** | Home desk for today | See today’s follow-ups, meetings, demos, open client requests, overdue items, notifications |
| **New outreach** | Create a new lead | Enter company + contact + product → creates Lead ID (like `VF001`) |
| **Leads** | Full lead list | Open any lead to work on it. Managers see everyone’s leads; members see only their own |
| **Follow-ups** | All follow-ups | List of pending/completed follow-ups across your leads |
| **Meetings** | All meetings | List of scheduled/completed meetings |
| **Demos** | All demos | List of product demos |
| **Requirements** | Client needs | List of captured business/technical requirements |
| **Client requests** | Docs clients asked for | Proposals, pricing, presentations, etc. |
| **Opportunities** | Deals with value | Leads that became opportunities (value, probability) |
| **Calendar** | Month view | Meetings and demos by date |
| **Sales resources** | SharePoint catalog | Open linked proposal/pricing links by product |
| **Documents** | File library | Upload a file or paste a SharePoint URL; optionally attach to a lead |
| **Outreach Import** | Bulk Excel import | Upload tracker Excel → Outreach sheet → map columns → import |
| **Closure** | Won / Lost | Lead ID, contact, final outcome |
| **Notifications** | Alerts | Assignments, follow-ups, meetings, requests. Opening this marks them read |

### Pages only Admin / Sales Manager see

| Sidebar page | What it is | What you do there |
|---|---|---|
| **Dashboard** | Team performance | Pick a person → see open leads, won/lost, requests, upcoming meetings. Also stage totals and team comparison |
| **Revenue targets** | Money targets vs won | See year-to-date won deals/value and any targets configured |
| **Settings** | System setup | Users, products, SharePoint resources, teams |

---

## 4. How to add real sales data (exact flow)

This is the normal day-to-day path after Admin setup is done.

### Step 1 — Create a lead (outreach)

1. Click **New outreach**
2. Fill required fields:
   - Company name
   - Product
   - Contact name
3. Optional but useful: industry, city, email, phone, source, campaign, next follow-up date
4. If you are a manager: you can assign the lead to another user
5. Click **Create outreach / lead**
6. You go to that lead’s page. Lead ID is automatic (example: `VF001`)

Stage starts as **New**.

### Step 2 — Work on the lead (any order)

On the lead page you see tabs. You can use them in **any order** — there is no forced sequence.

| Tab | When to use | What happens |
|---|---|---|
| **Qualify** | Lead looks real | Stage → Qualified. Set Hot / Warm / Cold. Manager can assign owner |
| **Follow-up** | Need to call/email later | Creates Follow-up #1, #2… Shows on My Work when due |
| **Meeting** | Booked a call/meeting | Creates meeting. Often moves stage to Engaged. Shows on Calendar |
| **Demo** | Product demo planned | Creates demo. Shows on Calendar / Demos page |
| **Requirement** | Client shared needs | Saves business/technical/scope/budget notes |
| **Client request** | Client asked for proposal/pricing/etc. | Creates high-priority request. If SharePoint resource exists for that product+type, it links automatically. Can auto-create a follow-up |
| **Opportunity** | Deal has value | Save value, probability, expected close. Stage → Opportunity |
| **Stage / close** | Move or finish the deal | Set Negotiation, Won, Lost, or OnHold. For Won enter value; for Lost enter reason |

**Tip:** After you send a proposal, open that client request and click **Mark sent**. The app logs it and creates a follow-up automatically.

### Step 3 — Check your desk every day

1. Open **My Work**
2. Do overdue follow-ups first
3. Do today’s meetings/demos
4. Clear open client requests (send doc → Mark sent)
5. Open any New/Qualified lead that still needs action

### Step 4 — Close the deal when ready

On the lead → **Stage / close**:

- **Won** → enter won value → Update stage  
- **Lost** → enter reason (and competitor if known)  
- **OnHold** → pause without losing the record  

---

## 5. Example: one full deal (who does what)

**Short answer:** steps **1** are Admin. Steps **2–12** are done by **Rahul** (the sales user), after he logs in with his own email and password. Admin does **not** normally do Qualify / Meeting / Won for Rahul’s leads — Rahul does that on his own login.

| Who | What |
|---|---|
| **Admin** | Settings: create product VaptFix, create user Rahul, optional SharePoint links |
| **Rahul (user)** | Logs in → creates/works the lead → steps 2–12 below |

### Exact story

1. **Admin** adds product **VaptFix** and user **Rahul** (`rahul@company.com` + password) in Settings, then signs out  
2. **Rahul** logs in with his email/password → clicks **New outreach**  
3. Company: `Acme Pvt Ltd`, Product: VaptFix, Contact: `Suresh Patil`  
4. Lead created: `VF001`, stage **New** (owner = Rahul, so only he sees it in My Work / Leads)  
5. **Rahul** opens that lead → **Qualify** → Warm → stage **Qualified**  
6. **Rahul** adds **Follow-up** for tomorrow  
7. **Rahul** schedules **Meeting** → stage becomes **Engaged**  
8. **Rahul** schedules **Demo**  
9. **Rahul** captures **Requirement** notes  
10. **Rahul** adds **Client request** (Proposal) → SharePoint link appears → **Mark sent**  
11. **Rahul** creates **Opportunity** with value `500000` and 60%  
12. Later **Rahul** uses **Stage / close** → Negotiation → then **Won** with value  

If Admin (or a manager) creates outreach and **assigns owner = Rahul**, same rule: Rahul logs in and does steps 5–12 on that lead. Admin can still open all leads from Dashboard / All leads if needed, but day-to-day work is the assigned user.

Order can change. Example: meeting first, qualify later — that is allowed.

---

## 6. Admin daily checks (after team is live)

1. **Dashboard** → click each person → check their open work and wins  
2. **Leads** → see all deals across the team  
3. **Settings** → add new joiners, deactivate leavers, add new product docs  
4. Make sure SharePoint resources stay updated so client requests show the right links  

---

## 7. Roles in one line

- **SuperAdmin / SalesManager** — see everything, manage Settings, use Dashboard  
- **SalesMember / SocialMediaManager** — see and work only their own leads  
- **Viewer** — can browse broadly; use for read-only oversight  

Everyone logs in with **email + password**. There is no “switch user” picker.

---

## 8. Reset everything (careful)

This deletes **all** CRM data (leads, users, products) and recreates only Super Admin:

```bash
npm run db:reset
```

Then log in again as `admin@company.com` / `Admin@12345` and repeat Section 2 (products → users → resources).

---

## 9. Quick checklist for a brand-new company

- [ ] `npm run dev` and open login  
- [ ] Sign in as Admin  
- [ ] Settings → add products (or default 5)  
- [ ] Settings → add teams (optional)  
- [ ] Settings → add sales users with passwords  
- [ ] Settings → link SharePoint resources  
- [ ] Sign out → sign in as a sales user  
- [ ] New outreach → create first real lead  
- [ ] Use lead tabs to log follow-up / meeting / request  
- [ ] Check My Work and Calendar  
- [ ] Admin checks Dashboard  

That is the full exact flow from empty app to real sales data.
