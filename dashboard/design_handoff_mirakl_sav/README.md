# Handoff : Mirakl SAV Dashboard

## Vue d'ensemble

Ce package documente le design du **dashboard SAV Mirakl** — une interface de gestion du service après-vente pilotée par un agent IA autonome. L'application permet à un vendeur solo de déléguer l'ensemble de ses opérations SAV (tickets, retours, remboursements, escalades) à un agent IA, tout en gardant la main à tout moment.

## À propos des fichiers de design

Les fichiers HTML fournis dans ce bundle sont des **prototypes de design haute fidélité** créés comme références visuelles et comportementales. Ils ne sont pas destinés à être mis en production tels quels. La mission est de **recréer ces designs dans un projet Next.js 14** (App Router, TypeScript, Tailwind CSS) en utilisant les patterns établis — notamment avec Supabase pour l'auth et la base de données.

**Fichier de référence :** `SAV Dashboard.html`

## Fidélité

**Haute fidélité (hifi)** — Les maquettes sont pixel-perfect avec couleurs finales, typographie, espacements et interactions. Le développeur doit recréer l'UI à l'identique en utilisant les bibliothèques du projet.

---

## Architecture recommandée Next.js 14

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx          ← Page de connexion
│   ├── (dashboard)/
│   │   ├── layout.tsx            ← AppShell : Sidebar + TopBar
│   │   ├── page.tsx              ← Accueil (KPIs + graphiques)
│   │   ├── tickets/
│   │   │   ├── page.tsx          ← Liste tickets
│   │   │   └── [id]/
│   │   │       └── page.tsx      ← Détail ticket + conversation
│   │   ├── flux/
│   │   │   └── page.tsx          ← Flux Live (SSE)
│   │   ├── validations/
│   │   │   └── page.tsx          ← File de validations humaines
│   │   └── agent/
│   │       └── page.tsx          ← Journal agent IA
│   └── (marketplace)/
│       └── marketplace/
│           └── page.tsx          ← Vue Marketplace (rôle restreint)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── AppShell.tsx
│   ├── tickets/
│   │   ├── TicketTable.tsx
│   │   ├── TicketDetail.tsx
│   │   ├── MessageBubble.tsx
│   │   └── TicketFilters.tsx
│   ├── flux/
│   │   └── AgentEventCard.tsx
│   ├── validations/
│   │   ├── ValidationCard.tsx
│   │   └── RejectModal.tsx
│   ├── marketplace/
│   │   ├── MerchantSelector.tsx
│   │   ├── MpKpiCard.tsx
│   │   └── DistributionChart.tsx
│   ├── charts/
│   │   ├── AreaChart.tsx
│   │   ├── BarChart.tsx
│   │   └── DonutChart.tsx
│   └── ui/
│       ├── Badge.tsx
│       ├── KpiCard.tsx
│       └── StarRating.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             ← createBrowserClient
│   │   ├── server.ts             ← createServerClient
│   │   └── middleware.ts
│   ├── api.ts                    ← fetch helpers vers backend
│   ├── stream.ts                 ← client SSE → /api/stream
│   └── types.ts                  ← tous les types TypeScript
├── hooks/
│   ├── useTickets.ts
│   ├── useAgentStream.ts         ← SSE realtime
│   └── useValidations.ts
└── middleware.ts                 ← protection des routes par rôle
```

---

## Screens / Vues

### 1. Page de connexion `/login`

**Purpose :** Authentification avec deux rôles distincts.

**Layout :**
- Fond `#0f1629` plein écran, deux colonnes flex
- Colonne gauche (flex:1) : branding + cards de rôle démo
- Colonne droite (460px) : formulaire dans une card blanche

**Composants clés :**
- Logo : `w-8 h-8 rounded-lg bg-blue-500 text-white font-black` + texte
- Titre : `text-4xl font-black text-white` avec gradient violet sur "avec l'IA."
- Formulaire : inputs `border-1.5 rounded-xl` avec focus `border-blue-500`
- Bouton submit : `bg-blue-500 text-white rounded-xl font-bold` désactivé si champs vides
- Quick login cards : `bg-white/4 border border-white/8 rounded-xl` hover `bg-white/7`

**Tokens couleur :**
- Background : `#0f1629`
- Accent bleu : `#3b82f6`
- Accent violet : `#8b5cf6`
- Texte principal : `#e2e8f0`
- Texte secondaire : `#64748b`

---

### 2. AppShell — Sidebar

**Layout :** `w-[220px] bg-[#0f1629] flex flex-col h-screen sticky top-0`

**Sections :**
1. **Logo + Agent status** (padding 20px)
   - Logo carré `w-8 h-8 rounded-lg` couleur accent
   - Pill "Aria — En ligne" : `bg-purple-500/12 border border-purple-500/20 rounded-lg` avec dot pulsant
2. **Infos boutique** (padding 12px 20px)
   - Label rôle small caps gris + nom boutique
3. **Navigation** (flex:1, padding 10px)
   - Items : `rounded-lg px-3 py-2 text-sm` — actif `bg-blue-500/15 text-blue-500 font-semibold`
   - Badge rouge : `bg-red-500 text-white rounded-full text-xs px-1.5`
4. **Footer** : bouton déconnexion rouge + widget résolution 94%

**Comportement auth :**
- Rôle `vendeur` : nav complète (Accueil, Tickets, Flux Live, Validations, Agent IA)
- Rôle `marketplace` : nav réduite (Marketplace uniquement)

---

### 3. Accueil `/` (rôle vendeur)

**Layout :** scroll vertical, padding 28px, gap 24px entre sections

**Section 1 — Banner Agent IA**
- Gradient `from-[#1e1b4b] via-[#312e81] to-[#4c1d95]`, `rounded-2xl p-5`
- Icône cerveau 44px avec `animation: agent-glow 3s ease infinite`
- Toggle on/off avec transition couleur `bg-green-500` / `bg-slate-500`

**Section 2 — KPIs (4 cartes flex)**
- `bg-white rounded-xl border border-slate-100 p-5 flex-1`
- Valeur : `text-3xl font-bold`
- Icône : `w-10 h-10 rounded-xl bg-[color]/10`
- Trend : `text-xs text-green-500` ou `text-red-500` avec flèche SVG

**Section 3 — Graphiques ligne 1 (3 colonnes)**
- Volume tickets : AreaChart SVG bleu `#3b82f6`
- Temps de réponse : BarChart SVG violet `#8b5cf6`
- Catégories : DonutChart SVG + barres de progression

**Section 4 — Graphiques ligne 2 (2 colonnes)**
- CSAT : AreaChart vert + 4 émojis satisfaction avec %
- SLA par marketplace : barres de progression + taux global

**Section 5 — Grid 2 colonnes**
- Tableau tickets récents (clickable rows)
- Feed activité agent IA (scroll interne)

---

### 4. Tickets SAV `/tickets`

**Layout :** TopBar + padding 28px

**Filtres :**
- Search input : `bg-slate-50 border border-slate-100 rounded-lg pl-9` avec icône loupe
- Selects statut/priorité : `bg-slate-50 border rounded-lg text-sm`

**Tableau :**
- Header : `bg-slate-50` sticky, colonnes : ID / Client / Sujet / Catégorie / Statut / Priorité / Assigné / SLA / →
- Rows : hover `bg-[#fafbff]`, cursor pointer
- ID : `font-mono text-blue-500 text-xs`
- Assigné IA : dot pulsant violet + nom agent
- SLA dépassé : `text-red-500 font-semibold`

---

### 5. Détail ticket `/tickets/[id]`

**Layout :** grid 2 colonnes `1fr 300px`, hauteur 100vh - 60px, overflow hidden

**Colonne gauche — Conversation**
- Meta bar : badges statut/priorité, ref commande, SLA
- Zone messages `bg-[#fafbff]` scroll : bulles client (gauche, blanc) et agent (droite, violet)
- Indicateur "typing" : 3 dots pulsants sur fond violet
- Composer : textarea + bouton send bleu

**Colonne droite — Panel**
1. **Contrôle** : bouton "Reprendre la main" — toggle vert/violet avec flip état
2. **Client** : grille label/valeur
3. **Raisonnement IA** : card `bg-[#f8f5ff] border border-purple-100`
4. **Timeline** : dots colorés + labels + timestamps mono

**État "prise de main" :**
- Banner bleu `bg-blue-100 text-blue-700` dans le composer
- Bouton passe en vert "Reprendre contrôle actif"

---

### 6. Flux Live `/flux`

**Layout :** TopBar avec bouton pause/live + compteurs par type + liste d'événements

**AgentEventCard :**
- `bg-white rounded-xl border p-4 animation: slideDown .35s cubic-bezier(.22,1,.36,1)`
- Icône 38px dans bg coloré selon type
- Types : `in_progress` (jaune), `resolved` (vert), `validation` (violet)
- Si validation : bouton "Examiner →" violet

**Mise à jour :** `setInterval` 5s simulant SSE → remplacer par `EventSource('/api/stream')`

---

### 7. Validations `/validations`

**Layout :** TopBar + padding 28px + liste ValidationCards

**ValidationCard :**
- Card blanche `rounded-2xl border shadow-sm`
- Header : ID + priorité badge + montant `text-2xl font-black`
- Contexte : `bg-slate-50 rounded-lg p-3 text-xs`
- Citation agent : `bg-purple-50 border border-purple-100 rounded-lg italic text-purple-700`
- 3 boutons : Approuver (vert) / Refuser (rouge outline) / ↗ (gris)

**Animation approbation :**
- `perspective: 1000px`, `transform: rotateY(180deg)` en 0.6s cubic-bezier
- Face arrière : gradient vert `from-green-100 to-green-200` + ✅

**RejectModal :**
- Overlay `backdrop-blur-sm bg-[#0f1629]/60`
- Card 480px, presets de raisons cliquables
- Textarea obligatoire avec validation visuelle
- Bouton confirmer désactivé si vide

---

### 8. Agent IA `/agent`

**Layout :** Banner gradient violet + stats grid + journal d'actions

**Banner :**
- Gradient `#1e1b4b → #4c1d95`, icône cerveau 60px avec `agent-glow` animation
- Grid 2x2 stats : actions/jour, tickets traités, taux auto-résolution, escalades
- Pills de capacités

**Journal :**
- Icône 36px colorée par type d'action
- Timestamp right-aligned
- Badge type coloré

---

### 9. Marketplace `/marketplace` (rôle marketplace uniquement)

**Layout :** TopBar custom "Opérateur Marketplace" + padding 28px

**Sélecteur marchand :**
- Dropdown custom dans la banner violette
- Options : Tous / Amazon / Fnac / Cdiscount / Darty
- Données distinctes par marchand (voir types)

**KPI ligne 1 (4 cartes) :**
- Total tickets / Résolution IA / SLA dépassés / Montant traité

**KPI ligne 2 (5 cartes spécifiques) :**
- Taux de retour : jauge colorée selon seuils (≤7% vert, ≤12% orange, >12% rouge)
- Insatisfaction client : barre progression (≤5% vert, ≤10% orange)
- Note vendeur : étoiles SVG dynamiques avec score décimal
- Temps moyen livraison : en jours avec label Express/Standard/Lent
- Temps moyen réponse ticket : en minutes vs SLA 15 min

**Section graphiques (2 colonnes) :**
- Distribution par type : barres colorées horizontales
- Performance par marchand : tableau + AreaChart évolution 7j

**Tickets attention :**
- Tableau lecture seule, clients anonymisés (prénom + initiale)
- Badge "Lecture seule — aucune action disponible"

---

## Interactions & Comportement

| Interaction | Durée | Easing |
|---|---|---|
| Slide-in cards | 300ms | ease |
| SlideDown flux events | 350ms | cubic-bezier(.22,1,.36,1) |
| Card flip validation | 600ms | cubic-bezier(.4,0,.2,1) |
| Modal fade-in | 150ms | ease |
| Dot pulsant | 2s | ease infinite |
| Agent glow | 3s | ease infinite |
| Barres de progression | 600-800ms | ease |
| Spinner loading | 1s | linear infinite |

---

## Tokens de design

### Couleurs
```ts
const colors = {
  // Backgrounds
  bgDark:        '#0f1629',
  bgMedium:      '#1e293b',
  bgLight:       '#f1f5f9',
  bgWhite:       '#ffffff',
  bgPage:        '#fafbff',

  // Accents
  blue:          '#3b82f6',
  blueSoft:      '#dbeafe',
  purple:        '#8b5cf6',
  purpleSoft:    '#ede9fe',

  // Statuts
  green:         '#10b981',
  greenSoft:     '#d1fae5',
  yellow:        '#f59e0b',
  yellowSoft:    '#fef3c7',
  orange:        '#f97316',
  red:           '#ef4444',
  redSoft:       '#fee2e2',

  // Texte
  textPrimary:   '#0f172a',
  textSecondary: '#334155',
  textMuted:     '#64748b',
  textFaint:     '#94a3b8',

  // Borders
  border:        '#f1f5f9',
  borderMedium:  '#e2e8f0',
}
```

### Typographie
```ts
// Font families
'DM Sans'  // UI générale (weights: 300, 400, 500, 600, 700)
'DM Mono'  // IDs, refs commandes, timestamps (weights: 400, 500)

// Échelle
text-[10px]   // labels uppercase small caps
text-xs       // 11px — sous-titres, badges, meta
text-sm       // 13px — contenu principal
text-base     // 14px — topbar titles, nav
text-lg       // 16px — page titles
text-2xl      // 24px — KPI values
text-3xl      // 32px — KPI values larges
text-4xl      // 36px — login title
```

### Espacements clés
```ts
sidebar-width:     220px
topbar-height:     60px
page-padding:      28px
card-padding:      '18px 20px' | '20px 24px'
card-radius:       12px | 14px
gap-cards:         14px | 16px | 20px
```

### Shadows
```ts
card:    '0 1px 3px rgba(0,0,0,.06)'
modal:   '0 24px 80px rgba(0,0,0,.2)'
login:   '0 24px 80px rgba(0,0,0,.4)'
```

---

## Types TypeScript

```ts
// lib/types.ts

export type UserRole = 'vendeur' | 'marketplace';

export interface Profile {
  id: string;
  role: UserRole;
  company_name: string;
  email: string;
  avatar: string;
}

export type TicketStatus = 'open' | 'pending' | 'escalated' | 'resolved';
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
export type TicketCategory = 'Livraison' | 'Produit' | 'Remboursement' | 'Échange' | 'Facturation' | 'Annulation';
export type MarketplaceName = 'Amazon' | 'Fnac' | 'Cdiscount' | 'Darty';

export interface Ticket {
  id: string;
  client: string;
  email: string;
  marketplace: MarketplaceName;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  created_at: string;
  updated_at: string;
  assignee: string;
  order_ref: string;
  sla: string;
  messages?: Message[];
}

export type MessageRole = 'client' | 'agent' | 'human';

export interface Message {
  id: string;
  ticket_id: string;
  role: MessageRole;
  is_ai: boolean;
  text: string;
  created_at: string;
}

export type AgentActionType = 'action' | 'decision' | 'reply' | 'escalation' | 'resolved';

export interface AgentAction {
  id: string;
  ticket_id: string;
  action: string;
  type: AgentActionType;
  icon: string;
  created_at: string;
}

export type ValidationStatus = 'pending' | 'approved' | 'rejected';

export interface Validation {
  id: string;
  ticket_id: string;
  client: string;
  marketplace: MarketplaceName;
  amount: number;
  type: string;
  context: string;
  agent_quote: string;
  priority: TicketPriority;
  sla: string;
  status: ValidationStatus;
  reject_reason?: string;
}

export interface MerchantKpis {
  tickets: number;
  resolution_ia: number;
  sla_depasse: number;
  montant: number;
  taux_retour: number;
  insatisfaction: number;
  note_marchand: number;
  temps_livraison: number;
  temps_reponse: number;
  escalades: number;
  auto_resolu: number;
}

export interface FluxEvent {
  id: string;
  type: 'in_progress' | 'resolved' | 'validation';
  ticket_id: string;
  client: string;
  action: string;
  detail: string;
  amount?: number;
  created_at: string;
}
```

---

## Schéma Supabase

```sql
-- Activer RLS sur toutes les tables
-- Profiles (rôles)
create table profiles (
  id uuid references auth.users primary key,
  role text check (role in ('vendeur', 'marketplace')) not null,
  company_name text,
  marketplace_name text,
  avatar char(1) default 'U',
  created_at timestamptz default now()
);

-- RLS: chaque utilisateur voit son propre profil
alter table profiles enable row level security;
create policy "own profile" on profiles for all using (auth.uid() = id);

-- Tickets
create table tickets (
  id text primary key default 'TK-' || lpad(nextval('ticket_seq')::text, 4, '0'),
  vendor_id uuid references profiles(id),
  client text not null,
  email text,
  marketplace text not null,
  subject text not null,
  status text default 'open' check (status in ('open','pending','escalated','resolved')),
  priority text default 'medium' check (priority in ('critical','high','medium','low')),
  category text,
  assignee text default 'Agent IA',
  order_ref text,
  sla text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table tickets enable row level security;
-- Vendeurs voient leurs tickets; marketplace voit tout (lecture)
create policy "vendor tickets" on tickets for all using (
  (select role from profiles where id = auth.uid()) = 'vendeur'
  and vendor_id = auth.uid()
);
create policy "marketplace read" on tickets for select using (
  (select role from profiles where id = auth.uid()) = 'marketplace'
);

-- Messages
create table messages (
  id uuid default gen_random_uuid() primary key,
  ticket_id text references tickets(id) on delete cascade,
  role text check (role in ('client','agent','human')),
  is_ai boolean default false,
  text text not null,
  created_at timestamptz default now()
);
alter table messages enable row level security;
create policy "messages via ticket" on messages for all using (
  exists (select 1 from tickets t where t.id = messages.ticket_id
    and (t.vendor_id = auth.uid()
         or (select role from profiles where id = auth.uid()) = 'marketplace'))
);

-- Agent actions
create table agent_actions (
  id uuid default gen_random_uuid() primary key,
  ticket_id text references tickets(id),
  action text not null,
  type text check (type in ('action','decision','reply','escalation','resolved')),
  icon text default '⚙️',
  created_at timestamptz default now()
);
alter table agent_actions enable row level security;
create policy "agent actions via ticket" on agent_actions for select using (
  exists (select 1 from tickets t where t.id = agent_actions.ticket_id
    and t.vendor_id = auth.uid())
);

-- Validations
create table validations (
  id uuid default gen_random_uuid() primary key,
  ticket_id text references tickets(id),
  client text,
  marketplace text,
  amount numeric(10,2),
  type text,
  context text,
  agent_quote text,
  priority text,
  sla text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason text,
  resolved_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table validations enable row level security;
create policy "vendor validations" on validations for all using (
  exists (select 1 from tickets t where t.id = validations.ticket_id
    and t.vendor_id = auth.uid())
);
```

---

## Hooks React (Next.js)

### useTickets.ts
```ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import { Ticket } from '@/lib/types';

export function useTickets() {
  const supabase = createClientComponentClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('tickets')
        .select('*, messages(*)')
        .order('created_at', { ascending: false });
      setTickets(data ?? []);
      setLoading(false);
    };
    fetch();

    // Realtime
    const channel = supabase
      .channel('tickets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { tickets, loading };
}
```

### useAgentStream.ts
```ts
import { useEffect, useState } from 'react';
import { FluxEvent } from '@/lib/types';

export function useAgentStream() {
  const [events, setEvents] = useState<FluxEvent[]>([]);

  useEffect(() => {
    const es = new EventSource('/api/stream');
    es.onmessage = (e) => {
      const event: FluxEvent = JSON.parse(e.data);
      setEvents(prev => [event, ...prev.slice(0, 49)]);
    };
    return () => es.close();
  }, []);

  return events;
}
```

### Route SSE `/api/stream/route.ts`
```ts
export const runtime = 'edge';

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Connecter ici à votre agent IA / Supabase Realtime
      // Exemple : écouter agent_actions via supabase-js
      const interval = setInterval(() => {
        const data = JSON.stringify({ id: crypto.randomUUID(), type: 'in_progress', action: 'Ping agent' });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }, 5000);

      return () => clearInterval(interval);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## Middleware de protection des routes

```ts
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // Non connecté → login
  if (!session && req.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    // Marketplace → uniquement /marketplace
    if (profile?.role === 'marketplace' && !req.nextUrl.pathname.startsWith('/marketplace')) {
      return NextResponse.redirect(new URL('/marketplace', req.url));
    }

    // Vendeur → pas accès à /marketplace
    if (profile?.role === 'vendeur' && req.nextUrl.pathname.startsWith('/marketplace')) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## Variables d'environnement

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...  # backend only
```

---

## Stack recommandée

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "typescript": "5.x",
    "tailwindcss": "3.x",
    "@supabase/supabase-js": "^2.x",
    "@supabase/auth-helpers-nextjs": "^0.x",
    "lucide-react": "latest"
  }
}
```

---

## Commandes pour démarrer

```bash
npx create-next-app@14 mirakl-sav --typescript --tailwind --app
cd mirakl-sav
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs lucide-react
```

---

## Assets

- **Police DM Sans** : `https://fonts.google.com/specimen/DM+Sans` (weights 300–700)
- **Police DM Mono** : `https://fonts.google.com/specimen/DM+Mono` (weights 400–500)
- Icônes : SVG inline dans le prototype → à remplacer par **Lucide React**
- Graphiques : SVG custom → à remplacer par **Recharts** ou **Nivo** (optionnel)

---

## Fichiers dans ce package

| Fichier | Description |
|---|---|
| `README.md` | Ce document — référence complète pour l'implémentation |
| `SAV Dashboard.html` | Prototype haute fidélité — référence visuelle interactive |
| `types.ts` | Types TypeScript extraits |
| `schema.sql` | Schéma Supabase complet avec RLS |
| `middleware.ts` | Middleware Next.js de protection des routes |
