# App Template

Generic WebHatchery starter app aligned with the current `apps/` layout:

- `frontend/`: React + TypeScript + Vite
- `backend/`: PHP 8.1+ API bootstrap
- `publish.ps1`: delegates to the shared root publish script
- `.env`: copied from `H:\WebHatchery\.env`

## Intended Use

1. Copy `app_template` to a new app folder name.
2. Update package/composer metadata and env values.
3. Build out feature-specific pages, API routes, services, and storage.

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Expected local URL: `http://localhost:5173`

## Backend

```powershell
cd backend
composer install
composer start
```

Expected local API base: `http://localhost:8000/api/v1`

## Publish

```powershell
.\publish.ps1 -All
```

This template keeps the baseline generic on purpose and is meant to be extended per app.
