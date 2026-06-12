create table agent_heartbeats (
  id uuid primary key default uuid_generate_v4(),
  agent_version text not null,
  status text not null check (status in ('healthy','degraded','error')),
  alerts_queued integer not null default 0,
  alerts_processed_1h integer not null default 0,
  last_investigation_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}',
  created_at timestamptz default now()
);

-- Keep only last 1000 heartbeats (trimmed by agent)
create index agent_heartbeats_created_idx on agent_heartbeats(created_at desc);
alter table agent_heartbeats enable row level security;
create policy "service_role_all_heartbeats" on agent_heartbeats
  for all using (auth.role() = 'service_role');
create policy "analyst_read_heartbeats" on agent_heartbeats
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','analyst','viewer'))
  );
alter publication supabase_realtime add table agent_heartbeats;
