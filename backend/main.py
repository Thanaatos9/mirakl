from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles   # 👈 AJOUT
from routers import tickets, validations, stream, demo, marketplace

app = FastAPI(title="Eugenia SAV API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tickets.router)
app.include_router(validations.router)
app.include_router(stream.router)
app.include_router(demo.router)
app.include_router(marketplace.router)

@app.get("/health")
async def health():
    from services.db import list_tickets, list_validations
    return {
        "status": "ok",
        "tickets": len(list_tickets()),
        "validations": len(list_validations(status="pending")),
    }

# Static files (doit rester en bas, après toutes les routes API)
app.mount("/", StaticFiles(directory="static", html=True), name="static")
