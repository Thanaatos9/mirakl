from fastapi import APIRouter
from datetime import datetime
from services import db
from data.loader import get_merchant

router = APIRouter(prefix="/marketplace")

MERCHANT_NAMES: dict[str, str] = {
    "merchant-001": "SportPlus Pro",
    # Extensible quand d'autres marchands seront ajoutés
}


def _merchant_name(merchant_id: str) -> str:
    return MERCHANT_NAMES.get(merchant_id, merchant_id)


def _is_sla_breached(sla_deadline: str) -> bool:
    try:
        return datetime.fromisoformat(sla_deadline) < datetime.utcnow()
    except Exception:
        return False


@router.get("/stats")
async def get_marketplace_stats():
    """
    KPIs globaux agrégés pour la vue Marketplace.
    Aucune donnée client nominative n'est exposée.
    """
    tickets = db.list_tickets(limit=10_000)

    total = len(tickets)
    resolved = sum(1 for t in tickets if t.get("status") == "resolved")
    escalated = sum(1 for t in tickets if t.get("status") in ("escalated", "awaiting_human"))
    sla_breaches = sum(1 for t in tickets if _is_sla_breached(t.get("order", {}).get("sla_deadline", "")))
    total_amount = sum(t.get("order", {}).get("total_amount", 0) for t in tickets)
    ai_resolution_rate = round((resolved / total * 100) if total > 0 else 0, 1)

    # Distribution par type
    type_counts: dict[str, int] = {}
    for t in tickets:
        ttype = t.get("type", "unknown")
        type_counts[ttype] = type_counts.get(ttype, 0) + 1

    # Distribution par statut
    status_counts: dict[str, int] = {}
    for t in tickets:
        s = t.get("status", "unknown")
        status_counts[s] = status_counts.get(s, 0) + 1

    return {
        "total_tickets": total,
        "resolved": resolved,
        "escalated": escalated,
        "sla_breaches": sla_breaches,
        "total_amount": round(total_amount, 2),
        "ai_resolution_rate": ai_resolution_rate,
        "by_type": type_counts,
        "by_status": status_counts,
    }


@router.get("/merchants")
async def get_merchant_performance():
    """
    Performance agrégée par marchand.
    """
    tickets = db.list_tickets(limit=10_000)

    merchant_data: dict[str, dict] = {}

    for t in tickets:
        mid = t.get("order", {}).get("merchant_id", "unknown")
        if mid not in merchant_data:
            merchant_data[mid] = {
                "merchant_id": mid,
                "merchant_name": _merchant_name(mid),
                "total": 0,
                "resolved": 0,
                "escalated": 0,
                "awaiting_human": 0,
                "sla_breaches": 0,
                "total_amount": 0.0,
            }

        d = merchant_data[mid]
        d["total"] += 1
        if t.get("status") == "resolved":
            d["resolved"] += 1
        if t.get("status") == "escalated":
            d["escalated"] += 1
        if t.get("status") == "awaiting_human":
            d["awaiting_human"] += 1
        if _is_sla_breached(t.get("order", {}).get("sla_deadline", "")):
            d["sla_breaches"] += 1
        d["total_amount"] += t.get("order", {}).get("total_amount", 0)

    result = []
    for d in merchant_data.values():
        total = d["total"]
        d["resolution_rate"] = round((d["resolved"] / total * 100) if total > 0 else 0, 1)
        d["total_amount"] = round(d["total_amount"], 2)
        result.append(d)

    return result


@router.get("/tickets")
async def list_marketplace_tickets(
    status: str | None = None,
    type: str | None = None,
    limit: int = 50,
):
    """
    Liste allégée des tickets pour les opérateurs Marketplace.
    Les données nominatives client (email, raw_message) sont masquées.
    """
    tickets = db.list_tickets(status=status, type=type, limit=limit)

    sanitized = []
    for t in tickets:
        customer = t.get("customer", {})
        sanitized.append({
            "id": t.get("id"),
            "created_at": t.get("created_at"),
            "type": t.get("type"),
            "status": t.get("status"),
            "confidence_score": t.get("confidence_score"),
            "resolution": t.get("resolution"),
            # Client anonymisé : prénom + initiale, pas d'email
            "customer_display": _anonymize_name(customer.get("name", "—")),
            "customer_is_vip": customer.get("is_vip", False),
            "order": {
                "id": t.get("order", {}).get("id"),
                "merchant_id": t.get("order", {}).get("merchant_id"),
                "merchant_name": _merchant_name(t.get("order", {}).get("merchant_id", "")),
                "total_amount": t.get("order", {}).get("total_amount"),
                "sla_deadline": t.get("order", {}).get("sla_deadline"),
                "shipping_status": t.get("order", {}).get("shipping", {}).get("status"),
            },
            # raw_message NON exposé
        })

    return sanitized


def _anonymize_name(name: str) -> str:
    """Prénom + initiale du nom. Ex: 'Marie Dupont' → 'Marie D.'"""
    parts = name.strip().split()
    if len(parts) <= 1:
        return name
    return f"{parts[0]} {parts[-1][0]}."
