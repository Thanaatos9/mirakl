import asyncio
from typing import AsyncGenerator
from models import AgentEvent
from services import db

# SSE subscribers — one queue per connected client (in-memory, not persisted)
_subscribers: list[asyncio.Queue] = []

# Tickets paused by human override (in-memory is fine, resets on restart)
paused_tickets: set = set()


async def subscribe() -> AsyncGenerator[str, None]:
    queue: asyncio.Queue = asyncio.Queue()
    _subscribers.append(queue)
    try:
        while True:
            event = await queue.get()
            yield event
    finally:
        _subscribers.remove(queue)


async def publish(event: AgentEvent) -> None:
    payload = f"data: {event.model_dump_json()}\n\n"
    for queue in _subscribers:
        await queue.put(payload)
    # Persist event in Supabase
    db.save_event(event.model_dump())
