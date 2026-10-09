# Deploy Ayazma API to Google Cloud Run

## Prerequisites

- Google Cloud project with Cloud Run API enabled
- MongoDB Atlas M0 cluster
- `gcloud` CLI authenticated

## Environment variables

Set these in Cloud Run:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `ADMIN_PIN` | Admin panel PIN |
| `JWT_SECRET` | Random secret for JWT signing |
| `CORS_ORIGINS` | Comma-separated frontend URLs |
| `NODE_ENV` | `production` |

## Build & deploy

```bash
cd api
gcloud run deploy ayazma-api \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "MONGODB_URI=...,ADMIN_PIN=...,JWT_SECRET=...,CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com,NODE_ENV=production"
```

## Seed database

```bash
MONGODB_URI="your-uri" npm run seed
```

## Static frontends

Build and deploy `frontend/` and `admin/` to Firebase Hosting, Cloud Storage + CDN, or any static host.

```bash
cd frontend && npm run build   # dist/
cd admin && npm run build      # dist/
```

Set `VITE_API_URL` to your Cloud Run URL at build time.
