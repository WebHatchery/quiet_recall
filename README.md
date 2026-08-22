# Quiet Recall

A bedtime language-learning portal. Quiet Recall is built around one short, low-pressure
session at the end of the day: review what's due, read one tiny Japanese line, type one
sentence, and stop cleanly.

The design is deliberately anti-grind — no streaks, no daily goal to fail, no
"you're falling behind" nudges. A session is 5–15 minutes, and **Tired Mode** shrinks it
to five cards with no reading or writing step at all.

- `frontend/` — React 19 + TypeScript + Vite + Tailwind 4 (dark night-desk UI)
- `backend/` — PHP 8.1 REST API (`/api/v1`), Controller → Action → Repository layering
- `publish.ps1` — delegates to the shared root publish script

## The session

Tonight's session runs as a short fixed sequence:

| Step | What happens |
| --- | --- |
| `review` | SRS cards that are due, revealed one at a time, rated **Hard / Okay / Easy** |
| `reading` | One short passage with reading help, translation and notes |
| `sentence` | One prompted sentence to type, from a template with a hint and an example |
| `done` | Session summary; the night is marked complete |

Session length is chosen on the Tonight screen (5 or 10 minute presets, or a custom
slider up to 15). When the timer expires the session doesn't cut you off mid-card — it
finishes the current step and skips the remaining ones.

**Tired Mode** caps the session at 5 minutes and 5 review cards, introduces no new cards,
and goes straight from review to done.

Cards can play their audio through the browser's built-in `speechSynthesis` — there are
no audio assets to ship or host.

## Three screens

- **Tonight** — the session launcher and the night's metrics (reviewed today, accuracy,
  familiar words, due now).
- **Progress** — review accuracy, familiar vs. shaky words, upcoming reviews, nights this
  week, and the sentences you've typed.
- **Library** — add and edit cards and readings, adjust session settings, reset local data.

## Scheduling

The SRS lives in `frontend/src/utils/srs.ts` and is intentionally small — a simplified
SM-2 variant, not a port of Anki:

- Three ratings: `hard`, `okay`, `easy`.
- Ease moves within `1.3 – 3.2`; `hard` drops it by `0.2`, `easy` raises it by `0.12`.
- `hard` always resets the interval to 1 day and counts a lapse.
- Intervals are capped at 45 days, so nothing disappears from rotation for long.
- A card becomes `review` (from `learning`) after its second review.
- **Familiar** = 3+ reviews, ease ≥ 2.35, last rating not `hard`.
  **Shaky** = 2+ lapses, or ease < 1.95, or last rating `hard`.

Session selection prefers due cards, backfills with non-new cards if there aren't enough,
then adds at most 3 new cards (subject to the `newCardLimit` setting).

Card kinds: `target-meaning`, `target-reading-meaning`, `sentence-meaning`,
`kana-recognition`, `audio-prompt`.

## Content

The app ships with a small Japanese starter set in `frontend/src/data/japaneseSeed.ts` —
hiragana and everyday vocabulary cards, three readings, and three sentence templates.
It's a starting deck, not a course; everything is editable in the Library, and users can
add their own cards and readings.

`settings.language` is currently typed as `"Japanese"` only. Supporting a second language
means widening that type and supplying a matching seed set.

## Auth and sync

Quiet Recall uses **shared WebHatchery Login only** — no local login UI or endpoints.

- The bearer token is read from the shared `auth-storage` localStorage key.
- Unauthenticated users can **continue as a guest**: `POST /auth/guest-session` issues a
  signed guest JWT, stored separately under `quiet-recall-guest-session`.
- If a guest later signs in, `POST /auth/link-guest` merges the guest's saved state into
  the real account and clears the guest session.
- 401s propagate as ordinary errors. The Axios interceptor only records the `login_url`
  from the response into the auth store and re-rejects — it never clears the session or
  redirects. Signing in is always the user's choice.

State is held in a Zustand store persisted to localStorage (`quiet-recall-state`), so the
app is fully usable offline and signed-out. When a token is present, every mutation also
pushes a full snapshot to the backend via `PUT /study/state`. The server stores one JSON
snapshot per user rather than normalised card rows.

## API

Base path `/api/v1`. Everything under `/study` requires a bearer token.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | — | liveness |
| `GET` | `/auth/login-info` | — | shared login URL |
| `POST` | `/auth/guest-session` | — | issue a guest token |
| `POST` | `/auth/link-guest` | ✓ | merge a guest session into the signed-in account |
| `GET` | `/study/state` | ✓ | load the saved snapshot |
| `PUT` | `/study/state` | ✓ | save the snapshot |
| `POST` | `/study/session/start` | ✓ | record a session start |
| `POST` | `/study/card/review` | ✓ | record a card rating |
| `POST` | `/study/reading/complete` | ✓ | record a completed reading |
| `POST` | `/study/sentence` | ✓ | save a typed sentence |
| `POST` | `/study/session/complete` | ✓ | record a finished night |

## Database

MySQL, two tables (`backend/database/schema.sql`, mirrored as
`backend/migrations/001_create_quiet_recall_tables.sql`):

- `quiet_recall_players` — one row per `auth_user_id`, including guests.
- `quiet_recall_saves` — one `state_json` snapshot per `auth_user_id`, cascading on
  player delete.

```powershell
cd backend
composer db:init      # run after creating the configured database
```

## Configuration

All values are **required with no code defaults** — a missing variable fails at startup
rather than silently falling back.

`backend/.env`:

| Variable | Purpose |
| --- | --- |
| `APP_NAME`, `APP_VERSION` | reported by `/health` |
| `API_BASE_PATH` | e.g. `/api/v1` |
| `CORS_ORIGIN` | allowed browser origin |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | MySQL connection |
| `JWT_SECRET` | shared WebHatchery token verification and guest token signing |
| `WEBHATCHERY_LOGIN_URL` | returned to the client for the login prompt |

`frontend/.env`: `VITE_API_BASE_URL`, `VITE_APP_NAME`, `VITE_BASE_PATH`.

Per-environment overrides live in `.env.preview` and `.env.production` on both sides.

## Running it

Verification goes through the shared publish flow, not per-app dev servers:

```powershell
.\publish.ps1            # build + deploy to the local preview root
# then open http://127.0.0.1/quiet_recall/
```

Frontend dependencies are centralised in the **root** npm workspace at `D:\WebHatchery` —
do **not** run `npm install` inside `frontend/`.

```powershell
# from D:\WebHatchery
npm ci
npm -w @webhatchery/quiet-recall-frontend run dev     # dev server, diagnostics only
```

## Quality gates

```powershell
# from D:\WebHatchery
npm -w @webhatchery/quiet-recall-frontend run ci    # lint → type-check → format → test → build

# from apps/quiet_recall/backend
composer test
composer cs-check
composer cs-fix
```

## Standards

This app follows the WebHatchery standards copied into the project root:
`AGENTS.md`, `standards-backend.md`, `standards-frontend.md`.
