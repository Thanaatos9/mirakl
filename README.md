# Eugenia — SAV Agent-led pour Marketplaces Mirakl

Agent IA autonome qui traite les tickets SAV, avec validation humaine obligatoire sur les décisions financières.

## Architecture

```
dashboard/          → Frontend Next.js 14 (design handoff)
db/
  schema.sql        → Schéma Supabase (4 tables + RLS)
  seed.sql          → Données de démo (13 tickets)
n8n/workflows/
  sav-agent.json    → Workflow n8n unique (agent IA + guardrails)
```

## Comment ça marche

```
Ticket ouvert (Supabase)
    │
    ▼ (toutes les 2 min)
n8n: Fetch Open Tickets
    │
    ▼
n8n: IA classifie + recommande (OpenAI / DUST)
    │
    ▼
n8n: Guardrails (confiance, signaux financiers)
    │
    ├── auto_reply     → Réponse client + résolu
    ├── validation     → Synthèse + attente humaine
    └── escalade       → Transfert humain
    │
    ▼
Dashboard temps réel (Supabase Realtime)
```

## Setup

1. Créer un projet Supabase
2. Exécuter `db/schema.sql` puis `db/seed.sql`
3. Copier `.env.example` en `.env.local`
4. Importer `n8n/workflows/sav-agent.json` dans n8n
5. Configurer les credentials Postgres + OpenAI dans n8n

## Règle absolue

> Aucun remboursement sans validation humaine explicite.
