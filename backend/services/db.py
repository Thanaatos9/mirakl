from supabase import create_client, Client
from config import get_settings
from functools import lru_cache


@lru_cache
def get_db() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_key)


# ── Tickets ───────────────────────────────────────────────────────────────────

def save_ticket(ticket: dict) -> None:
    get_db().table("tickets").upsert(ticket).execute()


def get_ticket(ticket_id: str) -> dict | None:
    res = get_db().table("tickets").select("*").eq("id", ticket_id).single().execute()
    return res.data


def list_tickets(status: str = None, type: str = None, limit: int = 50) -> list:
    query = get_db().table("tickets").select("*").order("created_at", desc=True).limit(limit)
    if status:
        query = query.eq("status", status)
    if type:
        query = query.eq("type", type)
    return query.execute().data


def update_ticket(ticket_id: str, fields: dict) -> None:
    get_db().table("tickets").update(fields).eq("id", ticket_id).execute()


# ── Agent events ──────────────────────────────────────────────────────────────

def save_event(event: dict) -> None:
    get_db().table("agent_events").insert(event).execute()


def list_events(ticket_id: str) -> list:
    return get_db().table("agent_events").select("*").eq("ticket_id", ticket_id).order("timestamp").execute().data


# ── Validations ───────────────────────────────────────────────────────────────

def save_validation(validation: dict) -> None:
    get_db().table("validations").upsert(validation).execute()


def get_validation(validation_id: str) -> dict | None:
    res = get_db().table("validations").select("*").eq("id", validation_id).single().execute()
    return res.data


def list_validations(status: str = "pending") -> list:
    return get_db().table("validations").select("*").eq("status", status).execute().data


def update_validation(validation_id: str, fields: dict) -> None:
    get_db().table("validations").update(fields).eq("id", validation_id).execute()
