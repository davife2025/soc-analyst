-- Splunk saved search schedules
create table splunk_schedules (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  search_query text not null,
  timerange text not null default '-15m',
  cron_expression text not null default '*/15 * * * *',
  active boolean not null default true,
  last_run_at timestamptz,
  last_run_status text check (last_run_status in ('success','error','running')),
  last_error text,
  alerts_created_last_run integer default 0,
  created_at timestamptz default now()
);

alter table splunk_schedules enable row level security;
create policy "service_role_all_schedules" on splunk_schedules for all using (auth.role() = 'service_role');
create policy "analyst_read_schedules" on splunk_schedules for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','analyst','viewer')));

-- Notification channels
create table notification_channels (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('slack','pagerduty','email')),
  config jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table notification_channels enable row level security;
create policy "service_role_all_channels" on notification_channels for all using (auth.role() = 'service_role');
create policy "analyst_read_channels" on notification_channels for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','analyst','viewer')));

-- Notification log
create table notification_log (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid references notification_channels(id),
  channel_type text not null,
  alert_id uuid references alerts(id),
  investigation_id uuid references investigations(id),
  status text not null check (status in ('sent','failed','skipped')),
  payload jsonb not null default '{}',
  error text,
  sent_at timestamptz default now()
);

alter table notification_log enable row level security;
create policy "service_role_all_notif_log" on notification_log for all using (auth.role() = 'service_role');

-- Indexes
create index splunk_schedules_active_idx on splunk_schedules(active);
create index notification_log_alert_idx on notification_log(alert_id);
create index notification_log_sent_at_idx on notification_log(sent_at desc);
