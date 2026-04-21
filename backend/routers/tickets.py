from fastapi import APIRouter, BackgroundTasks, HTTPException
from models import Ticket, IngestRequest, IngestResponse, Customer, Order, AgentEvent, OverrideRequest
from services import event_bus, db
from data.loader import get_orders, get_customers

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

    db.save_ticket(ticket.model_dump())
    background_tasks.add_task(_run_orchestrator, ticket.id, body.customer_message, body.order_id)

    return IngestResponse(ticket_id=ticket.id)


@router.get("")
async def list_tickets(status: str | None = None, type: str | None = None, limit: int = 50):
    return db.list_tickets(status=status, type=type, limit=limit)


@router.get("/{ticket_id}")
async def get_ticket(ticket_id: str):
    ticket = db.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.get("/{ticket_id}/events")
async def get_ticket_events(ticket_id: str):
    return db.list_events(ticket_id)


@router.post("/{ticket_id}/override")
async def override_ticket(ticket_id: str, body: OverrideRequest):
    ticket = db.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    new_status = "escalated" if body.action in ("pause", "take_over") else "in_progress"

    if body.action == "pause":
        event_bus.paused_tickets.add(ticket_id)
    elif body.action == "resume":
        event_bus.paused_tickets.discard(ticket_id)
    elif body.action == "take_over":
        event_bus.paused_tickets.add(ticket_id)

    db.update_ticket(ticket_id, {"status": new_status})

    event = AgentEvent(
        ticket_id=ticket_id,
        agent="human",
        action=f"human_{body.action}",
        reasoning=body.note or f"Marchand a effectué l'action : {body.action}",
    )
    await event_bus.publish(event)
    return {"ok": True, "status": new_status}


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
        db.update_ticket(ticket_id, {"status": "escalated"})
        await event_bus.publish(event)
