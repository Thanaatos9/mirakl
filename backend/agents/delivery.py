"""
DeliveryAgent — gère les colis expédiés mais non reçus.
TODO P2 : implémenter avec check_carrier_status + open_loss_declaration
"""
from agents import tools as t
from services import event_bus


async def run(ticket_id: str, order_id: str, customer_id: str):
    order = t.get_order_details(order_id)
    tracking = order.get("shipping", {}).get("tracking_number")

    await t.emit_event(
        ticket_id=ticket_id,
        agent="delivery",
        action="checking_carrier",
        reasoning="Vérification du statut transporteur en cours...",
        data={"tracking": tracking}
    )

    carrier_status = t.check_carrier_status(tracking or "")
    status = carrier_status.get("status", "unknown")

    if status == "lost":
        await t.request_refund_validation(
            ticket_id=ticket_id,
            order_id=order_id,
            amount=order.get("total_amount", 0),
            reason="Colis déclaré perdu par le transporteur",
            agent_reasoning=f"Le transporteur {carrier_status.get('carrier')} indique : \"{carrier_status.get('last_event')}\". Remboursement total recommandé."
        )
    elif status == "in_transit":
        await t.send_customer_email(
            customer_id=customer_id,
            subject="Votre colis est en route",
            message=f"Votre colis est en cours d'acheminement. Dernier statut : {carrier_status.get('last_event')}."
        )
        await t.emit_event(
            ticket_id=ticket_id,
            agent="delivery",
            action="customer_notified",
            reasoning=f"Colis en transit — client informé. Statut : {carrier_status.get('last_event')}",
        )
        event_bus.tickets[ticket_id]["status"] = "resolved"
    else:
        event_bus.tickets[ticket_id]["status"] = "awaiting_human"
        await t.emit_event(
            ticket_id=ticket_id,
            agent="delivery",
            action="escalated_to_human",
            reasoning=f"Statut transporteur ambigu ({status}). Intervention humaine recommandée.",
            requires_human=True,
        )
