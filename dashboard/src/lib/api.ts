import type {
  Ticket,
  AgentEvent,
  HumanValidation,
  IngestRequest,
  IngestResponse,
  ValidationApproveRequest,
  ValidationRejectRequest,
  OverrideRequest,
  TicketStatus,
  TicketType,
  ValidationStatus,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} — ${path}\n${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Tickets ─────────────────────────────────────────────────────────────────

export const api = {
  health: () => request<{ status: string }>("/health"),

  listTickets: (params?: { status?: TicketStatus; type?: TicketType; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.type) q.set("type", params.type);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<Ticket[]>(`/tickets${qs ? `?${qs}` : ""}`);
  },

  getTicket: (id: string) => request<Ticket>(`/tickets/${id}`),

  getTicketEvents: (id: string) => request<AgentEvent[]>(`/tickets/${id}/events`),

  ingestTicket: (body: IngestRequest) =>
    request<IngestResponse>("/tickets/ingest", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  overrideTicket: (id: string, body: OverrideRequest) =>
    request<{ ok: boolean; status: TicketStatus }>(`/tickets/${id}/override`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ── Validations ───────────────────────────────────────────────────────────

  listValidations: (status: ValidationStatus = "pending") =>
    request<HumanValidation[]>(`/validations?status=${status}`),

  getValidation: (id: string) => request<HumanValidation>(`/validations/${id}`),

  approveValidation: (id: string, body: ValidationApproveRequest = {}) =>
    request<{ ok: boolean; approved_amount: number }>(
      `/validations/${id}/approve`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  rejectValidation: (id: string, body: ValidationRejectRequest) =>
    request<{ ok: boolean }>(`/validations/${id}/reject`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ── SSE stream (client-side only) ─────────────────────────────────────────

export function subscribeToStream(
  onEvent: (event: AgentEvent) => void,
  onError?: (err: Event) => void
): () => void {
  const es = new EventSource(`${API_URL}/stream`);
  es.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data) as AgentEvent);
    } catch {
      // ignore malformed payloads
    }
  };
  if (onError) es.onerror = onError;
  return () => es.close();
}

export { API_URL };
