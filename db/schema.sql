-- ============================================================
-- EUGENIA — Schéma Supabase aligné sur le dashboard
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- Séquence pour les IDs tickets
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 4800;

-- ── PROFILES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              uuid REFERENCES auth.users PRIMARY KEY,
  role            text NOT NULL CHECK (role IN ('vendeur', 'marketplace')),
  company_name    text,
  marketplace_name text,
  avatar          char(1) DEFAULT 'U',
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ── TICKETS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id          text PRIMARY KEY
                DEFAULT 'TK-' || lpad(nextval('ticket_seq')::text, 4, '0'),
  vendor_id   uuid REFERENCES profiles(id),
  client      text NOT NULL,
  email       text,
  marketplace text NOT NULL,
  subject     text NOT NULL,
  status      text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','pending','escalated','resolved')),
  priority    text NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('critical','high','medium','low')),
  category    text,
  assignee    text DEFAULT 'Agent IA',
  order_ref   text,
  sla         text,
  raw_message text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor can manage own tickets"
  ON tickets FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'vendeur'
    AND vendor_id = auth.uid()
  );

CREATE POLICY "marketplace can read all tickets"
  ON tickets FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'marketplace'
  );

-- Politique permissive pour les service_role (n8n, API)
CREATE POLICY "service_role full access"
  ON tickets FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── MESSAGES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id   text REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  role        text NOT NULL CHECK (role IN ('client','agent','human')),
  is_ai       boolean DEFAULT false,
  text        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages via ticket access"
  ON messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = messages.ticket_id
      AND (
        t.vendor_id = auth.uid()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'marketplace'
      )
    )
  );

CREATE POLICY "service_role messages"
  ON messages FOR ALL
  USING (auth.role() = 'service_role');

-- ── AGENT ACTIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_actions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id   text REFERENCES tickets(id) ON DELETE CASCADE,
  action      text NOT NULL,
  type        text NOT NULL
                CHECK (type IN ('action','decision','reply','escalation','resolved')),
  icon        text DEFAULT '⚙️',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent actions via ticket"
  ON agent_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = agent_actions.ticket_id
      AND t.vendor_id = auth.uid()
    )
  );

CREATE POLICY "service_role agent_actions"
  ON agent_actions FOR ALL
  USING (auth.role() = 'service_role');

-- ── VALIDATIONS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS validations (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id     text REFERENCES tickets(id) ON DELETE CASCADE,
  client        text,
  marketplace   text,
  amount        numeric(10,2) NOT NULL,
  type          text NOT NULL,
  context       text,
  agent_quote   text,
  priority      text CHECK (priority IN ('critical','high','medium','low')),
  sla           text,
  status        text DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected')),
  reject_reason text,
  resolved_by   uuid REFERENCES profiles(id),
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor can manage validations"
  ON validations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = validations.ticket_id
      AND t.vendor_id = auth.uid()
    )
  );

CREATE POLICY "service_role validations"
  ON validations FOR ALL
  USING (auth.role() = 'service_role');

-- ── VUES DASHBOARD ────────────────────────────────────────────

CREATE OR REPLACE VIEW merchant_kpis AS
SELECT
  t.marketplace,
  count(*) AS total_tickets,
  round(
    count(*) FILTER (WHERE t.assignee = 'Agent IA' AND t.status = 'resolved')::numeric
    / nullif(count(*), 0) * 100, 1
  ) AS resolution_ia_pct,
  count(*) FILTER (WHERE t.sla = 'Dépassé') AS sla_depasse,
  count(*) FILTER (WHERE t.status = 'escalated') AS escalades,
  coalesce(sum(v.amount) FILTER (WHERE v.status = 'approved'), 0) AS montant_traite
FROM tickets t
LEFT JOIN validations v ON v.ticket_id = t.id
GROUP BY t.marketplace;

-- ── REALTIME ──────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE validations;
