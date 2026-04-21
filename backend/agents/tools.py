"""
Shared tools available to all agents.
Each tool returns a dict that gets passed back to GPT-4o as a tool result.
"""
from data.loader import get_orders, get_customers, get_merchant, get_carriers
from services import event_bus
from models import AgentEvent, HumanValidation
from datetime import datetime


def get_order_details(order_id: str) -> dict:
    orders = get_orders()
    return orders.get(order_id, {"error": "Order not found"})


def get_customer_history(customer_id: str) -> dict:
    customers = get_customers()
    customer = customers.get(customer_id, {"error": "Customer not found"})
    orders = get_orders()
    customer_orders = [o for o in orders.values() if o["customer_id"] == customer_id]
    return {"customer": customer, "order_count": len(customer_orders)}


def get_merchant_policy() -> dict:
    return get_merchant()


def check_carrier_status(tracking_number: str) -> dict:
    carriers = get_carriers()
    return carriers.get(tracking_number, {"error": "Tracking not found", "status": "unknown"})


def generate_return_label(order_id: str) -> dict:
    return {
        "label_url": f"https://mock-labels.eugenia.fr/{order_id}.pdf",
        "label_code": f"RET-{order_id[:8].upper()}",
        "instructions": "Déposez le colis dans n'importe quel point relais Colissimo sous 7 jours."
    }


def send_customer_email(customer_id: str, subject: str, message: str) -> dict:
    customers = get_customers()
    customer = customers.get(customer_id, {})
    return {
        "sent": True,
        "to": customer.get("email", "unknown"),
        "subject": subject,
        "preview": message[:100]
    }


async def emit_event(ticket_id: str, agent: str, action: str, reasoning: str,
                     data: dict = None, requires_human: bool = False) -> dict:
    event = AgentEvent(
        ticket_id=ticket_id,
        agent=agent,
        action=action,
        reasoning=reasoning,
        data=data or {},
        requires_human=requires_human,
    )
    await event_bus.publish(event)
    return {"emitted": True, "event_id": event.id}


async def request_refund_validation(ticket_id: str, order_id: str,
                                    amount: float, reason: str,
                                    agent_reasoning: str) -> dict:
    from services import db
    validation = HumanValidation(
        ticket_id=ticket_id,
        amount=amount,
        reason=reason,
        agent_reasoning=agent_reasoning,
    )
    db.save_validation(validation.model_dump())
    db.update_ticket(ticket_id, {"status": "awaiting_human", "human_validation_id": validation.id})

    await emit_event(
        ticket_id=ticket_id,
        agent="system",
        action="validation_requested",
        reasoning=f"Validation humaine requise : remboursement de {amount}€. {reason}",
        data={"validation_id": validation.id, "amount": amount},
        requires_human=True,
    )
    return {"validation_id": validation.id, "status": "pending"}
