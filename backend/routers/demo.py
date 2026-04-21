import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from data.loader import get_scenarios, get_orders, get_customers
from models import Ticket, Customer, Order, AgentEvent, HumanValidation
from services import db, event_bus

router = APIRouter(prefix="/demo")


@router.get("/scenarios")
async def list_scenarios():
    scenarios = get_scenarios()
    return [{"id": k, "name": v["name"], "description": v["description"]} for k, v in scenarios.items()]


@router.post("/load-scenario/{scenario_id}")
async def load_scenario(scenario_id: str, background_tasks: BackgroundTasks):
    scenarios = get_scenarios()
    if scenario_id not in scenarios:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")

    scenario = scenarios[scenario_id]
    orders = get_orders()
    customers = get_customers()
    created_tickets = []

    for ticket_def in scenario["tickets"]:
        order_id = ticket_def["order_id"]
        order_data = orders.get(order_id)
        if not order_data:
            continue
        customer_data = customers.get(order_data["customer_id"])
        if not customer_data:
            continue

        ticket = Ticket(
            customer=Customer(**customer_data),
            order=Order(**order_data),
            raw_message=ticket_def["message"],
            type=ticket_def.get("type", "unknown"),
        )
        db.save_ticket(ticket.model_dump())
        created_tickets.append(ticket.id)

    return {"ok": True, "scenario": scenario_id, "tickets_created": created_tickets}


@router.post("/reset")
async def reset_demo():
    db.get_db().table("tickets").delete().neq("id", "").execute()
    db.get_db().table("validations").delete().neq("id", "").execute()
    db.get_db().table("agent_events").delete().neq("id", "").execute()
    event_bus.paused_tickets.clear()
    return {"ok": True, "message": "Demo state reset"}


@router.post("/simulate-flow/{ticket_id}")
async def simulate_flow(ticket_id: str, delay_ms: int = 800):
    """
    Simule un flow agent réaliste sans appeler OpenAI.
    Émet une séquence d'AgentEvent et crée une HumanValidation à la fin.
    Utile pour tester le dashboard de bout en bout.
    """
    if ticket_id not in event_bus.tickets:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket = event_bus.tickets[ticket_id]
    ticket_type = ticket.get("type", "unknown")
    total = float(ticket["order"]["total_amount"])
    order_id = ticket["order"]["id"]
    customer_name = ticket["customer"]["name"]

    async def _pub(agent: str, action: str, reasoning: str, data: dict | None = None, requires_human: bool = False):
        ev = AgentEvent(
            ticket_id=ticket_id,
            agent=agent,
            action=action,
            reasoning=reasoning,
            data=data or {},
            requires_human=requires_human,
        )
        await event_bus.publish(ev)

    specialist_by_type = {
        "defective": "defect",
        "return": "return",
        "not_received": "delivery",
        "unshipped": "shipping",
        "cancellation": "cancellation",
    }
    specialist = specialist_by_type.get(ticket_type, "defect")

    # Mise en cours
    ticket["status"] = "in_progress"

    await _pub(
        "orchestrator",
        "classify",
        f"Message de {customer_name} analysé. Type détecté : {ticket_type}. Je route vers l'agent {specialist}.",
        data={"type": ticket_type, "confidence": 92},
    )
    ticket["confidence_score"] = 92
    await asyncio.sleep(delay_ms / 1000)

    await _pub(
        specialist,
        "fetch_order",
        f"Commande {order_id} récupérée. Montant : {total}€. Transporteur : {ticket['order']['shipping']['carrier']}.",
        data={"order_id": order_id, "total": total},
    )
    await asyncio.sleep(delay_ms / 1000)

    await _pub(
        specialist,
        "check_customer_history",
        f"{customer_name} — {ticket['customer'].get('order_count', 0)} commandes précédentes. Aucun historique de fraude.",
        data={"order_count": ticket["customer"].get("order_count", 0)},
    )
    await asyncio.sleep(delay_ms / 1000)

    reasoning_map = {
        "defective": f"Produit défectueux confirmé. Conformément à la politique marchand, je propose un remboursement intégral de {total}€.",
        "return": f"Retour hors garantie partielle possible. Je propose un remboursement de {total * 0.9:.2f}€ (frais de retour déduits).",
        "not_received": f"Colis marqué livré mais client affirme non-réception. Je propose un remboursement intégral de {total}€.",
        "unshipped": f"Commande non expédiée après SLA dépassé. Je propose un remboursement intégral de {total}€.",
        "cancellation": f"Annulation demandée avant expédition. Remboursement intégral de {total}€.",
    }
    proposal = reasoning_map.get(ticket_type, reasoning_map["defective"])
    refund_amount = total * 0.9 if ticket_type == "return" else total

    await _pub(
        specialist,
        "propose_refund",
        proposal,
        data={"proposed_amount": round(refund_amount, 2)},
    )
    await asyncio.sleep(delay_ms / 1000)

    validation = HumanValidation(
        ticket_id=ticket_id,
        amount=round(refund_amount, 2),
        reason=f"Remboursement {ticket_type} — {order_id}",
        agent_reasoning=proposal,
    )
    event_bus.validations[validation.id] = validation.model_dump()
    ticket["status"] = "awaiting_human"
    ticket["human_validation_id"] = validation.id

    await _pub(
        "system",
        "validation_requested",
        f"Validation humaine requise : remboursement de {round(refund_amount, 2)}€. Au-dessus du seuil d'auto-approbation.",
        data={"validation_id": validation.id, "amount": round(refund_amount, 2)},
        requires_human=True,
    )

    return {
        "ok": True,
        "ticket_id": ticket_id,
        "validation_id": validation.id,
        "events_emitted": 5,
    }
