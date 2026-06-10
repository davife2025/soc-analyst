-- User profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'viewer' check (role in ('admin','analyst','viewer')),
  created_at timestamptz default now(),
  last_seen_at timestamptz
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    coalesce(new.raw_user_meta_data->>'role', 'viewer')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS on profiles
alter table profiles enable row level security;
create policy "users_own_profile" on profiles for select using (auth.uid() = id);
create policy "service_role_all_profiles" on profiles for all using (auth.role() = 'service_role');

-- Update alert/investigation RLS to allow analyst+ to read
create policy "analyst_read_alerts" on alerts for select
  using (
    auth.role() = 'service_role' or
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','analyst','viewer'))
  );

create policy "analyst_read_investigations" on investigations for select
  using (
    auth.role() = 'service_role' or
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','analyst','viewer'))
  );

create policy "analyst_update_actions" on actions for update
  using (
    auth.role() = 'service_role' or
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','analyst'))
  );

create policy "analyst_read_actions" on actions for select
  using (
    auth.role() = 'service_role' or
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','analyst','viewer'))
  );

-- Webhook tokens table (for Splunk webhook auth)
create table webhook_tokens (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  token_hash text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  last_used_at timestamptz,
  active boolean default true
);

alter table webhook_tokens enable row level security;
create policy "service_role_all_webhook_tokens" on webhook_tokens for all using (auth.role() = 'service_role');
