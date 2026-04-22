# Dashboard marchand

Interface de pilotage SAV en temps reel.

## Source de donnees

Le dashboard se connecte au backend FastAPI :

- SSE sur `GET /stream`
- tickets sur `GET /tickets`
- validations sur `GET /validations`

## Vues attendues

- Flux live
- File SAV
- Validations humaines
- Detail ticket / audit trail

## Lancement

```bash
npm install
cp ../.env.example .env.local
npm run dev
```
