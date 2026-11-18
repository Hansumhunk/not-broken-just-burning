-- Disposable postgres only: minimal stand-in schemas; never run on hosted project.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema storage;
create table auth.users(id uuid primary key);
create table storage.buckets(id text primary key,name text not null, public boolean not null);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text);
alter table storage.objects enable row level security;
grant usage on schema storage to anon,authenticated,service_role; grant select,insert,update,delete on storage.objects to anon,authenticated,service_role;
-- Deliberately permissive legacy policy must not expose the commerce bucket.
create policy fixture_broad on storage.objects for all to authenticated using(true) with check(true);
create table public.product_entitlements(user_id uuid not null references auth.users(id),product_slug text not null,status text not null,source text not null,provider text,provider_entitlement_ref text,valid_until timestamptz,granted_at timestamptz default now(),created_at timestamptz default now(),updated_at timestamptz default now(),primary key(user_id,product_slug));
grant select,insert,update,delete on public.product_entitlements to service_role;
insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
