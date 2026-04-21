"""
DefectAgent — gère les produits défectueux.
TODO P3 : enrichir avec analyze_defect_description GPT-4o
"""
from agents import tools as t
from services import event_bus


async def run(ticket_id: str, order_id: str, customer_id: str, message: str):
    order = t.get_order_details(order_id)
    merchant = t.get_merchant_policy()
    return_days = merchant.get("policy", {}).get("return_window_days", 30)

    await t.emit_event(
        ticket_id=ticket_id,
        agent="defect",
        action="analyzing_defect",
        reasoning=f"Analyse du défaut signalé : « {message[:80]} »",
    )

    # Générer un bon de retour + demander validation remboursement
    label = t.generate_return_label(order_id)
    await t.emit_event(
        ticket_id=ticket_id,
        agent="defect",
        action="return_label_generated",
        reasoning=f"Produit défectueux confirmé. Bon de retour généré sous {return_days} jours.",
        data=label
    )

    await t.send_customer_email(
        customer_id=customer_id,
        subject="Retour produit défectueux — bon de retour",
        message=f"Nous sommes désolés pour ce problème. Voici votre bon de retour : {label['label_code']}. {label['instructions']}"
    )

    await t.request_refund_validation(
        ticket_id=ticket_id,
        order_id=order_id,
        amount=order.get("total_amount", 0),
        reason="Produit défectueux — remboursement total recommandé",
        agent_reasoning=f"Le client signale : « {message[:150]} ». Produit éligible au retour selon la politique marchande. Remboursement de {order.get('total_amount')}€ recommandé."
    )
