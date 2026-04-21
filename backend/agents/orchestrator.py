"""
Orchestrator Agent — classifie le ticket et route vers l'agent spécialisé.
"""
import json
from openai import AsyncOpenAI
from config import get_settings
from agents import tools as t
from services import event_bus, db

SYSTEM_PROMPT = """
Tu es l'orchestrateur SAV d'Eugenia. Tu reçois des tickets clients et tu dois :
1. Classifier précisément le type de problème avec un score de confiance (0-100)
2. Router vers l'agent spécialisé approprié
3. Si confiance < 70%, escalader immédiatement à un humain avec explication

Types de tickets possibles :
- "unshipped" : commande non expédiée / en retard d'expédition
- "not_received" : colis expédié mais non reçu par le client
- "defective" : produit reçu mais défectueux / endommagé / ne fonctionne pas
- "return" : le client veut retourner un produit (dans les délais légaux)
- "cancellation" : le client veut annuler une commande déjà expédiée

Règles absolues :
- Tu ne déclenches JAMAIS de remboursement directement
- Tu loggues CHAQUE décision avec une explication en français simple
- En cas de doute (confiance < 70%), tu escalades
- Tes explications sont destinées au marchand, pas à un développeur
"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "classify_and_route",
            "description": "Classifier le ticket et décider du routage",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticket_type": {
                        "type": "string",
                        "enum": ["unshipped", "not_received", "defective", "return", "cancellation"],
                        "description": "Type de problème SAV identifié"
                    },
                    "confidence": {
                        "type": "integer",
                        "description": "Score de confiance 0-100"
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Explication en français simple pour le marchand"
                    },
                    "escalate": {
                        "type": "boolean",
                        "description": "True si confiance < 70% et escalade humaine nécessaire"
                    }
                },
                "required": ["ticket_type", "confidence", "reasoning", "escalate"]
            }
        }
    }
]


async def run(ticket_id: str, customer_message: str, order_id: str) -> str:
    """
    Classifie le ticket et route vers l'agent spécialisé.
    Retourne le type de ticket identifié.
    """
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    order = t.get_order_details(order_id)
    customer_id = order.get("customer_id", "")
    customer_info = t.get_customer_history(customer_id)
    merchant = t.get_merchant_policy()

    await t.emit_event(
        ticket_id=ticket_id,
        agent="orchestrator",
        action="analyzing_ticket",
        reasoning="Analyse du message client en cours...",
        data={"order_id": order_id}
    )

    user_content = f"""
Message client : « {customer_message} »

Commande :
- ID : {order.get('id')}
- Statut : {order.get('status')}
- Montant : {order.get('total_amount')}€
- Créée le : {order.get('created_at')}
- SLA deadline : {order.get('sla_deadline')}
- Transporteur : {order.get('shipping', {}).get('carrier')} — statut : {order.get('shipping', {}).get('status')}

Client : {customer_info.get('customer', {}).get('name')} — {customer_info.get('order_count')} commandes
VIP : {customer_info.get('customer', {}).get('is_vip')}

Politique marchande : retour sous {merchant.get('policy', {}).get('return_window_days')} jours, SLA expédition {merchant.get('policy', {}).get('sla_shipping_hours')}h
"""

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content}
        ],
        tools=TOOLS,
        tool_choice={"type": "function", "function": {"name": "classify_and_route"}},
    )

    tool_call = response.choices[0].message.tool_calls[0]
    result = json.loads(tool_call.function.arguments)

    ticket_type = result["ticket_type"]
    confidence = result["confidence"]
    reasoning = result["reasoning"]
    escalate = result["escalate"] or confidence < 70

    db.update_ticket(ticket_id, {"type": ticket_type, "confidence_score": confidence})

    await t.emit_event(
        ticket_id=ticket_id,
        agent="orchestrator",
        action="ticket_classified",
        reasoning=reasoning,
        data={"type": ticket_type, "confidence": confidence, "escalated": escalate},
        requires_human=escalate,
    )

    if escalate:
        db.update_ticket(ticket_id, {"status": "escalated"})
        await t.emit_event(
            ticket_id=ticket_id,
            agent="orchestrator",
            action="escalated_to_human",
            reasoning=f"Confiance insuffisante ({confidence}%). Le marchand doit traiter ce ticket manuellement.",
            requires_human=True,
        )
        return ticket_type

    # Route vers l'agent spécialisé
    db.update_ticket(ticket_id, {"status": "in_progress"})
    await _route(ticket_id, ticket_type, order_id, customer_id)
    return ticket_type


async def _route(ticket_id: str, ticket_type: str, order_id: str, customer_id: str):
    from agents.shipping import run as shipping_run
    from agents.delivery import run as delivery_run
    from agents.defect import run as defect_run
    from agents.returns import run as return_run
    from agents.cancellation import run as cancellation_run

    ticket = event_bus.tickets.get(ticket_id, {})
    message = ticket.get("raw_message", "")

    dispatch = {
        "unshipped": lambda: shipping_run(ticket_id, order_id, customer_id),
        "not_received": lambda: delivery_run(ticket_id, order_id, customer_id),
        "defective": lambda: defect_run(ticket_id, order_id, customer_id, message),
        "return": lambda: return_run(ticket_id, order_id, customer_id),
        "cancellation": lambda: cancellation_run(ticket_id, order_id, customer_id),
    }

    handler = dispatch.get(ticket_type)
    if handler:
        await handler()
