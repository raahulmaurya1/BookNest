<div align="center">

# 📚 BookNest

*Your books. Your shelves. Your reading journey.*

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Unspecified-lightgrey?style=flat-square)](#license)

</div>

---

## What This Is


BookNest is a virtual library designed to make managing, reading, and sharing books. It brings your personal collection into one place, where you can organize books into shelves, track your reading progress, upload PDFs, and continue reading from the page you last stopped on.

Beyond personal reading, BookNest also makes sharing easier. You can share shelves with friends, lend and borrow books, manage who has access to your shelves, and receive real-time updates when something changes. The goal is simple: **keep your books organized, your reading progress saved, and your shared books easy to keep track of all in one place.**


---

## Table of Contents

- [Features](#features)
- [Stack Choice & Why](#stack-choice--why)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [Shelf Roles  How They're Actually Enforced](#shelf-roles--how-theyre-actually-enforced)
- [Refresh-Token Flow](#refresh-token-flow)
- [WebSocket Setup](#websocket-setup)
- [PDF Storage & Reading](#pdf-storage--reading)
- [API Reference](#api-reference)
- [How to Run It](#how-to-run-it)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [What Was Hard, and How I Got Through It](#what-was-hard-and-how-i-got-through-it)
- [Known Issues / What's Incomplete](#known-issues--whats-incomplete)
- [What I'd Improve With More Time](#what-id-improve-with-more-time)
- [Where I Used AI, and What I Learned](#where-i-used-ai-and-what-i-learned)
- [Contributing](#contributing)

---

## Features

| Capability | Description |
|---|---|
| **Book Library** | Track books with status, page progress, rating, and notes. |
| **PDF Reading** | Upload a PDF per book and read it in-browser with your place saved automatically. |
| **Shared Shelves** | Group books into shelves and share them at Owner, Editor, or Viewer level. |
| **Lending** | Lend a book to another user; either side can close out the loan when it's returned. |
| **Real-Time Updates** | WebSocket notifications for lending and shelf-sharing events, sent only to the people involved. |
| **Dashboard** | Total books, currently reading, finished this year, active loans, at a glance. |
| **Sessions that don't die on you** | Short-lived access tokens plus a longer-lived refresh token, so you're not logged out every hour. |

---

## Stack Choice & Why

| Layer | Choice | Why |
|---|---|---|
| **Backend** | FastAPI | Async by default, request validation basically for free via Pydantic, and I could put the WebSocket endpoint in the same app instead of standing up a separate real-time service. |
| **Database** | MySQL + SQLAlchemy | This data is genuinely relational books, shelves, and loans all have real foreign keys and composite keys between them. A document store would've fought me the moment shelf sharing needed a proper join table. |
| **Frontend** | React + Vite | Fast dev loop, and a lot of the UI (book cards, shelf cards, confirm dialogs) gets reused across pages, so components pay off quickly. |
| **File storage** | Supabase Storage | Private buckets and signed URLs out of the box I didn't want to run and secure my own file server just to host PDFs. |
| **Auth** | JWT, access + refresh | A short-lived access token keeps most requests cheap, and a refresh token that JavaScript can't touch means a session survives longer than an hour without being reckless about it. |

---

## Architecture
<div align="center">
  <img src="https://github.com/raahulmaurya1/BookNest/blob/da01f60046fd82cf6429ec7d09e8b0e46f0734ea/BookNest_Architecture_Diagram.png" alt="BookNest Architecture Diagram" width="750">
</div>


The frontend talks to the backend two ways: normal REST calls for everything CRUD-shaped, and a single WebSocket connection for anything that needs to show up live. On the backend, every request flows the same way regardless of which router it hits **Router → Service → Model** and all the actual business logic and permission checks live in the service layer, never in the route handler and never assumed to be handled by the frontend.

**A request, start to finish:** the access token gets checked once, by one shared dependency, before the router even runs. The router itself does almost nothing except call the right service function. That service function checks whether the caller is actually allowed to do this, then talks to MySQL through SQLAlchemy. If the access token happens to be expired, the frontend catches that transparently and retries more on that below so in practice the user never sees it.

---

## Data Model

<div align="center">
  <img src="https://github.com/raahulmaurya1/BookNest/blob/da01f60046fd82cf6429ec7d09e8b0e46f0734ea/ER_Diagram.png" alt="BookNest Database ER Diagram" width="750">
</div>

Everything hangs off `users`. Here's how the pieces connect:

| Table | What it holds | How it connects |
|---|---|---|
| `users` | Accounts email (unique), bcrypt password hash | Everything else points back to this |
| `books` | One row per book a user owns title, author, status, page progress, rating, notes, PDF path | `owner_id → users.id` |
| `shelves` | Named groupings of books | `owner_id → users.id` |
| `shelf_books` | Which books sit on which shelves | Junction table composite key (`shelf_id`, `book_id`), cascades on delete |
| `shelf_members` | Who can access a shelf, and at what role | Junction table composite key (`shelf_id`, `user_id`), cascades on delete, carries a `role` column |
| `lending` | One row per loan | `book_id`, `owner_id`, `borrower_id` — `returned_date` is null while the loan is active |
| `activity` | A log of what happened, when | `user_id → users.id` |

A book belongs to one owner but can sit on any number of that owner's shelves, and can be out on loan to at most one person at a time. A shelf also belongs to one owner, but can have any number of collaborators, each with their own role and the owner themselves is actually recorded as a `shelf_members` row too, with `role = owner`, set automatically the moment the shelf is created. That was a deliberate choice: it means every access check only ever has to look in one table (`shelf_members`), instead of checking "are you the owner" in one place and "are you a member" in another.

---

## Shelf Roles — How They're Actually Enforced

Three roles per shelf: **Owner**, **Editor**, **Viewer**.

| Role | View | Add/Remove Books | Manage Members | Delete Shelf |
|---|:---:|:---:|:---:|:---:|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ |

**Shelf role enforcement, short version:**

- Every shelf request goes through `get_shelf()` first: owner → full access; not owner → must have a `shelf_members` row, or `403`.
- Shelf doesn't exist → `404`. Shelf exists but isn't yours → `403` (so error codes can't leak which IDs are real).
- Writes (add/remove books) get one extra check: if your role is `viewer`, you're rejected enforced in the service layer, not the UI, so a direct `curl`/API call hits the same wall a button click would.
- Membership changes are Owner-only, and Owner can't be removed or reassigned a shelf can never end up without one.

---

## Refresh-Token Flow

| Token | Lives where | How long | Sent how |
|---|---|---|---|
| Access token | `localStorage` | ~1 hour (`JWT_EXPIRE_MINUTES`) | `Authorization: Bearer` header on REST, `?token=` on the WebSocket |
| Refresh token | `HttpOnly` cookie | ~7 days (`JWT_REFRESH_EXPIRE_DAYS`) | Sent by the browser automatically — JavaScript never sees it |

**Refresh-token flow:**

- Access & refresh tokens are typed (`token_type` claim)  one can't be used in place of the other.
- **Login:** access token in response body; refresh token in an `HttpOnly` cookie (JS can't read it).
- **On expiry:** interceptor catches the `401`, silently calls `/auth/refresh`, retries the request.
- **Logout:** server clears the refresh cookie; frontend clears the access token.
- No revocation list yet a leaked refresh token stays valid until it expires.

---

**WebSocket Setup:**

- **Auth:** client connects via `/ws?token=<access token>` (query string, since sockets can't send custom headers) server validates it with the same decode function REST uses; bad/expired token = connection closed immediately.
- **No broadcasting:** connections are tracked per `user_id`. Notifications always target one specific user:
  - Lend a book → borrower only
  - Return a book → the other party only
  - Added to a shelf → that person only
- Notifications fire from inside the same permission-checked service call that validated the action so "who's allowed" and "who gets notified" can't drift apart.
- **Disconnect/reconnect:** server drops just that one connection; client auto-reconnects with backoff (1s → 2s → 4s, up to 5 tries) except on clean logout or a rejected token, where it doesn't retry.
- **Technical note:** notifications are sent from sync code with no event loop, so the loop is captured once at first connection and reused to schedule sends from any thread.

---

## PDF Storage & Reading

- PDFs stored in a private Supabase bucket; MySQL keeps only the file path.
- Each read gets a fresh, short-lived signed URL.
- Access follows the same rule as the book itself (owner, shelf member, or active borrower).
- Page progress saves automatically; status updates itself (Want to Read → Reading → Finished).

---

## API Reference

<details open>
<summary><strong>Authentication</strong></summary>

| Method | Endpoint | Auth | Purpose |
|---|---|:---:|---|
| `POST` | `/auth/register` | — | Create an account |
| `POST` | `/auth/login` | — | Log in, get an access token, get the refresh cookie set |
| `POST` | `/auth/refresh` | Cookie | Trade the refresh cookie for a new access token |
| `POST` | `/auth/logout` | — | Clear the refresh cookie |
| `GET` | `/auth/me` | ✅ | Who am I |

</details>

<details>
<summary><strong>Books</strong></summary>

| Method | Endpoint | Auth | Purpose |
|---|---|:---:|---|
| `GET` | `/books/` | ✅ | List everything you can see |
| `POST` | `/books/` | ✅ | Add a book |
| `PATCH` | `/books/{id}` | Owner | Edit a book |
| `DELETE` | `/books/{id}` | Owner | Remove a book |
| `PATCH` | `/books/{id}/progress` | ✅ | Update your page |
| `POST` | `/books/{id}/pdf` | Owner | Upload a PDF |
| `GET` | `/books/{id}/pdf-url` | ✅ | Get a signed URL to read it |

</details>

<details>
<summary><strong>Shelves & Collaboration</strong></summary>

| Method | Endpoint | Auth | Purpose |
|---|---|:---:|---|
| `GET` | `/shelves/` | ✅ | List your shelves and ones shared with you |
| `POST` | `/shelves/` | ✅ | Create a shelf |
| `PATCH` / `DELETE` | `/shelves/{id}` | Owner | Rename or delete |
| `POST` | `/shelves/{id}/books/{book_id}` | Owner/Editor | Add a book |
| `DELETE` | `/shelves/{id}/books/{book_id}` | Owner/Editor | Remove a book |
| `POST` | `/shelf-members/` | Owner | Add a collaborator |
| `PATCH` | `/shelf-members/{id}` | Owner | Change someone's role |
| `DELETE` | `/shelf-members/{id}` | Owner | Remove a collaborator |

</details>

<details>
<summary><strong>Lending</strong></summary>

| Method | Endpoint | Auth | Purpose |
|---|---|:---:|---|
| `POST` | `/lending/{book_id}` | Owner | Lend a book |
| `PATCH` | `/lending/{book_id}/return` | Owner or borrower | Close out a loan |
| `GET` | `/lending/borrowed` | ✅ | What you've borrowed |
| `GET` | `/lending/lent` | ✅ | What you've lent out |
| `POST`	| `/auth/logout` |  ✅ | Safely clear the refresh token cookie | 

</details>

<details>
<summary><strong>Dashboard, Activity & WebSocket</strong></summary>

| Method | Endpoint | Auth | Purpose |
|---|---|:---:|---|
| `GET` | `/dashboard/` | ✅ | Stats overview |
| `GET` | `/activity/` | ✅ | Recent activity |
| `WS` | `/ws?token=<jwt>` | ✅ | Live events |

</details>

---

## How to Run It

Tested from a clean clone — this is the actual sequence, not a generic template.

**You'll need:** Python 3.10+, Node 18+, a running MySQL server, and a Supabase project with Storage turned on.

```bash
git clone https://github.com/raahulmaurya1/BookNest.git
cd BookNest
```

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Set up `backend/.env` see [Environment Variables](#environment-variables) below; the checked-in `.env.example` only covers the database settings, so you'll need to add the JWT and Supabase ones yourself. Create a `booknest` database in MySQL, then:

```bash
uvicorn app.main:app --reload
```

API's up at `http://localhost:8000`.

**Frontend**, in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

App's up at `http://localhost:5173`.

**Then:** just register through the UI and log in. There's no seed data — `seed.py` exists but isn't actually implemented yet — so you're starting from an empty account.

---

## Environment Variables

| Variable | Required | Default | What it's for |
|---|:---:|---|---|
| `DB_HOST` | ✅ | `localhost` | MySQL host |
| `DB_PORT` | ✅ | `3306` | MySQL port |
| `DB_USER` | ✅ | `root` | MySQL user |
| `DB_PASSWORD` | ✅ | `root` | MySQL password |
| `DB_NAME` | ✅ | `booknest` | MySQL database name |
| `JWT_SECRET_KEY` | ✅ | — | Signs the JWTs — change this before deploying anywhere real |
| `JWT_ALGORITHM` | ❌ | `HS256` | |
| `JWT_EXPIRE_MINUTES` | ❌ | `60` | Access token lifetime |
| `JWT_REFRESH_EXPIRE_DAYS` | ❌ | `7` | Refresh token lifetime |
| `SUPABASE_URL` | ✅ | — | Your Supabase project URL |
| `SUPABASE_SECRET_KEY` | ✅ | — | Service role key |
| `SUPABASE_BUCKET_NAME` | ❌ | `booknest-books` | Where PDFs get stored |
| `ENVIRONMENT` | ❌ | `development` | Set to `production` to require HTTPS on the refresh cookie |

---

## Testing

```bash
cd backend
python run_qa_tests.py
```

This runs the QA suite and writes results to `qa_results.json`. There are also a couple of standalone scripts for poking at specific things directly:

- `test_pdf_storage.py` — checks Supabase upload and signed-URL generation actually work
- `inspect_lending.py` — dumps the current state of loans in the database

There's no frontend test suite yet — that's on the list below.

---

## Troubleshooting

| Problem | Usually because | Fix |
|---|---|---|
| Getting logged out after about an hour | Refresh isn't happening — check cookies aren't blocked | Make sure the browser is actually sending the cookie; if the refresh token itself expired, just log in again |
| PDF upload fails | Supabase credentials wrong or missing | Double-check `SUPABASE_URL` / `SUPABASE_SECRET_KEY` |
| WebSocket won't connect | Missing or expired token in the URL | Confirm `?token=` is actually being appended |
| "Shelf not found" for someone who should have access | They're not actually a `shelf_members` row yet, or the ID's wrong | Owner should double check via `/shelf-members/` |
| Backend won't start, DB error | MySQL isn't running, or `.env` is wrong | Check `DB_HOST`/`DB_PORT`/credentials, confirm MySQL is actually up |

---

## What Was Hard, and How I Got Through It

- **Relational data modeling**  how one-to-many (user → books) and many-to-many (shelves ↔ books, shelves ↔ users) actually get built with foreign keys and junction tables, and how role-based access (Owner/Editor/Viewer) fits into that same relational structure instead of being bolted on separately.
- **Why WebSockets, even with FastAPI already handling requests** FastAPI's normal request/response cycle is client-initiated: the client asks, the server answers, done. That doesn't work for "notify someone the moment something happens elsewhere" there's no request to respond to. A WebSocket is a connection that stays open, so the server can push a message whenever it wants, not just when asked. I learned this the hard way while getting notifications to fire from synchronous code with no event loop attached.
- **How login sessions actually work with refresh tokens** — the access token is what proves who you are on each request, but it's short-lived on purpose. The refresh token is a separate, longer-lived credential kept in an `HttpOnly` cookie specifically so JavaScript can never read it even if the site had an XSS bug, the refresh token itself couldn't be stolen through it. Understanding *why* it's a cookie and not just `localStorage` again was the actual learning, not just wiring the flow up.

---

## Known Issues / What's Incomplete

- PDF uploads are only checked by filename extension no real content-type or size validation.
- No way to revoke a refresh token early. If one leaked, it's valid until it naturally expires there's no "log out everywhere" button.
- No search or filtering on the book list yet it's just a flat list.

---

## What I'd Improve With More Time

- Add refresh-token rotation with a way to revoke one early.
- Search and pagination on the book list.
- A real frontend test suite, focused especially on the lending and role-permission flows, since those are where most of the actual bugs showed up.
- Push activity-log entries over the socket live, instead of needing a refresh to see new ones.
- Actual file-size and content-type checks on PDF upload.

---

## Where I Used AI, and What I Learned

## Where I Used AI, and What I Learned

I used AI (Claude) as a coding assistant — not as the one deciding how to develop or design a feature. The architecture and feature decisions were mine; AI helped me execute and verify them. Specifically:

**1. Researching the tech before writing code.**
Before committing to an approach, I used AI to understand more about the technologies I was choosing between and to think through what business requirements might come up later what additions a feature might realistically need down the line so I could pick the option that would actually hold up, not just the first one that worked.

**2. Boilerplate generation.**
Repetitive, structural code the kind that's the same shape every time is where AI saved the most real time.

**3. Writing QA test scripts.**
After finishing a feature, I used AI to write test scripts that exercised each piece of functionality on its own, to catch bugs before pushing to GitHub rather than finding them later.

**4. Making sense of bugs.**
When I hit a bug, I used AI to help pin down more specifically where in the code it was actually happening, rather than guessing across the whole codebase.

**5. Being honest about what AI didn't write.**
To be honest, I didn't write every line in this codebase myself a lot of it is AI-assisted coding. But where my thinking didn't match what AI produced, I fixed the code myself. Where only a small change was needed, I didn't hand that to AI either I used my own coding skill to make it. And the sensitive parts the database and the external API integrations I coded entirely myself. I wasn't willing to let AI handle sensitive data.

**What I actually learned from this:** AI is useful as a second pair of eyes and a research/execution partner, but the thinking about *what* to build and *why* has to stay mine the moment I treated it as a design decision-maker instead of an assistant, the result stopped reflecting what I actually wanted.

---

## Contributing

1. Fork the repo.
2. `git checkout -b feature/your-thing`
3. `git commit -m 'Add your thing'`
4. `git push origin feature/your-thing`
5. Open a PR.

---

*MIT*
