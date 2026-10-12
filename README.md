# Pipeline OS — Activity-based Sales Pipeline

Next.js + Prisma + MongoDB Atlas CRM for flexible (non-gated) sales activities.

**Exact admin vs user flows:** see [`FLOW_README.md`](./FLOW_README.md).

## Quick start

```bash
npm install
npm run db:push
npm run db:wipe          # clears ALL data — no sample leads
npm run setup:admin      # Super Admin only (if no users)
npm run dev
```

Or one shot: `npm run db:reset` (push + wipe + setup:admin).

Configure `.env`:

- `DATABASE_URL` — MongoDB Atlas URI  
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` — first Super Admin (optional defaults)

Default Super Admin if env unset: `admin@company.com` / `Admin@12345`

## What this app does

- Product-specific Lead IDs (`VF001`, `GM001`, …)
- Activities in any order: follow-up, meeting, demo, requirement, client request, opportunity
- Stages: New → Qualified → Engaged → Opportunity → Negotiation → Won | Lost | OnHold
- SharePoint sales resources mapped to client requests
- My Work desk + Master Dashboard for managers
- Password auth per user; members only see own leads

**No seed/sample CRM data** is shipped. Add products and users from Settings after login.
