"""
CancellationAgent — gère les annulations après expédition.
TODO P3 : enrichir avec request_carrier_intercept
"""
from agents import tools as t
from services import event_bus, db


async def run(ticket_id: str, order_id: str, customer_id: str):
    order = t.get_order_details(order_id)
    tracking = order.get("shipping", {}).get("tracking_number")

    await t.emit_event(
        ticket_id=ticket_id,
        agent="cancellation",
        action="checking_carrier_status",
        reasoning="Vérification si le colis peut encore être intercepté...",
        data={"tracking": tracking}
    )

    carrier_status = t.check_carrier_status(tracking or "")
    status = carrier_status.get("status", "unknown")

    if status == "in_transit":
        await t.emit_event(
            ticket_id=ticket_id,
            agent="cancellation",
            action="carrier_intercept_requested",
            reasoning=f"Colis en transit chez {carrier_status.get('carrier')}. Demande d'interception envoyée au transporteur.",
            data={"carrier": carrier_status.get("carrier")}
        )
        await t.send_customer_email(
            customer_id=customer_id,
            subject="Annulation en cours",
            message="Votre demande d'annulation est en cours. Nous avons contacté le transporteur pour intercepter le colis. Vous serez remboursé dès confirmation."
        )
        await t.request_refund_validation(
            ticket_id=ticket_id,
            order_id=order_id,
            amount=order.get("total_amount", 0),
            reason="Annulation commande — interception transporteur en cours",
            agent_reasoning=f"Interception demandée chez {carrier_status.get('carrier')}. Remboursement de {order.get('total_amount')}€ à valider dès confirmation retour colis."
        )
    else:
        db.update_ticket(ticket_id, {"status": "awaiting_human"})
        await t.emit_event(
            ticket_id=ticket_id,
            agent="cancellation",
            action="escalated_to_human",
            reasoning=f"Colis déjà livré ou statut inconnu ({status}). Intervention humaine requise pour traiter l'annulation.",
            requires_human=True,
        )
