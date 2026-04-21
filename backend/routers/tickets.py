from fastapi import APIRouter, BackgroundTasks, HTTPException
from models import (
    Ticket, IngestRequest, IngestResponse,
    Customer, Order, AgentEvent, OverrideRequest
)
from services import event_bus
from data.loader import get_orders, get_customers
from datetime import datetime

router = APIRouter(prefix="/tickets")


@router.post("/ingest", response_model=IngestResponse)
async def ingest_ticket(body: IngestRequest, background_tasks: BackgroundTasks):
    orders = get_orders()
    customers = get_customers()

    if body.order_id not in orders:
        raise HTTPException(status_code=404, detail="Order not found")

    order_data = orders[body.order_id]
    customer_data = customers.get(order_data["customer_id"])
    if not customer_data:
        raise HTTPException(status_code=404, detail="Customer not found")

    ticket = Ticket(
        customer=Customer(**customer_data),
        order=Order(**order_data),
        raw_message=body.customer_message,
    )

    event_bus.tickets[ticket.id] = ticket.model_dump()

    background_tasks.add_task(_run_orchestrator, ticket.id, body.customer_message, body.order_id)

    return IngestResponse(ticket_id=ticket.id)


@router.get("")
async def list_tickets(status: str | None = None, type: str | None = None, limit: int = 50):
    all_tickets = list(event_bus.tickets.values())
    if status:
        all_tickets = [t for t in all_tickets if t["status"] == status]
    if type:
        all_tickets = [t for t in all_tickets if t["type"] == type]
    return sorted(all_tickets, key=lambda t: t["created_at"], reverse=True)[:limit]


@router.get("/{ticket_id}")
async def get_ticket(ticket_id: str):
    if ticket_id not in event_bus.tickets:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return event_bus.tickets[ticket_id]


@router.get("/{ticket_id}/events")
async def get_ticket_events(ticket_id: str):
    if ticket_id not in event_bus.tickets:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return event_bus.tickets[ticket_id]["agent_events"]


@router.post("/{ticket_id}/override")
async def override_ticket(ticket_id: str, body: OverrideRequest):
    if ticket_id not in event_bus.tickets:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if body.action == "pause":
        event_bus.paused_tickets.add(ticket_id)
        event_bus.tickets[ticket_id]["status"] = "escalated"
    elif body.action == "resume":
        event_bus.paused_tickets.discard(ticket_id)
        event_bus.tickets[ticket_id]["status"] = "in_progress"
    elif body.action == "take_over":
        event_bus.paused_tickets.add(ticket_id)
        event_bus.tickets[ticket_id]["status"] = "escalated"

    event = AgentEvent(
        ticket_id=ticket_id,
        agent="human",
        action=f"human_{body.action}",
        reasoning=body.note or f"Marchand a effectué l'action : {body.action}",
        requires_human=False,
    )
    await event_bus.publish(event)
    return {"ok": True, "status": event_bus.tickets[ticket_id]["status"]}


async def _run_orchestrator(ticket_id: str, message: str, order_id: str):
    from agents.orchestrator import run as orchestrator_run
    try:
        await orchestrator_run(ticket_id, message, order_id)
    except Exception as e:
        event = AgentEvent(
            ticket_id=ticket_id,
            agent="orchestrator",
            action="error",
            reasoning=f"Erreur inattendue : {str(e)}. Escalade vers un humain.",
            requires_human=True,
        )
        event_bus.tickets[ticket_id]["status"] = "escalated"
        await event_bus.publish(event)
