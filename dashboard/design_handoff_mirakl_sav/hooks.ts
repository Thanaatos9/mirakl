// hooks/ — Mirakl SAV
// Hooks React pour Next.js 14 + Supabase
// Copier chaque hook dans son fichier dédié : hooks/useTickets.ts etc.

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState, useCallback } from 'react';
import type { Ticket, AgentAction, Validation, FluxEvent } from './types';

// ── useTickets ────────────────────────────────────────────────────────────────
export function useTickets() {
  const supabase = createClientComponentClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, messages(*)')
      .order('created_at', { ascending: false });

    if (error) { setError(error.message); return; }
    setTickets(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel('tickets-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tickets',
      }, fetchTickets)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchTickets, supabase]);

  const updateStatus = async (id: string, status: Ticket['status']) => {
    await supabase.from('tickets').update({ status }).eq('id', id);
  };

  return { tickets, loading, error, refetch: fetchTickets, updateStatus };
}

// ── useTicket (single) ────────────────────────────────────────────────────────
export function useTicket(id: string) {
  const supabase = createClientComponentClient();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetch = async () => {
      const { data } = await supabase
        .from('tickets')
        .select('*, messages(*)')
        .eq('id', id)
        .single();
      setTicket(data);
      setLoading(false);
    };
    fetch();

    // Realtime messages
    const channel = supabase
      .channel(`ticket-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `ticket_id=eq.${id}`,
      }, (payload) => {
        setTicket(prev => prev ? {
          ...prev,
          messages: [...(prev.messages ?? []), payload.new as any],
        } : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, supabase]);

  const sendMessage = async (text: string, role: 'client' | 'human', isAi = false) => {
    await supabase.from('messages').insert({
      ticket_id: id,
      role,
      is_ai: isAi,
      text,
    });
  };

  return { ticket, loading, sendMessage };
}

// ── useAgentActions ───────────────────────────────────────────────────────────
export function useAgentActions() {
  const supabase = createClientComponentClient();
  const [actions, setActions] = useState<AgentAction[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('agent_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setActions(data ?? []);
    };
    fetch();

    const channel = supabase
      .channel('agent-actions-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_actions',
      }, (payload) => {
        setActions(prev => [payload.new as AgentAction, ...prev.slice(0, 49)]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  return actions;
}

// ── useAgentStream (SSE) ──────────────────────────────────────────────────────
export function useAgentStream() {
  const [events, setEvents] = useState<FluxEvent[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;

    const es = new EventSource('/api/stream');

    es.onmessage = (e) => {
      try {
        const event: FluxEvent = JSON.parse(e.data);
        setEvents(prev => [event, ...prev.slice(0, 49)]);
      } catch { /* ignore malformed events */ }
    };

    es.onerror = () => {
      es.close();
      // Reconnexion automatique après 3s
      setTimeout(() => {
        if (!paused) setEvents(prev => [...prev]); // force re-render → re-subscribe
      }, 3000);
    };

    return () => es.close();
  }, [paused]);

  return { events, paused, setPaused };
}

// ── useValidations ────────────────────────────────────────────────────────────
export function useValidations() {
  const supabase = createClientComponentClient();
  const [validations, setValidations] = useState<Validation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('validations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setValidations(data ?? []);
      setLoading(false);
    };
    fetch();

    const channel = supabase
      .channel('validations-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'validations',
      }, fetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const approve = async (id: string) => {
    await supabase
      .from('validations')
      .update({ status: 'approved' })
      .eq('id', id);
    setValidations(prev => prev.filter(v => v.id !== id));
  };

  const reject = async (id: string, reason: string) => {
    await supabase
      .from('validations')
      .update({ status: 'rejected', reject_reason: reason })
      .eq('id', id);
    setValidations(prev => prev.filter(v => v.id !== id));
  };

  return { validations, loading, approve, reject };
}

// ── useMerchantKpis ───────────────────────────────────────────────────────────
export function useMerchantKpis(marketplace?: string) {
  const supabase = createClientComponentClient();
  const [kpis, setKpis] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      let query = supabase.from('merchant_kpis').select('*');
      if (marketplace) query = query.eq('marketplace', marketplace);
      const { data } = await query;
      // Agréger ou retourner par marketplace
      const map: Record<string, any> = {};
      (data ?? []).forEach(row => { map[row.marketplace] = row; });
      setKpis(map);
      setLoading(false);
    };
    fetch();
  }, [marketplace, supabase]);

  return { kpis, loading };
}
