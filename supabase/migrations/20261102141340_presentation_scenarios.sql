begin;
create table public.presentation_scenarios (
  scenario_key text primary key check (scenario_key = 'liber-presentation-v1'),
  revision integer not null check (revision = 1),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 65536),
  published_at timestamptz not null default now()
);
comment on table public.presentation_scenarios is 'Referência versionada da apresentação; independente de estoque, movimentos e rascunhos locais.';
alter table public.presentation_scenarios enable row level security;
revoke all on public.presentation_scenarios from public, anon, authenticated;
grant select on public.presentation_scenarios to authenticated;
grant select, insert, update on public.presentation_scenarios to service_role;
create policy presentation_company_read on public.presentation_scenarios
  for select to authenticated
  using ((select private.current_user_role()) is not null);
commit;
