<div align="center">

# BookNest

*Your books. Your shelves. Your reading journey.*

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)

BookNest combines personal book tracking, shared shelves, lending, PDF reading, and real-time notifications in a single application.

[Features](#features) • [Architecture](#architecture) • [Setup](#local-development) • [API](#api-overview) • [Testing](#testing)

</div>

---

## Features

| Capability | Description |
|---|---|
| **Book Library** | Manage digital books, metadata, and covers. |
| **PDF Reading** | Upload and read PDFs directly in the browser with persistent page tracking. |
| **Shared Shelves** | Organize books into shelves and share them using Owner, Editor, or Viewer roles. |
| **Book Lending** | Track peer-to-peer book lending through a structured borrow-and-return lifecycle. |
| **Real-time Engine** | Receive instant WebSocket notifications for shelf updates, lending events, and activities. |
| **Activity Log** | Maintain an automated historical timeline of user interactions and collaborations. |

---

## Architecture

BookNest uses a decoupled React frontend and an asynchronous FastAPI backend, powered by MySQL for relational data and Supabase Storage for secure PDF hosting.

```mermaid
flowchart LR
    Client[React Frontend] <-->|REST API + WebSockets| API[FastAPI Backend]
    
    subgraph Backend
        API --> Auth[Auth Service]
        API --> Books[Book Service]
        API --> Shelves[Shelf Service]
        API --> WS[WebSocket Manager]
    end

    Auth & Books & Shelves --> DB[(MySQL)]
    Books --> Storage[(Supabase Storage)]
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React, Vite, Axios | User interface, routing, and HTTP client interceptors. |
| **Backend** | FastAPI, Python | High-performance asynchronous REST and WebSocket server. |
| **Database** | MySQL, SQLAlchemy | Relational data storage and ORM modeling. |
| **Authentication** | JWT, Bcrypt | Stateless session management with secure password hashing. |
| **File Storage** | Supabase Storage | Isolated hosting for uploaded PDF files. |

---

## Database Design

The schema enforces strict user ownership and hierarchical role-based access control (RBAC) for shared resources.

```mermaid
erDiagram
    USER ||--o{ BOOK : owns
    USER ||--o{ SHELF : owns
    USER ||--o{ LENDING : "borrows/lends"
    BOOK ||--o{ SHELF_BOOK : contained_in
    SHELF ||--o{ SHELF_BOOK : contains
    SHELF ||--o{ SHELF_MEMBER : "has collaborators"
    USER ||--o{ SHELF_MEMBER : "is member of"
```

<details>
<summary>View Core Relationships</summary>

- **User**: Identified by a unique email; owns Books and Shelves.
- **Shelf_Member**: Maps Users to Shelves with an explicitly defined string role (`owner`, `editor`, `viewer`).
- **Lending**: Tracks the active status of a Book loaned from its owner to a specific borrower.
</details>

---

## Authentication

Authentication is handled via JWTs utilizing a dual-token strategy for maximum security against XSS.

- **Login**: Generates a short-lived Access Token (JSON) and a long-lived Refresh Token.
- **Refresh Flow**: The Refresh Token is securely delivered as an `HttpOnly`, `SameSite=Lax` cookie. Axios interceptors on the frontend automatically catch `401 Unauthorized` responses, queue failed requests, hit the `/refresh` endpoint, and replay the original requests seamlessly.

---

## PDF Storage & Reading

BookNest enforces strict privacy for user-uploaded documents. 

1. **Upload**: PDFs are pushed to a private Supabase Storage bucket. MySQL stores only the abstract metadata and storage path.
2. **Access Control**: File requests are validated against the `current_user` or active `Lending` records.
3. **Delivery**: The backend dynamically issues a short-lived **Signed URL** to the frontend, ensuring PDFs are never exposed directly to the public internet.

---

## API Overview

<details open>
<summary><strong>Authentication</strong></summary>

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/login` | Authenticate and receive tokens. |
| `POST` | `/auth/refresh` | Renew access token via HttpOnly cookie. |
| `POST` | `/auth/logout` | Safely clear the refresh token cookie. |
</details>

<details>
<summary><strong>Books & Storage</strong></summary>

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/books/` | List all owned and borrowed books. |
| `POST` | `/books/{id}/pdf` | Upload a PDF to private storage. |
| `GET` | `/books/{id}/read` | Generate a Signed URL for the PDF reader. |
</details>

<details>
<summary><strong>Shelves & Collaboration</strong></summary>

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/shelves/` | Create a new shelf. |
| `POST` | `/shelves/{id}/books` | Add a book to a shelf (requires Editor/Owner). |
| `POST` | `/shelf-members/` | Add a collaborator with a defined role. |
</details>

---

## Local Development

### Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL Server
- Supabase Account

### Environment Configuration

Create a `.env` file in the `backend/` directory.

```env
# Example only — keep real credentials out of version control
DATABASE_URL=mysql+pymysql://user:password@localhost/booknest

JWT_SECRET_KEY=your_secure_random_key
JWT_ALGORITHM=HS256
JWT_ACCESS_EXPIRE_MINUTES=30
JWT_REFRESH_EXPIRE_DAYS=7

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key
```

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## Testing

BookNest includes manual testing tools for core backend capabilities.

<details>
<summary>View Verification Scripts</summary>

Run these utility scripts from the `backend/` directory to verify core logic:

- `test_pdf_storage.py`: Validates Supabase private bucket uploads and Signed URL generation.
- `inspect_lending.py`: Validates the database state of the lending lifecycle.
</details>

*Note: Automated unit tests (e.g., Pytest/Jest) are currently unconfigured.*

---

## Security

- **JWT Validation**: All endpoints are protected by route dependencies requiring a valid active session.
- **RBAC Ownership**: API routes actively verify database ownership prior to executing mutations (e.g., rejecting an Editor attempting to delete a shelf).
- **Secure Cookies**: Refresh tokens are exclusively stored in the browser's internal cookie jar, invisible to JavaScript.
- **Data Isolation**: Database queries are explicitly scoped to the authenticated `user_id`.

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/new-capability`
3. Commit your changes: `git commit -m 'Add new capability'`
4. Push to the branch: `git push origin feature/new-capability`
5. Open a Pull Request.

---

*License not specified.*
