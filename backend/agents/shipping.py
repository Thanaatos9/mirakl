"""
ShippingAgent — gère les commandes non expédiées / en retard.
"""
import json
from openai import AsyncOpenAI
from config import get_settings
from agents import tools as t
from services import event_bus, db
from datetime import datetime

SYSTEM_PROMPT = """
Tu es l'agent SAV spécialisé dans les problèmes d'expédition d'Eugenia.
Tu traites les commandes qui n'ont pas encore été expédiées.

Ta mission :
1. Vérifier le statut de la commande et la date SLA
2. Si dans les délais : envoyer un message rassurant au client avec un ETA
3. Si SLA dépassé : relancer le transporteur + notifier le client + alerter le marchand

Règles :
- Tu ne rembourses JAMAIS sans validation humaine
- Tes actions doivent être concrètes et immédiatement utiles pour le client
- Ton ton est professionnel et empathique
- Toutes tes explications sont en français simple pour le marchand
"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "check_sla_status",
            "description": "Vérifier si le SLA d'expédition est respecté",
            "parameters": {
                "type": "object",
                "properties": {
                    "is_late": {"type": "boolean"},
                    "hours_late": {"type": "number"},
                    "action": {"type": "string", "enum": ["reassure_client", "escalate_carrier", "escalate_human"]},
                    "customer_message": {"type": "string", "description": "Message à envoyer au client"},
                    "reasoning": {"type": "string", "description": "Explication pour le marchand"}
                },
                "required": ["is_late", "action", "customer_message", "reasoning"]
            }
        }
    }
]


async def run(ticket_id: str, order_id: str, customer_id: str):
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    order = t.get_order_details(order_id)
    merchant = t.get_merchant_policy()
    sla_hours = merchant.get("policy", {}).get("sla_shipping_hours", 48)

    await t.emit_event(
        ticket_id=ticket_id,
        agent="shipping",
        action="checking_order_status",
        reasoning="Vérification du statut de la commande et du délai SLA...",
        data={"order_id": order_id, "sla_hours": sla_hours}
    )

    now = datetime.utcnow().isoformat()
    user_content = f"""
Commande : {json.dumps(order, indent=2)}
SLA expédition contractuel : {sla_hours}h
Date actuelle : {now}

Le client n'a pas reçu de confirmation d'expédition. Analyse la situation et décide de l'action à prendre.
"""

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content}
        ],
        tools=TOOLS,
        tool_choice={"type": "function", "function": {"name": "check_sla_status"}},
    )

    result = json.loads(response.choices[0].message.tool_calls[0].function.arguments)
    action = result["action"]
    reasoning = result["reasoning"]

    await t.emit_event(
        ticket_id=ticket_id,
        agent="shipping",
        action="sla_analyzed",
        reasoning=reasoning,
        data={"is_late": result["is_late"], "action": action}
    )

    if action == "reassure_client":
        email_result = await t.send_customer_email(
            customer_id=customer_id,
            subject="Votre commande est en cours de préparation",
            message=result["customer_message"]
        )
        await t.emit_event(
            ticket_id=ticket_id,
            agent="shipping",
            action="customer_notified",
            reasoning=f"Email envoyé au client : {result['customer_message'][:100]}",
            data=email_result
        )
        db.update_ticket(ticket_id, {"status": "resolved", "resolution": result["customer_message"]})

    elif action == "escalate_carrier":
        await t.emit_event(
            ticket_id=ticket_id,
            agent="shipping",
            action="carrier_contacted",
            reasoning="SLA dépassé — demande de relance transporteur envoyée.",
            data={"carrier": order.get("shipping", {}).get("carrier")}
        )
        email_result = await t.send_customer_email(
            customer_id=customer_id,
            subject="Mise à jour sur votre commande",
            message=result["customer_message"]
        )
        await t.emit_event(
            ticket_id=ticket_id,
            agent="shipping",
            action="customer_notified",
            reasoning="Client informé du retard et des actions en cours.",
            data=email_result
        )
        db.update_ticket(ticket_id, {"status": "resolved", "resolution": result["customer_message"]})

    elif action == "escalate_human":
        db.update_ticket(ticket_id, {"status": "awaiting_human"})
        await t.emit_event(
            ticket_id=ticket_id,
            agent="shipping",
            action="escalated_to_human",
            reasoning=reasoning,
            requires_human=True,
        )
