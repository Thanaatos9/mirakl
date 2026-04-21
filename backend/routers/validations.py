from fastapi import APIRouter, HTTPException
from models import HumanValidation, ValidationApproveRequest, ValidationRejectRequest, AgentEvent
from services import event_bus, db
from datetime import datetime

router = APIRouter(prefix="/validations")


@router.get("")
async def list_validations(status: str = "pending"):
    return db.list_validations(status=status)


@router.get("/{validation_id}")
async def get_validation(validation_id: str):
    v = db.get_validation(validation_id)
    if not v:
        raise HTTPException(status_code=404, detail="Validation not found")
    return v


@router.post("/{validation_id}/approve")
async def approve_validation(validation_id: str, body: ValidationApproveRequest):
    v = db.get_validation(validation_id)
    if not v:
        raise HTTPException(status_code=404, detail="Validation not found")

    approved_amount = body.approved_amount or v["amount"]
    db.update_validation(validation_id, {
        "status": "approved",
        "approved_amount": approved_amount,
        "resolved_at": datetime.utcnow().isoformat(),
    })
    db.update_ticket(v["ticket_id"], {"status": "resolved"})

    event = AgentEvent(
        ticket_id=v["ticket_id"],
        agent="human",
        action="human_approved",
        reasoning=f"Remboursement de {approved_amount}€ approuvé par le marchand.",
        data={"approved_amount": approved_amount},
    )
    await event_bus.publish(event)
    return {"ok": True, "approved_amount": approved_amount}


@router.post("/{validation_id}/reject")
async def reject_validation(validation_id: str, body: ValidationRejectRequest):
    v = db.get_validation(validation_id)
    if not v:
        raise HTTPException(status_code=404, detail="Validation not found")

    db.update_validation(validation_id, {
        "status": "rejected",
        "rejection_reason": body.reason,
        "resolved_at": datetime.utcnow().isoformat(),
    })
    db.update_ticket(v["ticket_id"], {"status": "resolved"})

    event = AgentEvent(
        ticket_id=v["ticket_id"],
        agent="human",
        action="human_rejected",
        reasoning=f"Remboursement refusé par le marchand. Raison : {body.reason}",
        data={"reason": body.reason},
    )
    await event_bus.publish(event)
    return {"ok": True}
