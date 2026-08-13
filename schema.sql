create extension if not exists pgcrypto;
create type public.app_role as enum ('owner','manager','staff');
create type public.order_status as enum ('pending','confirmed','preparing','ready','served','cancelled');
create type public.payment_method as enum ('cash','bank_transfer');
create type public.payment_status as enum ('unpaid','pending','paid','failed');
create type public.table_status as enum ('available','occupied','reserved','needs_staff');
create type public.staff_call_status as enum ('open','acknowledged','resolved');
create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade,full_name text,role public.app_role not null default 'staff',active boolean not null default true,created_at timestamptz not null default now());
create table if not exists public.tables(id uuid primary key default gen_random_uuid(),table_number int unique not null check(table_number between 1 and 20),name text generated always as ('Bàn '||lpad(table_number::text,2,'0')) stored,qr_token uuid unique not null default gen_random_uuid(),status public.table_status not null default 'available',created_at timestamptz not null default now());
create table if not exists public.categories(id uuid primary key default gen_random_uuid(),name text not null,slug text unique not null,sort_order int not null default 0,active boolean not null default true);
create table if not exists public.menu_items(id uuid primary key default gen_random_uuid(),category_id uuid references public.categories(id) on delete set null,name text not null,description text,base_price bigint not null check(base_price>=0),image_path text,active boolean not null default true,created_at timestamptz not null default now());
create table if not exists public.menu_options(id uuid primary key default gen_random_uuid(),name text not null,option_group text not null,price_delta bigint not null default 0,active boolean not null default true);
create table if not exists public.orders(id uuid primary key default gen_random_uuid(),order_code text unique not null,table_id uuid not null references public.tables(id),status public.order_status not null default 'pending',payment_method public.payment_method not null,payment_status public.payment_status not null default 'unpaid',subtotal bigint not null default 0,total bigint not null default 0,customer_note text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,menu_item_id uuid references public.menu_items(id) on delete set null,item_name text not null,quantity int not null check(quantity>0),unit_price bigint not null check(unit_price>=0),size text,sugar text,ice text,toppings jsonb not null default '[]',note text,line_total bigint not null check(line_total>=0));
create table if not exists public.staff_calls(id uuid primary key default gen_random_uuid(),table_id uuid not null references public.tables(id),status public.staff_call_status not null default 'open',message text,created_at timestamptz not null default now(),acknowledged_at timestamptz,resolved_at timestamptz);
create table if not exists public.audit_logs(id bigint generated always as identity primary key,actor_id uuid references auth.users(id) on delete set null,action text not null,entity_type text,entity_id uuid,metadata jsonb not null default '{}',created_at timestamptz not null default now());
insert into public.tables(table_number) select generate_series(1,20) on conflict(table_number) do nothing;
insert into public.categories(name,slug,sort_order) values('Cà phê','coffee',1),('Trà sữa','milk-tea',2),('Trà','tea',3),('Bánh & Đồ ăn','food',4) on conflict(slug) do nothing;
alter table public.profiles enable row level security;alter table public.tables enable row level security;alter table public.categories enable row level security;alter table public.menu_items enable row level security;alter table public.menu_options enable row level security;alter table public.orders enable row level security;alter table public.order_items enable row level security;alter table public.staff_calls enable row level security;alter table public.audit_logs enable row level security;
create policy "public read tables" on public.tables for select using(true);
create policy "public read categories" on public.categories for select using(active=true);
create policy "public read menu" on public.menu_items for select using(active=true);
create policy "public read options" on public.menu_options for select using(active=true);
-- Orders/staff calls are intentionally written through server-only API routes.
-- Add role-based policies for authenticated admin/staff access before exposing direct table mutations.
