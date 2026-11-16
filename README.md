# Chat Backend — Node.js, TypeScript, PostgreSQL & Firestore

A production-minded starter API for one-to-one chat. PostgreSQL stores users, chat membership and chat metadata. Firestore stores message documents, read receipts and per-user last-seen pointers.

## Requirements

- Node.js 20+
- Docker (or a PostgreSQL 14+ server)
- A Firebase project with Firestore enabled
- A Firebase service account for server-side access

## Quick start

```bash
npm install
cp .env.example .env
docker compose up -d
```

Create a Firebase service account in Firebase Console → Project settings → Service accounts → Generate new private key. Save it as `secrets/firebase-service-account.json` (the directory is git-ignored), then set `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env`. Alternatively, use Application Default Credentials in your deployment environment.

Run the SQL migration and create two test users:

```bash
npm run db:migrate
npm run db:seed
```

The seed command inserts `user-1` and `user-2`. Start the API:

```bash
npm run dev
```

Health check: `GET http://localhost:4000/health`

## Authentication

All `/chat` and `/user` endpoints require a signed JWT bearer token. The token subject (`sub`) is the authenticated user ID. Tokens must be signed with `JWT_SECRET` and use the configured issuer (`JWT_ISSUER`, default `chat-backend`).

Example development token generation (do not expose this secret or endpoint in production):

```ts
import jwt from "jsonwebtoken";
const token = jwt.sign({}, process.env.JWT_SECRET!, {
  subject: "user-1",
  issuer: "chat-backend",
  expiresIn: "1h"
});
console.log(token);
```

The API does not implement login or user registration. Integrate your identity provider and issue JWTs whose subject maps to a row in `users.id`. Never trust a `userId` supplied in a request body as authentication; the server checks it against the JWT subject.

## API

Send `Authorization: Bearer <token>` and `Content-Type: application/json`.

### 1. Create or get a 1:1 chat

`POST /chat/create`

```json
{ "userAId": "user-1", "userBId": "user-2" }
```

Returns `201` for a newly created chat or `200` for an existing chat:

```json
{ "success": true, "data": { "chatId": "uuid", "created": true } }
```

The authenticated user must be one of the two participants. Both users must already exist.

### 2. Send a message

`POST /chat/:chatId/message/send`

```json
{ "senderId": "user-1", "text": "Hello!" }
```

Returns the Firestore message ID, sender, text and ISO timestamp. Sender must be a member of the chat. The authenticated user must match `senderId`.

### 3. Get messages

`GET /chat/:chatId/messages?limit=50&before=<ISO timestamp>`

Returns messages in ascending chronological order. `limit` defaults to 50 and is capped at 100. Optional `before` is an ISO-8601 timestamp for cursor-style pagination. Fetch the next older page by passing the oldest message timestamp as `before`. Messages are ordered by Firestore `createdAt` and document ID for stable ordering.

### 4. Mark a message read

`POST /chat/:chatId/message/:messageId/read`

```json
{ "userId": "user-2" }
```

Writes/merges a receipt at `chats/{chatId}/messages/{messageId}/readReceipts/{userId}`. Repeated calls are idempotent; the first read timestamp is retained.

### 5. Update last-seen message

`POST /chat/:chatId/lastseen`

```json
{ "userId": "user-2", "messageId": "firestore-message-id" }
```

Stores the last-seen pointer at `chats/{chatId}/lastSeen/{userId}`. The message must exist and belong to the chat. The pointer only moves forward in message order.

### 6. List a user's chats

`GET /user/:userId/chats`

Returns chat IDs, member IDs and relational metadata ordered by most recent activity. A user can only list their own chats.

## Data layout

**PostgreSQL**
- `users`: externally managed user identities.
- `chats`: canonical unique pair (`user_low_id`, `user_high_id`) and `last_message_at`.
- `chat_members`: membership rows with foreign keys.

**Firestore**
- `chats/{chatId}/messages/{messageId}`: message content and server timestamp.
- `chats/{chatId}/messages/{messageId}/readReceipts/{userId}`: one receipt per reader.
- `chats/{chatId}/lastSeen/{userId}`: latest message pointer per user.

## Error response format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": []
  }
}
```

The API includes centralized handling for validation errors, malformed JSON, missing resources, authentication failures, PostgreSQL unique/FK errors, Firestore failures, rate limiting and unexpected errors. Internal stack traces are never returned to clients.

## Important production notes

- Configure HTTPS, a strong `JWT_SECRET`, restrictive `CORS_ORIGIN`, secret storage and Firebase IAM least privilege.
- Provision users through your auth/user service before creating chats.
- Firestore and PostgreSQL do not share a distributed transaction. Message writes happen in Firestore first; PostgreSQL chat activity metadata is then updated. A failed metadata update is logged and can be repaired by a background reconciliation job.
- Use a transactional outbox if you require guaranteed cross-store metadata consistency.
- Add abuse controls, moderation, retention policies, backups and monitoring before production launch.
- Firestore timestamp ordering and cursor pagination are used; clients should deduplicate messages by message ID.

## GitHub publishing

Create an **empty public repository** on GitHub (do not initialize it with a README), then from this project directory:

```bash
git init
git add .
git commit -m "Initial chat backend implementation"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Never commit `.env` or Firebase service-account credentials.
