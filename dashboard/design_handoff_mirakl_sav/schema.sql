-- ============================================================
-- Mirakl SAV — Schéma Supabase complet avec RLS
-- ============================================================

-- Séquence pour les IDs tickets
create sequence if not exists ticket_seq start 4800;

-- ── PROFILES ──────────────────────────────────────────────
create table if not exists profiles (
  id            uuid references auth.users primary key,
  role          text not null check (role in ('vendeur', 'marketplace')),
  company_name  text,
  marketplace_name text,  -- pour les opérateurs marketplace
  avatar        char(1) default 'U',
  created_at    timestamptz default now()
);

alter table profiles enable row level security;

create policy "users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- ── TICKETS ───────────────────────────────────────────────
create table if not exists tickets (
  id          text primary key
                default 'TK-' || lpad(nextval('ticket_seq')::text, 4, '0'),
  vendor_id   uuid references profiles(id) not null,
  client      text not null,
  email       text,
  marketplace text not null,
  subject     text not null,
  status      text not null default 'open'
                check (status in ('open','pending','escalated','resolved')),
  priority    text not null default 'medium'
                check (priority in ('critical','high','medium','low')),
  category    text,
  assignee    text default 'Agent IA',
  order_ref   text,
  sla         text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table tickets enable row level security;

-- Vendeurs voient et modifient leurs propres tickets
create policy "vendor can manage own tickets"
  on tickets for all
  using (
    (select role from profiles where id = auth.uid()) = 'vendeur'
    and vendor_id = auth.uid()
  );

-- Marketplace voit tous les tickets en lecture seule
create policy "marketplace can read all tickets"
  on tickets for select
  using (
    (select role from profiles where id = auth.uid()) = 'marketplace'
  );

-- Trigger updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tickets_updated_at
  before update on tickets
  for each row execute function update_updated_at();

-- ── MESSAGES ──────────────────────────────────────────────
create table if not exists messages (
  id          uuid default gen_random_uuid() primary key,
  ticket_id   text references tickets(id) on delete cascade not null,
  role        text not null check (role in ('client','agent','human')),
  is_ai       boolean default false,
  text        text not null,
  created_at  timestamptz default now()
);

alter table messages enable row level security;

create policy "messages via ticket access"
  on messages for all
  using (
    exists (
      select 1 from tickets t
      where t.id = messages.ticket_id
      and (
        t.vendor_id = auth.uid()
        or (select role from profiles where id = auth.uid()) = 'marketplace'
      )
    )
  );

-- ── AGENT ACTIONS ─────────────────────────────────────────
create table if not exists agent_actions (
  id          uuid default gen_random_uuid() primary key,
  ticket_id   text references tickets(id) on delete cascade,
  action      text not null,
  type        text not null
                check (type in ('action','decision','reply','escalation','resolved')),
  icon        text default '⚙️',
  created_at  timestamptz default now()
);

alter table agent_actions enable row level security;

create policy "agent actions via ticket"
  on agent_actions for select
  using (
    exists (
      select 1 from tickets t
      where t.id = agent_actions.ticket_id
      and t.vendor_id = auth.uid()
    )
  );

-- ── VALIDATIONS ───────────────────────────────────────────
create table if not exists validations (
  id            uuid default gen_random_uuid() primary key,
  ticket_id     text references tickets(id) on delete cascade,
  client        text,
  marketplace   text,
  amount        numeric(10,2) not null,
  type          text not null,  -- 'Remboursement exceptionnel' | 'Bon de réduction' etc.
  context       text,
  agent_quote   text,
  priority      text check (priority in ('critical','high','medium','low')),
  sla           text,
  status        text default 'pending'
                  check (status in ('pending','approved','rejected')),
  reject_reason text,
  resolved_by   uuid references profiles(id),
  created_at    timestamptz default now()
);

alter table validations enable row level security;

create policy "vendor can manage validations"
  on validations for all
  using (
    exists (
      select 1 from tickets t
      where t.id = validations.ticket_id
      and t.vendor_id = auth.uid()
    )
  );

-- ── MERCHANT KPIS (vue matérialisée) ──────────────────────
-- Rafraîchir périodiquement ou via triggers
create or replace view merchant_kpis as
select
  marketplace,
  count(*) as total_tickets,
  round(
    count(*) filter (where assignee = 'Agent IA' and status = 'resolved')::numeric
    / nullif(count(*), 0) * 100, 1
  ) as resolution_ia_pct,
  count(*) filter (where sla = 'Dépassé') as sla_depasse,
  count(*) filter (where status = 'escalated') as escalades
from tickets
group by marketplace;

-- ── REALTIME ──────────────────────────────────────────────
-- Activer le realtime sur les tables nécessaires
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table agent_actions;
alter publication supabase_realtime add table validations;

-- ── DONNÉES DE DÉMO ───────────────────────────────────────
-- À exécuter après avoir créé les utilisateurs via auth
-- insert into profiles (id, role, company_name, avatar) values
--   ('<vendor-user-id>',      'vendeur',      'Fanny Great Boutique', 'F'),
--   ('<marketplace-user-id>', 'marketplace',  'Mirakl Connect',       'M');
