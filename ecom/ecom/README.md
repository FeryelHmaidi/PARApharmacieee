# E-commerce Store (Next.js + Supabase)

An e-commerce storefront with an admin inventory dashboard, built with Next.js (App Router), Supabase (database, auth, storage), Tailwind CSS and shadcn/ui.

- **Storefront** — product catalog with variants, photos, tags, discounts, cart and cash-on-delivery orders.
- **Admin** — inventory management (products, variants, photo uploads) under `/admin`, protected by auth.
- **Auth** — email + password sign-up with email confirmation (OTP link), password reset flow.

---

## Setup from scratch (fresh Supabase project)

Follow these steps in order — about 10 minutes total.

### 1. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and click **New project**.
2. Pick a name, a strong database password (save it somewhere safe) and a region close to your customers.
3. Wait for the project to finish provisioning (~2 minutes).

### 2. Run the database schema

1. In the Supabase dashboard, open **SQL Editor** (left sidebar) → **New query**.
2. Open [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy the **entire file**, paste it into the editor.
3. Click **Run**. You should see "Success. No rows returned".

This single script creates everything:
- all 12 tables (products, variants, photos, tags, discounts, orders, cart, profiles) with indexes and constraints
- triggers: auto-updated timestamps, automatic stock decrement on order, and auto-creation of a `profiles` row for every new user
- Row Level Security policies
- the **`product-photos` storage bucket** (public) with its access policies — no manual bucket creation needed. You can verify it under **Storage** in the sidebar.

> ⚠️ Run it only on a **fresh** project — it is not idempotent (running it twice will error on already-existing tables, which is harmless but noisy).

### 3. Get your API keys and configure the app

1. In the dashboard go to **Settings → API Keys**.
2. Copy the **Project URL** and the **publishable key** (also called *anon key*).
3. In the project root, create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key
# Used for the redirect links inside auth emails — set to your real domain in production
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

(When deploying to Vercel, add the same three variables in the Vercel project settings.)

### 4. Configure auth emails (OTP / email confirmation)

New users must confirm their email via a link containing a one-time code. For that to work:

1. Go to **Authentication → URL Configuration**:
   - **Site URL**: your production domain (e.g. `https://yourstore.com`), or `http://localhost:3000` while testing.
   - **Redirect URLs** — add:
     - `http://localhost:3000/**`
     - `https://yourstore.com/**` (your production domain)
2. That's it for a basic setup — email confirmation is **on by default** and Supabase sends the emails for you.
   - The confirmation link lands on `/auth/confirm`, which verifies the OTP and signs the user in.
   - Password reset emails land on `/auth/update-password`.
3. *(Recommended for production)* Supabase's built-in email sender is rate-limited (~2 emails/hour) and for testing only. Go to **Authentication → Emails → SMTP Settings** and plug in your own SMTP provider (e.g. Resend, Postmark, Brevo) before launch.
4. *(Optional)* Customize the email texts under **Authentication → Emails → Templates**.

### 5. Create your admin user

1. Run the app (step 6), go to `/sign-up` and register with your email; confirm via the email link.
2. Back in Supabase, open **Table Editor → profiles**, find your user row and change `role` from `client` to `admin`.
3. You can now access the admin dashboard at `/admin`.

### 6. Run the app

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Add products in `/admin/inventory` — photo uploads go straight to the `product-photos` bucket.

---

## Project structure (quick reference)

| Path | Purpose |
|---|---|
| `app/` | Next.js App Router pages (storefront, `(auth)` routes, `admin/`) |
| `lib/supabase/` | Supabase clients (browser, server, middleware) |
| `supabase/schema.sql` | Full database setup script (this is what the client runs) |
| `types/supabase.ts` | Generated TypeScript types for the database |
| `middleware.ts` | Session refresh + route protection |

## Notes for the maintainer

- **RLS**: to mirror the original project, RLS is enabled only on `profiles`. The other tables are open to anyone holding the publishable key. The bottom of `schema.sql` has a commented-out block to enable RLS everywhere — do this before a serious production launch, but you'll need to add policies for the admin write flows first, otherwise the dashboard breaks.
- **Storage**: the `product-photos` bucket is public (product images are served via public URLs). Upload/read policies are created by the schema script.
- **Payments**: orders are cash-on-delivery (`payment_method` defaults to `cash_on_delivery`); no payment provider integration is required.
