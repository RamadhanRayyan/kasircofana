-- Cofana Shop Supabase schema
-- Run this file in Supabase Dashboard > SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.accounts(id) on delete cascade,
  sku text,
  name text not null,
  category text not null,
  price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  stock integer not null default 0,
  min_stock integer not null default 0,
  variants jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.accounts(id) on delete cascade,
  profile_id uuid references auth.users(id) on delete set null,
  total numeric(12,2) not null default 0,
  payment_method text not null default 'Cash',
  date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity integer not null default 1,
  price_at_sale numeric(12,2) not null default 0,
  cost_at_sale numeric(12,2) not null default 0,
  selected_variants jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_branch_id on public.products(branch_id);
create index if not exists idx_transactions_branch_id on public.transactions(branch_id);
create index if not exists idx_transaction_items_transaction_id on public.transaction_items(transaction_id);
create index if not exists idx_transaction_items_product_id on public.transaction_items(product_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_accounts_updated_at on public.accounts;
create trigger set_accounts_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;

drop policy if exists "authenticated can read accounts" on public.accounts;
create policy "authenticated can read accounts"
on public.accounts for select
to authenticated
using (true);

drop policy if exists "authenticated can insert accounts" on public.accounts;
create policy "authenticated can insert accounts"
on public.accounts for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update accounts" on public.accounts;
create policy "authenticated can update accounts"
on public.accounts for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can delete accounts" on public.accounts;
create policy "authenticated can delete accounts"
on public.accounts for delete
to authenticated
using (true);

drop policy if exists "authenticated can read products" on public.products;
create policy "authenticated can read products"
on public.products for select
to authenticated
using (true);

drop policy if exists "authenticated can insert products" on public.products;
create policy "authenticated can insert products"
on public.products for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update products" on public.products;
create policy "authenticated can update products"
on public.products for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can delete products" on public.products;
create policy "authenticated can delete products"
on public.products for delete
to authenticated
using (true);

drop policy if exists "authenticated can read transactions" on public.transactions;
create policy "authenticated can read transactions"
on public.transactions for select
to authenticated
using (true);

drop policy if exists "authenticated can insert transactions" on public.transactions;
create policy "authenticated can insert transactions"
on public.transactions for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update transactions" on public.transactions;
create policy "authenticated can update transactions"
on public.transactions for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can delete transactions" on public.transactions;
create policy "authenticated can delete transactions"
on public.transactions for delete
to authenticated
using (true);

drop policy if exists "authenticated can read transaction_items" on public.transaction_items;
create policy "authenticated can read transaction_items"
on public.transaction_items for select
to authenticated
using (true);

drop policy if exists "authenticated can insert transaction_items" on public.transaction_items;
create policy "authenticated can insert transaction_items"
on public.transaction_items for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update transaction_items" on public.transaction_items;
create policy "authenticated can update transaction_items"
on public.transaction_items for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can delete transaction_items" on public.transaction_items;
create policy "authenticated can delete transaction_items"
on public.transaction_items for delete
to authenticated
using (true);

insert into public.accounts (name, address, phone)
select 'Cofana Shop', 'Pusat', '-'
where not exists (select 1 from public.accounts);

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime for table public.accounts, public.products, public.transactions, public.transaction_items;
  else
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'accounts') then
      alter publication supabase_realtime add table public.accounts;
    end if;

    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products') then
      alter publication supabase_realtime add table public.products;
    end if;

    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions') then
      alter publication supabase_realtime add table public.transactions;
    end if;

    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transaction_items') then
      alter publication supabase_realtime add table public.transaction_items;
    end if;
  end if;
end $$;
