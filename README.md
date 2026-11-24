# Chirpy

A small social network API built from scratch to learn how HTTP servers work. Users sign up, log in, and post short messages called *chirps*.

Built with **TypeScript**, **Express 5**, **PostgreSQL**, and **Drizzle ORM**, with JWT-based authentication and refresh tokens.

## Tech stack

| Area | Tool |
|---|---|
| Runtime | Node.js (version pinned in `.nvmrc`) |
| Language | TypeScript, compiled to `dist/` with `tsc` |
| HTTP framework | Express 5 |
| Database | PostgreSQL |
| ORM and migrations | Drizzle ORM and drizzle-kit |
| Password hashing | argon2 |
| Tokens | jsonwebtoken (HS256) |
| Tests | Vitest |

## Getting started

### Prerequisites

- [nvm](https://github.com/nvm-sh/nvm) (or the Node.js version listed in `.nvmrc`)
- PostgreSQL running locally

### Setup

```bash
# Install the pinned Node version and dependencies
nvm use
npm install

# Create the database
sudo -u postgres psql -c "CREATE DATABASE chirpy;"

# Create your environment file and fill in the values
cp .env.example .env
```

### Environment variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the server listens on | `8080` |
| `PLATFORM` | Environment name. `POST /admin/reset` only works when this is exactly `dev` | `dev` |
| `DB_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5432/chirpy?sslmode=disable` |
| `JWT_SECRET` | Secret used to sign access tokens. Generate one with `openssl rand -base64 64 \| tr -d '\n'` | |
| `POLKA_KEY` | API key that the Polka payment provider sends with its webhooks | |

All variables are required: the server refuses to start if any of them is missing.

### Running

```bash
npm run dev
```

Pending database migrations are applied automatically on startup. The server is then available at `http://localhost:8080`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Compile and start the server, recompiling and restarting on every change |
| `npm run build` | Type-check and compile TypeScript to `dist/` |
| `npm start` | Run the compiled server from `dist/` |
| `npm test` | Run the unit tests once |
| `npm run generate` | Generate a SQL migration from changes in `src/db/schema.ts` |
| `npm run migrate` | Apply pending migrations to the database |

## Project structure

```
src/
├── index.ts            # App setup, middleware and route registration
├── config.ts           # Loads and validates environment variables
├── auth.ts             # Password hashing, JWTs, refresh tokens, header parsing
├── auth.test.ts        # Unit tests for auth.ts
├── errors.ts           # Custom HTTP error classes (400, 401, 403, 404, 409)
├── middleware.ts       # Response logging, hit counter, error handler
├── api/                # Route handlers
├── app/                # Static website served under /app
└── db/
    ├── index.ts        # Drizzle client
    ├── schema.ts       # Table definitions
    ├── errors.ts       # PostgreSQL error code helpers
    ├── queries/        # Database queries
    └── migrations/     # Generated SQL migrations
```

## Authentication

Chirpy uses two kinds of tokens, both returned by `POST /api/login`:

| Token | Lifetime | Stored in database | Used for |
|---|---|---|---|
| Access token (JWT) | 1 hour | No | Authenticating requests |
| Refresh token | 60 days | Yes | Getting new access tokens; can be revoked |

Send tokens in the `Authorization` header:

```
Authorization: Bearer <token>
```

The Polka webhook uses an API key instead:

```
Authorization: ApiKey <key>
```

## Errors

All errors return a JSON body with this shape:

```json
{
  "error": "Chirp is too long. Max length is 140"
}
```

Unexpected server errors return `500` with a generic message. Details are logged on the server and never sent to the client.

| Status | Meaning |
|---|---|
| `400` | The request body, query or headers are invalid |
| `401` | Missing, invalid or expired credentials |
| `403` | Authenticated, but not allowed to perform this action |
| `404` | The resource does not exist |
| `409` | The request conflicts with existing data (for example, an email already in use) |

## API reference

### Health

#### `GET /api/healthz`

Readiness check. Returns `200` with the plain text body `OK`.

---

### Users

#### `POST /api/users`

Creates a user.

Request:

```json
{
  "email": "lane@example.com",
  "password": "04234"
}
```

Response `201`:

```json
{
  "id": "5a47789c-a617-444a-8a80-b50359247804",
  "email": "lane@example.com",
  "createdAt": "2026-11-24T18:00:00.000Z",
  "updatedAt": "2026-11-24T18:00:00.000Z",
  "isChirpyRed": false
}
```

Errors: `400` invalid body, `409` email already registered.

#### `PUT /api/users`

Updates the email and password of the authenticated user. Requires an access token. Both fields are required.

Request: same shape as `POST /api/users`.

Response `200`: the updated user.

Errors: `400` invalid body, `401` invalid token, `409` email already in use by another user.

---

### Auth

#### `POST /api/login`

Request:

```json
{
  "email": "lane@example.com",
  "password": "04234"
}
```

Response `200`: the user, plus both tokens.

```json
{
  "id": "5a47789c-a617-444a-8a80-b50359247804",
  "email": "lane@example.com",
  "createdAt": "2026-11-24T18:00:00.000Z",
  "updatedAt": "2026-11-24T18:00:00.000Z",
  "isChirpyRed": false,
  "token": "<access token>",
  "refreshToken": "<refresh token>"
}
```

Errors: `400` invalid body, `401` incorrect email or password. The message is the same in both cases, so it doesn't reveal which emails are registered.

#### `POST /api/refresh`

Returns a new access token. Requires a refresh token in the `Authorization: Bearer` header. No request body.

Response `200`:

```json
{
  "token": "<new access token>"
}
```

Errors: `401` if the refresh token doesn't exist, is expired or was revoked.

#### `POST /api/revoke`

Revokes a refresh token (logout). Requires the refresh token in the `Authorization: Bearer` header. No request body.

Response `204`, with no body. Revoking a token that is already revoked or doesn't exist also returns `204`.

---

### Chirps

A chirp can be up to 140 characters long. The words `kerfuffle`, `sharbert` and `fornax` are replaced with `****` (case-insensitive, whole words only: `Sharbert!` is left as is).

#### `GET /api/chirps`

Lists chirps.

| Query parameter | Values | Default | Description |
|---|---|---|---|
| `authorId` | User UUID | | Only return chirps by this user |
| `sort` | `asc`, `desc` | `asc` | Order by creation date |

Example: `GET /api/chirps?authorId=5a47789c-a617-444a-8a80-b50359247804&sort=desc`

Response `200`: an array of chirps. An unknown or malformed `authorId` returns an empty array.

Errors: `400` invalid `sort` value or repeated `authorId`.

#### `POST /api/chirps`

Creates a chirp for the authenticated user. Requires an access token.

Request:

```json
{
  "body": "Hello, world!"
}
```

Response `201`:

```json
{
  "id": "94b7e44c-3604-42e3-bef7-ebfcc3efff8f",
  "createdAt": "2026-11-24T18:00:00.000Z",
  "updatedAt": "2026-11-24T18:00:00.000Z",
  "body": "Hello, world!",
  "userId": "5a47789c-a617-444a-8a80-b50359247804"
}
```

Errors: `400` invalid body or chirp too long, `401` invalid token.

#### `GET /api/chirps/:chirpId`

Response `200`: a single chirp.

Errors: `404` if the chirp doesn't exist or the ID is malformed.

#### `DELETE /api/chirps/:chirpId`

Deletes a chirp. Requires an access token, and only the author can delete their own chirps.

Response `204`, with no body.

Errors: `401` invalid token, `403` not the author, `404` chirp not found.

---

### Webhooks

#### `POST /api/polka/webhooks`

Receives payment events from Polka. Requires `Authorization: ApiKey <POLKA_KEY>`.

Request:

```json
{
  "event": "user.upgraded",
  "data": {
    "userId": "5a47789c-a617-444a-8a80-b50359247804"
  }
}
```

`user.upgraded` marks the user as a Chirpy Red member. Any other event is acknowledged and ignored.

Response `204`, with no body. Polka retries any request that doesn't receive a `2xx` response.

Errors: `400` invalid body, `401` missing or invalid API key, `404` user not found.

---

### Admin

#### `GET /admin/metrics`

Returns an HTML page with the number of requests served under `/app` since the server started.

#### `POST /admin/reset`

Resets the hit counter and **deletes all users** (their chirps and refresh tokens are deleted in cascade). Only works when `PLATFORM=dev`.

Response `200`. Errors: `403` when `PLATFORM` is not `dev`.

---

### Website

#### `GET /app/*`

Serves the static files in `src/app`. Every request under `/app` increments the hit counter shown in `/admin/metrics`.

## Known limitations

This is a learning project. Some things a production system would handle differently:

- Refresh tokens are stored in plain text. Storing a SHA-256 hash would protect active sessions if the database leaked.
- `GET /api/chirps` has no pagination and returns every matching chirp.
- Changing the password doesn't revoke existing refresh tokens.
- Email addresses are not verified, neither on sign-up nor when changed.
- Migrations run on startup, which can cause conflicts if several instances start at the same time.