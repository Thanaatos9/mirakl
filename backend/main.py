from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles   # 👈 AJOUT
from routers import tickets, validations, stream, demo

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

@app.get("/health")
def health():
    return {"status": "ok"}

# 👇 AJOUT : à mettre TOUT EN BAS du fichier, après toutes les routes
app.mount("/", StaticFiles(directory="static", html=True), name="static")