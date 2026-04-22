// ── SUPABASE BRIDGE ──────────────────────────────────────────────────────────
// Branche le dashboard HTML statique sur Supabase.
// ⚠️ Remplacer SUPABASE_URL et SUPABASE_ANON_KEY par vos valeurs.

const SUPABASE_URL = 'https://umywimqmjzhjapvtbiwx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IvEYg3-FhDIR5oplY1ZXpA_WsCeRYHf';

// ── Client Supabase ────────────────────────────────────────────
let _supabase = null;
function getSupabase() {
  if (!_supabase && window.supabase) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

// ── Utils ──────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

function mapTicket(t) {
  return {
    id: t.id, client: t.client, email: t.email, marketplace: t.marketplace,
    subject: t.subject, status: t.status, priority: t.priority,
    category: t.category || 'Produit',
    created: t.created_at ? new Date(t.created_at).toLocaleString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '',
    updated: t.updated_at ? new Date(t.updated_at).toLocaleString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '',
    assignee: t.assignee || 'Agent IA',
    orderRef: t.order_ref || '',
    sla: t.sla || 'Respecté',
    messages: (t.messages || []).map(m => ({
      role: m.role, ai: m.is_ai, text: m.text,
      ts: m.created_at ? new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
    })),
  };
}

function mapAction(a) {
  return { id: a.id, ts: timeAgo(a.created_at), action: a.action, ticket: a.ticket_id, type: a.type, icon: a.icon || '⚙️' };
}

function mapValidation(v) {
  return {
    id: v.id, ticket: v.ticket_id, client: v.client, marketplace: v.marketplace,
    amount: Number(v.amount), type: v.type, context: v.context || '',
    agentQuote: v.agent_quote || '', priority: v.priority || 'medium', sla: v.sla || 'Respecté',
  };
}

// ── Global data store (mutated, triggers re-renders via forceUpdate) ────────
window.__SUPA_DATA = {
  tickets: [], actions: [], validations: [], fluxEvents: [], merchants: {},
  loaded: false, error: null,
};

// ── Loaders ────────────────────────────────────────────────────
async function loadAllData() {
  const sb = getSupabase();
  if (!sb) { window.__SUPA_DATA.error = 'Supabase non configuré'; return; }

  try {
    // Tickets + messages
    const { data: tData } = await sb.from('tickets').select('*, messages(*)').order('created_at', { ascending: false });
    window.__SUPA_DATA.tickets = (tData || []).map(mapTicket);

    // Agent actions
    const { data: aData } = await sb.from('agent_actions').select('*').order('created_at', { ascending: false }).limit(50);
    window.__SUPA_DATA.actions = (aData || []).map(mapAction);

    // Validations pending
    const { data: vData } = await sb.from('validations').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    window.__SUPA_DATA.validations = (vData || []).map(mapValidation);

    // Flux = agent_actions as events
    window.__SUPA_DATA.fluxEvents = (aData || []).slice(0, 15).map(a => {
      const typeMap = { resolved: 'resolved', escalation: 'validation', decision: 'in_progress', action: 'in_progress', reply: 'resolved' };
      return { id: a.id, type: typeMap[a.type] || 'in_progress', ts: timeAgo(a.created_at), ticket: a.ticket_id, client: '', action: a.action, detail: '' };
    });

    window.__SUPA_DATA.loaded = true;
  } catch (e) {
    console.error('loadAllData error:', e);
    window.__SUPA_DATA.error = e.message;
  }
}

// ── Write helpers (called from dashboard) ──────────────────────
async function supaApproveValidation(id) {
  const sb = getSupabase(); if (!sb) return;
  await sb.from('validations').update({ status: 'approved' }).eq('id', id);
}
async function supaRejectValidation(id, reason) {
  const sb = getSupabase(); if (!sb) return;
  await sb.from('validations').update({ status: 'rejected', reject_reason: reason }).eq('id', id);
}
async function supaSendMessage(ticketId, text, role, isAi) {
  const sb = getSupabase(); if (!sb) return;
  await sb.from('messages').insert({ ticket_id: ticketId, role: role || 'human', is_ai: isAi || false, text });
}

// ── Realtime subscriptions ─────────────────────────────────────
function subscribeRealtime(onUpdate) {
  const sb = getSupabase(); if (!sb) return;
  ['tickets', 'messages', 'agent_actions', 'validations'].forEach(table => {
    sb.channel(`${table}-rt`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        loadAllData().then(onUpdate);
      })
      .subscribe();
  });
}
