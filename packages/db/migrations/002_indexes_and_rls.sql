-- Performance indexes
create index if not exists alerts_status_idx on alerts(status);
create index if not exists alerts_severity_idx on alerts(severity);
create index if not exists alerts_created_at_idx on alerts(created_at desc);
create index if not exists investigations_alert_id_idx on investigations(alert_id);
create index if not exists investigations_status_idx on investigations(status);
create index if not exists actions_investigation_id_idx on actions(investigation_id);
create index if not exists actions_status_idx on actions(status);
create index if not exists threat_intel_indicator_idx on threat_intel(indicator, indicator_type);
create index if not exists audit_log_entity_idx on audit_log(entity_type, entity_id);

-- RLS: service role full access
create policy "service_role_all_alerts" on alerts for all using (auth.role() = 'service_role');
create policy "service_role_all_investigations" on investigations for all using (auth.role() = 'service_role');
create policy "service_role_all_actions" on actions for all using (auth.role() = 'service_role');
create policy "service_role_all_threat_intel" on threat_intel for all using (auth.role() = 'service_role');
create policy "service_role_all_playbooks" on playbooks for all using (auth.role() = 'service_role');
create policy "service_role_all_audit_log" on audit_log for all using (auth.role() = 'service_role');
