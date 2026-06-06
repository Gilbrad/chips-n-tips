create extension if not exists pgcrypto;

do $$
begin
  create type public.transaction_type as enum ('income', 'expense');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.recurrence_type as enum ('none', 'weekly', 'monthly', 'yearly');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  type public.transaction_type not null default 'expense',
  color text not null default '#0f766e' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name, type)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null,
  description text not null check (char_length(trim(description)) between 1 and 160),
  amount numeric(12, 2) not null check (amount > 0),
  type public.transaction_type not null,
  occurred_on date not null default current_date,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, user_id)
    references public.categories(id, user_id)
    on update cascade
);

create table if not exists public.payment_dates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  amount numeric(12, 2) check (amount is null or amount > 0),
  category_id uuid,
  due_on date not null,
  due_end_on date
    constraint payment_dates_due_range_check
    check (due_end_on is null or due_end_on >= due_on),
  recurrence public.recurrence_type not null default 'none',
  notes text,
  paid_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, user_id)
    references public.categories(id, user_id)
    on update cascade
);

alter table public.transactions
  add column if not exists deleted_at timestamptz;

alter table public.payment_dates
  add column if not exists deleted_at timestamptz;

alter table public.payment_dates
  add column if not exists due_end_on date;

do $$
begin
  alter table public.payment_dates
    add constraint payment_dates_due_range_check
    check (due_end_on is null or due_end_on >= due_on);
exception
  when duplicate_object then null;
end
$$;

create index if not exists categories_user_id_idx
  on public.categories(user_id)
  where archived_at is null;

create index if not exists transactions_user_occurred_on_idx
  on public.transactions(user_id, occurred_on desc)
  where deleted_at is null;

create index if not exists transactions_user_type_idx
  on public.transactions(user_id, type)
  where deleted_at is null;

create index if not exists payment_dates_user_due_on_idx
  on public.payment_dates(user_id, due_on)
  where deleted_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

drop trigger if exists set_payment_dates_updated_at on public.payment_dates;
create trigger set_payment_dates_updated_at
  before update on public.payment_dates
  for each row execute function public.set_updated_at();

create or replace function public.ensure_transaction_category_matches()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.categories
    where id = new.category_id
      and user_id = new.user_id
      and type = new.type
  ) then
    raise exception 'Transaction category must belong to the user and match the transaction type.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_transaction_category_matches on public.transactions;
create trigger ensure_transaction_category_matches
  before insert or update of category_id, user_id, type on public.transactions
  for each row execute function public.ensure_transaction_category_matches();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        avatar_url = excluded.avatar_url;

  insert into public.user_preferences (user_id, currency)
  values (new.id, 'USD')
  on conflict (user_id) do nothing;

  insert into public.categories (user_id, name, type, color, is_default)
  values
    (new.id, 'Groceries', 'expense', '#0f766e', true),
    (new.id, 'Dining', 'expense', '#dc2626', true),
    (new.id, 'Transportation', 'expense', '#2563eb', true),
    (new.id, 'Housing', 'expense', '#7c3aed', true),
    (new.id, 'Utilities', 'expense', '#ca8a04', true),
    (new.id, 'Healthcare', 'expense', '#db2777', true),
    (new.id, 'Insurance', 'expense', '#4f46e5', true),
    (new.id, 'Debt', 'expense', '#be123c', true),
    (new.id, 'Entertainment', 'expense', '#0891b2', true),
    (new.id, 'Shopping', 'expense', '#9333ea', true),
    (new.id, 'Subscriptions', 'expense', '#ea580c', true),
    (new.id, 'Education', 'expense', '#16a34a', true),
    (new.id, 'Travel', 'expense', '#0284c7', true),
    (new.id, 'Personal Care', 'expense', '#c026d3', true),
    (new.id, 'Gifts', 'expense', '#e11d48', true),
    (new.id, 'Income', 'income', '#059669', true),
    (new.id, 'Savings', 'income', '#0d9488', true),
    (new.id, 'Refunds', 'income', '#65a30d', true),
    (new.id, 'Other', 'expense', '#525252', true)
  on conflict (user_id, name, type) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.payment_dates enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "preferences select own" on public.user_preferences;
create policy "preferences select own"
  on public.user_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "preferences update own" on public.user_preferences;
create policy "preferences update own"
  on public.user_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "preferences insert own" on public.user_preferences;
create policy "preferences insert own"
  on public.user_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "categories select own" on public.categories;
create policy "categories select own"
  on public.categories for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "categories insert own" on public.categories;
create policy "categories insert own"
  on public.categories for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "categories update own" on public.categories;
create policy "categories update own"
  on public.categories for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "transactions select own" on public.transactions;
create policy "transactions select own"
  on public.transactions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "transactions insert own" on public.transactions;
create policy "transactions insert own"
  on public.transactions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "transactions update own" on public.transactions;
create policy "transactions update own"
  on public.transactions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "payment dates select own" on public.payment_dates;
create policy "payment dates select own"
  on public.payment_dates for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "payment dates insert own" on public.payment_dates;
create policy "payment dates insert own"
  on public.payment_dates for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "payment dates update own" on public.payment_dates;
create policy "payment dates update own"
  on public.payment_dates for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
