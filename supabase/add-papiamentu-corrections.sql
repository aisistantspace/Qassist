-- Papiamentu self-learning: log corrections for manual review when PAPIAMENTU_LEARNING_ENABLED is on
-- Run this after your main schema migrations.
create table if not exists public.papiamentu_corrections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  from_text text not null,
  to_text text not null,
  change_type text not null check (change_type in ('spelling', 'orthography', 'variant')),
  context text,
  created_at timestamptz not null default now()
);

create index if not exists idx_papiamentu_corrections_tenant_created
  on public.papiamentu_corrections (tenant_id, created_at desc);

comment on table public.papiamentu_corrections is 'Log of Papiamentu layer corrections when self-learning is enabled (PAPIAMENTU_LEARNING_ENABLED)';
