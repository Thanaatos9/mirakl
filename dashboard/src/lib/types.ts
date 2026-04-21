// Types alignés sur backend/models.py

export type ShippingStatus = "pending" | "shipped" | "delivered" | "lost";

export interface ShippingInfo {
  carrier: string;
  tracking_number?: string | null;
  estimated_delivery?: string | null;
  status: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  status: OrderStatus;
  items: OrderItem[];
  shipping: ShippingInfo;
  merchant_id: string;
  customer_id: string;
  total_amount: number;
  created_at: string;
  sla_deadline: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  is_vip?: boolean;
  order_count?: number;
}

export interface MerchantPolicy {
  return_window_days: number;
  sla_shipping_hours: number;
  refund_threshold: number;
  carriers: string[];
}

export interface Merchant {
  id: string;
  name: string;
  policy: MerchantPolicy;
}

export type AgentName =
  | "orchestrator"
  | "shipping"
  | "delivery"
  | "defect"
  | "return"
  | "cancellation"
  | "human";

export interface AgentEvent {
  id: string;
  timestamp: string;
  ticket_id: string;
  agent: AgentName | string;
  action: string;
  reasoning: string;
  data?: Record<string, unknown>;
  requires_human?: boolean;
}

export type ValidationStatus = "pending" | "approved" | "rejected";

export interface HumanValidation {
  id: string;
  ticket_id: string;
  created_at: string;
  status: ValidationStatus;
  amount: number;
  reason: string;
  agent_reasoning: string;
  approved_amount?: number | null;
  rejection_reason?: string | null;
  resolved_at?: string | null;
}

export type TicketType =
  | "unshipped"
  | "not_received"
  | "defective"
  | "cancellation"
  | "return"
  | "unknown";

export type TicketStatus =
  | "pending"
  | "in_progress"
  | "resolved"
  | "escalated"
  | "awaiting_human";

export interface Ticket {
  id: string;
  created_at: string;
  customer: Customer;
  order: Order;
  type: TicketType;
  raw_message: string;
  status: TicketStatus;
  confidence_score: number;
  agent_events: AgentEvent[];
  resolution?: string | null;
  human_validation_id?: string | null;
}

// ── API request/response schemas ────────────────────────────────────────────

export interface IngestRequest {
  customer_message: string;
  order_id: string;
}

export interface IngestResponse {
  ticket_id: string;
  status: string;
}

export interface ValidationApproveRequest {
  approved_amount?: number;
}

export interface ValidationRejectRequest {
  reason: string;
}

export type OverrideAction = "pause" | "take_over" | "resume";

export interface OverrideRequest {
  action: OverrideAction;
  note?: string;
}
