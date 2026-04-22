// lib/types.ts — Mirakl SAV Dashboard
// Généré automatiquement depuis le prototype de design

export type UserRole = 'vendeur' | 'marketplace';

export interface Profile {
  id: string;
  role: UserRole;
  company_name: string;
  email: string;
  avatar: string;
  marketplace_name?: string;
}

export type TicketStatus = 'open' | 'pending' | 'escalated' | 'resolved';
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
export type TicketCategory =
  | 'Livraison'
  | 'Produit'
  | 'Remboursement'
  | 'Échange'
  | 'Facturation'
  | 'Annulation';
export type MarketplaceName = 'Amazon' | 'Fnac' | 'Cdiscount' | 'Darty';

export interface Ticket {
  id: string;
  vendor_id?: string;
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

export type AgentActionType =
  | 'action'
  | 'decision'
  | 'reply'
  | 'escalation'
  | 'resolved';

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
  resolved_by?: string;
  created_at: string;
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

export interface MerchantPerf {
  name: string;
  tickets: number;
  ia: number;
  sla: number;
  montant: number;
}

export interface DistributionItem {
  label: string;
  value: number;
  pct: number;
  color: string;
}

export interface MerchantData {
  name: string;
  short: string;
  kpis: MerchantKpis;
  distribution: DistributionItem[];
  perf: MerchantPerf[];
  attention: Partial<Ticket>[];
  evolution: { v: number }[];
}

export type FluxEventType = 'in_progress' | 'resolved' | 'validation';

export interface FluxEvent {
  id: string;
  type: FluxEventType;
  ticket_id: string;
  client: string;
  action: string;
  detail: string;
  amount?: number;
  created_at: string;
}

// Tweaks (design tokens modifiables)
export interface DashboardTweaks {
  accentColor: string;   // default: '#3b82f6'
  agentColor: string;    // default: '#8b5cf6'
  companyName: string;
  agentName: string;
}
