-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Alerts: raw Splunk events normalised
create table alerts (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  splunk_event_id text unique not null,
  severity text not null check (severity in ('critical','high','medium','low','info')),
  status text not null default 'new' check (status in ('new','investigating','resolved','false_positive')),
  title text not null,
  raw_event jsonb not null default '{}',
  source_ip text,
  dest_ip text,
  source_host text,
  tags text[] default '{}'
);

-- Investigations: agent reasoning per alert
create table investigations (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  alert_id uuid references alerts(id) on delete cascade,
  status text not null default 'running' check (status in ('running','complete','needs_review')),
  reasoning_chain jsonb not null default '[]',
  summary text,
  confidence_score numeric(4,3),
  attack_chain text[] default '{}',
  agent_version text not null default '1.0.0'
);

-- Actions: recommended or executed responses
create table actions (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  investigation_id uuid references investigations(id) on delete cascade,
  action_type text not null,
  description text not null,
  parameters jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','executed','rejected')),
  approved_by text,
  executed_at timestamptz,
  result text
);

-- Threat intel cache
create table threat_intel (
  id uuid primary key default uuid_generate_v4(),
  indicator text not null,
  indicator_type text not null check (indicator_type in ('ip','domain','hash','cve')),
  threat_score numeric(4,3) not null,
  source text not null,
  details jsonb not null default '{}',
  cached_at timestamptz default now(),
  expires_at timestamptz not null,
  unique(indicator, indicator_type)
);

-- Playbooks: agent response rules
create table playbooks (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null,
  trigger_conditions jsonb not null default '{}',
  auto_execute boolean not null default false,
  steps jsonb not null default '[]',
  active boolean not null default true,
  created_at timestamptz default now()
);

-- Audit log: immutable decision trail
create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  actor text not null,
  before jsonb,
  after jsonb,
  metadata jsonb not null default '{}'
);

-- Realtime
alter publication supabase_realtime add table alerts;
alter publication supabase_realtime add table investigations;
alter publication supabase_realtime add table actions;

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger investigations_updated_at
  before update on investigations
  for each row execute function update_updated_at();

-- Row Level Security (enable, default deny, add policies as needed)
alter table alerts enable row level security;
alter table investigations enable row level security;
alter table actions enable row level security;
alter table threat_intel enable row level security;
alter table playbooks enable row level security;
alter table audit_log enable row level security;
