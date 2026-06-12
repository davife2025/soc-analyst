-- Alert notes: analyst commentary per alert
create table alert_notes (
  id uuid primary key default uuid_generate_v4(),
  alert_id uuid not null references alerts(id) on delete cascade,
  author_id uuid references auth.users(id),
  author_email text not null,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index alert_notes_alert_idx on alert_notes(alert_id);
create index alert_notes_created_idx on alert_notes(created_at desc);

alter table alert_notes enable row level security;
create policy "service_role_all_notes" on alert_notes
  for all using (auth.role() = 'service_role');
create policy "analyst_read_notes" on alert_notes
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','analyst','viewer'))
  );
create policy "analyst_write_notes" on alert_notes
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','analyst'))
  );

create trigger alert_notes_updated_at
  before update on alert_notes
  for each row execute function update_updated_at();

-- Realtime for notes
alter publication supabase_realtime add table alert_notes;
