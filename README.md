# Ayazma Admin Panel

Admin dashboard for managing appointments, availability, and services.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Runs on port **5174** by default.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8080` | Cloud Run API URL |

Login with the PIN configured in the API's `ADMIN_PIN` env var.
