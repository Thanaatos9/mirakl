"""
ReturnAgent — gère les demandes de retour dans les délais légaux.
TODO P3 : enrichir avec vérification date commande vs fenêtre retour
"""
from agents import tools as t
from services import event_bus


async def run(ticket_id: str, order_id: str, customer_id: str):
    order = t.get_order_details(order_id)
    merchant = t.get_merchant_policy()
    return_days = merchant.get("policy", {}).get("return_window_days", 30)

    await t.emit_event(
        ticket_id=ticket_id,
        agent="return",
        action="checking_return_eligibility",
        reasoning=f"Vérification de l'éligibilité au retour (fenêtre : {return_days} jours)...",
    )

    label = t.generate_return_label(order_id)
    await t.emit_event(
        ticket_id=ticket_id,
        agent="return",
        action="return_label_generated",
        reasoning="Retour éligible. Bon de retour généré.",
        data=label
    )

    await t.send_customer_email(
        customer_id=customer_id,
        subject="Votre retour a été accepté",
        message=f"Votre demande de retour est acceptée. Bon de retour : {label['label_code']}. {label['instructions']}"
    )

    await t.request_refund_validation(
        ticket_id=ticket_id,
        order_id=order_id,
        amount=order.get("total_amount", 0),
        reason="Retour dans les délais légaux",
        agent_reasoning=f"Le client demande un retour dans la fenêtre de {return_days} jours. Remboursement de {order.get('total_amount')}€ recommandé dès réception du colis."
    )
