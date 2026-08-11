# Exchange Rate Agent

PoC con un frontend en Next.js y una estructura de backend deliberadamente vacía para implementar más adelante.

## Desarrollo

```bash
cd frontend
npm install
npm run dev
```

El frontend espera un endpoint `POST /api/chat` que reciba `{ "message": string }` y responda `{ "response": string }`.
