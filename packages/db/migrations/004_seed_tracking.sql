-- Optional: track seed runs so you don't accidentally double-seed
create table if not exists seed_runs (
  id uuid primary key default uuid_generate_v4(),
  ran_at timestamptz default now(),
  note text
);

alter table seed_runs enable row level security;
create policy "service_role_all_seed_runs" on seed_runs for all using (auth.role() = 'service_role');
