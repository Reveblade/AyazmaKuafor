# Ayazma API

Node.js API for Ayazma Hair Styling Saloon — Hono + MongoDB + Socket.io.

## Setup

```bash
npm install
cp .env.example .env
npm run seed   # seed services, hours, shop settings
npm run dev    # http://localhost:8080
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run production build |
| `npm run seed` | Seed MongoDB with defaults |

## Deploy

See [DEPLOY.md](./DEPLOY.md) for Google Cloud Run instructions.

Default admin PIN in development: `1234` (change via `ADMIN_PIN` env var).
