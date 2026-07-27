-- ============================================================
-- E-commerce store — full database schema
-- Run this ONCE in a fresh Supabase project:
--   Supabase Dashboard → SQL Editor → New query → paste → Run
-- It creates all tables, enums, triggers, RLS policies and the
-- "product-photos" storage bucket. See README.md for the full
-- setup tutorial (env vars, auth email confirmation, admin user).
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------- Enums ----------
create type public.size_unit as enum ('ml', 'g', 'mg', 'unit', 'tablet', 'capsule', 'oz');
create type public.discount_type as enum ('percentage', 'fixed');
create type public.product_status as enum ('active', 'inactive');
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');

-- ---------- Tables ----------

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sku         text not null unique,
  description text,
  best_seller boolean not null default false,
  status      public.product_status not null default 'active',
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  size_value  numeric(12,3),
  size_unit   public.size_unit,
  price       numeric(12,2) not null default 0,
  currency    text not null default 'TND',
  stock       integer not null default 0,
  expiry_date date,
  active      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table public.product_photos (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url        text not null,
  position   integer not null default 0,
  alt_text   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz default now()
);

create table public.product_tags (
  product_id uuid not null references public.products(id) on delete cascade,
  tag_id     uuid not null references public.tags(id) on delete cascade,
  primary key (product_id, tag_id)
);

create table public.discounts (
  id         uuid primary key default gen_random_uuid(),
  code       text,
  type       public.discount_type not null,
  amount     numeric(12,4) not null,
  currency   text default 'TND',
  active     boolean default true,
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_at timestamptz default now()
);

create table public.discount_targets (
  id          uuid primary key default gen_random_uuid(),
  discount_id uuid references public.discounts(id) on delete cascade,
  product_id  uuid references public.products(id) on delete cascade
);

-- Profile row is auto-created for every new auth user (see trigger below).
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  phone       text,
  address     text,
  city        text,
  postal_code text,
  role        text default 'client',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles(id) on delete set null,
  guest_info       jsonb,
  status           public.order_status default 'pending',
  total_amount     numeric(10,2) not null,
  currency         text default 'TND',
  payment_method   text default 'cash_on_delivery',
  payment_status   text default 'unpaid',
  shipping_address text not null,
  shipping_city    text not null,
  shipping_phone   text not null,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid references public.orders(id) on delete cascade,
  product_id        uuid references public.products(id) on delete set null,
  variant_id        uuid references public.product_variants(id) on delete set null,
  quantity          integer not null check (quantity > 0),
  price_at_purchase numeric(10,2) not null,
  created_at        timestamptz default now()
);

create table public.cart_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  status     text not null default 'active',
  subtotal   numeric not null default 0,
  currency   text not null default 'TND',
  updated_at timestamptz not null default now()
);

create table public.cart_session_items (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.cart_sessions(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  quantity   integer not null check (quantity > 0),
  unit_price numeric not null,
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index idx_products_sku_lower on public.products (lower(sku));
create index idx_product_photos_product on public.product_photos (product_id);
create index idx_product_photos_product_position on public.product_photos (product_id, position);
create index idx_variants_product_id on public.product_variants (product_id);

-- ---------- Functions & triggers ----------

-- Keep updated_at fresh on every update
create or replace function public.trigger_set_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_products_set_timestamp
  before update on public.products
  for each row execute function public.trigger_set_timestamp();

create trigger trg_product_photos_set_timestamp
  before update on public.product_photos
  for each row execute function public.trigger_set_timestamp();

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Decrement variant stock when an order item is inserted
create or replace function public.decrease_stock_on_order()
returns trigger language plpgsql as $$
begin
  update public.product_variants
  set stock = stock - new.quantity
  where id = new.variant_id;
  return new;
end;
$$;

create trigger on_order_item_created
  after insert on public.order_items
  for each row execute function public.decrease_stock_on_order();

-- ---------- Row Level Security ----------
-- NOTE: matching the current production setup, RLS is only enabled on
-- "profiles". Policies for the other tables are created below so they
-- take effect immediately if you later enable RLS on those tables.

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on public.profiles for select using (true);

create policy "Users can insert their own profile."
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile."
  on public.profiles for update using (auth.uid() = id);

create policy "Users can create orders"
  on public.orders for insert with check (auth.uid() = user_id);

create policy "Users can view their own orders"
  on public.orders for select using (auth.uid() = user_id);

create policy "Users can create order items"
  on public.order_items for insert with check (
    exists (select 1 from public.orders
            where orders.id = order_items.order_id
              and orders.user_id = auth.uid())
  );

create policy "Users can view their own order items"
  on public.order_items for select using (
    exists (select 1 from public.orders
            where orders.id = order_items.order_id
              and orders.user_id = auth.uid())
  );

create policy "Tags are viewable by everyone"
  on public.tags for select using (true);

create policy "Authenticated users can manage tags"
  on public.tags for all using (auth.role() = 'authenticated');

create policy "Product tags are viewable by everyone"
  on public.product_tags for select using (true);

create policy "Authenticated users can manage product tags"
  on public.product_tags for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- Optional hardening (currently OFF in production — enabling these without
-- adding policies for the admin/storefront flows will break writes made
-- with the publishable key; test before enabling):
-- alter table public.products           enable row level security;
-- alter table public.product_variants   enable row level security;
-- alter table public.product_photos     enable row level security;
-- alter table public.tags               enable row level security;
-- alter table public.product_tags       enable row level security;
-- alter table public.discounts          enable row level security;
-- alter table public.discount_targets   enable row level security;
-- alter table public.orders             enable row level security;
-- alter table public.order_items        enable row level security;
-- alter table public.cart_sessions      enable row level security;
-- alter table public.cart_session_items enable row level security;

-- ---------- Storage: product photos bucket ----------
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

create policy "Allow select product-photos"
  on storage.objects for select to anon
  using (bucket_id = 'product-photos');

create policy "Allow insert product-photos"
  on storage.objects for insert to anon
  with check (bucket_id = 'product-photos');

-- Done. Continue with the README setup steps (env vars, auth URLs, admin user).
