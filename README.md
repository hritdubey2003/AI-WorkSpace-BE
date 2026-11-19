# AI Workspace — Backend

REST API and real-time server for **AI Workspace**, a collaborative document editor with built-in AI assistance. Built with Express, Prisma (PostgreSQL), Socket.io and the OpenAI API.

The frontend lives in [`../AI-WorkSpace-FE`](../AI-WorkSpace-FE).

## Features

- **Authentication**: register, log in, JWT-based sessions (passwords hashed with bcrypt)
- **Workspaces**: create and delete workspaces, invite members, assign `OWNER` / `EDITOR` / `VIEWER` roles
- **Documents**: create, read, update and delete documents inside a workspace
- **Document sharing**: share individual documents with other users as `EDITOR` or `VIEWER`
- **Real-time collaboration**: live edits, presence and typing indicators over Socket.io, with debounced auto-save to the database
- **AI tools** (OpenAI `gpt-4o-mini`): summarize a document, improve its writing, or extract action items

## Tech stack

| Layer     | Technology                     |
| --------- | ------------------------------ |
| Runtime   | Node.js                        |
| Framework | Express 4                      |
| Database  | PostgreSQL + Prisma ORM 6      |
| Real-time | Socket.io 4                    |
| Auth      | jsonwebtoken, bcryptjs         |
| AI        | OpenAI Node SDK                |

## Project structure

```
AI-WorkSpace-BE/
├── prisma/
│   ├── schema.prisma          # Data models
│   └── migrations/            # SQL migrations
└── src/
    ├── server.js              # App entry: Express + Socket.io setup
    ├── config/                # Prisma client, OpenAI client
    ├── constants/             # Error messages
    ├── controllers/           # Request handlers
    ├── middleware/            # JWT auth, error handler
    ├── routes/                # Route definitions
    ├── services/              # Business logic and DB access
    ├── sockets/               # Real-time document collaboration
    └── utils/                 # JWT helpers
```

## Getting started

### Prerequisites

- Node.js 18+
- A running PostgreSQL instance
- An OpenAI API key (needed for the AI endpoints)

### 1. Install dependencies

```bash
npm install
```

`postinstall` runs `prisma generate` automatically.

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ai_workspace"
JWT_SECRET="replace-with-a-long-random-string"
JWT_EXPIRES_IN="7d"
OPENAI_API_KEY="sk-..."
PORT=5000
CLIENT_URL="http://localhost:3000"
```

| Variable         | Description                                                      |
| ---------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string used by Prisma                      |
| `JWT_SECRET`     | Secret used to sign and verify JWTs                              |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`, `12h`)                                |
| `OPENAI_API_KEY` | OpenAI API key for the AI endpoints                              |
| `PORT`           | Port the HTTP and Socket.io server listens on                    |
| `CLIENT_URL`     | Frontend origin allowed by CORS (both REST and Socket.io)        |

### 3. Set up the database

```bash
npm run prisma:migrate
```

### 4. Run the server

```bash
npm run dev     # development, with nodemon auto-reload
npm start       # production
```

The server starts at `http://localhost:5000` by default. Check it with `GET /health`.

## Scripts

| Script                    | Description                              |
| ------------------------- | ---------------------------------------- |
| `npm run dev`             | Start with nodemon                       |
| `npm start`               | Start with node                          |
| `npm run prisma:migrate`  | Create/apply migrations (`prisma migrate dev`) |
| `npm run prisma:generate` | Regenerate the Prisma client             |
| `npm run prisma:studio`   | Open Prisma Studio to browse the data    |

## Data model

- **User**: `email` (unique), `name`, hashed `password`
- **Workspace**: `name`, optional `description`
- **WorkspaceMember**: links a user to a workspace with a `WorkspaceRole` (`OWNER`, `EDITOR`, `VIEWER`)
- **Document**: `title`, `content`, `emoji`; belongs to a workspace and an author
- **DocumentCollaborator**: shares a single document with a user under a `CollaboratorRole` (`EDITOR`, `VIEWER`)

See [`prisma/schema.prisma`](prisma/schema.prisma) for the full schema.

## API reference

All routes are prefixed with `/api`. Every route except register and login needs the header:

```
Authorization: Bearer <token>
```

### Auth: `/api/auth`

| Method | Path        | Description                   |
| ------ | ----------- | ----------------------------- |
| POST   | `/register` | Create an account             |
| POST   | `/login`    | Log in and receive a JWT      |
| GET    | `/me`       | Get the current user          |

### Workspaces: `/api/workspaces`

| Method | Path                       | Description                                  |
| ------ | -------------------------- | -------------------------------------------- |
| POST   | `/`                        | Create a workspace (creator becomes `OWNER`) |
| GET    | `/`                        | List the current user's workspaces           |
| GET    | `/:id`                     | Get a workspace                              |
| DELETE | `/:id`                     | Delete a workspace (owner only)              |
| GET    | `/:id/members/search`      | Search users to add as members               |
| POST   | `/:id/members`             | Add a member (`EDITOR` or `VIEWER`)          |
| PATCH  | `/:id/members/:userId`     | Change a member's role                       |
| DELETE | `/:id/members/:userId`     | Remove a member                              |

### Documents: `/api/documents`

| Method | Path                     | Description                                   |
| ------ | ------------------------ | --------------------------------------------- |
| POST   | `/`                      | Create a document                             |
| GET    | `/workspace/:workspaceId`| List documents in a workspace                 |
| GET    | `/shared-with-me`        | List documents shared with the current user   |
| GET    | `/:id`                   | Get a document                                |
| PATCH  | `/:id`                   | Update a document                             |
| DELETE | `/:id`                   | Delete a document                             |
| POST   | `/:id/share`             | Share a document with a user                  |
| DELETE | `/:id/share/:userId`     | Remove a collaborator                         |
| DELETE | `/:id/share`             | Leave a document shared with you              |
| GET    | `/:id/collaborators`     | List a document's collaborators               |

### AI: `/api/ai`

| Method | Path                | Description                              |
| ------ | ------------------- | ---------------------------------------- |
| POST   | `/summarize/:docId` | Summarize the document                   |
| POST   | `/improve/:docId`   | Rewrite the document with better writing |
| POST   | `/tasks/:docId`     | Extract a numbered list of action items  |

### Errors

Errors use a consistent shape:

```json
{
  "success": false,
  "error": { "code": "AUTH_REQUIRED", "message": "..." }
}
```

## Real-time events (Socket.io)

Connect with the JWT in the handshake:

```js
io(SERVER_URL, { auth: { token } });
```

Connections without a valid token are rejected.

| Direction       | Event                  | Payload                                    |
| --------------- | ---------------------- | ------------------------------------------ |
| Client → Server | `join-document`        | `{ docId }`                                |
| Client → Server | `document-change`      | `{ docId, content?, title? }`              |
| Client → Server | `user-typing`          | `{ docId }`                                |
| Client → Server | `leave-document`       | `{ docId }`                                |
| Server → Client | `document-loaded`      | `{ id, title, content, emoji }`            |
| Server → Client | `document-updated`     | `{ content, title, updatedBy }`            |
| Server → Client | `collaborators-update` | `{ count, userIds }`                       |
| Server → Client | `collaborator-typing`  | `{ userId }`                               |
| Server → Client | `error`                | `{ message }`                              |

`document-change` is broadcast to the other users in the room and saved to the database after 2 seconds without further changes. Users with view-only access get an `error` event instead.
