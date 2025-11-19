# TinyLink

TinyLink is a lightweight link shortener built with Node.js, Express, and PostgreSQL. It exposes a JSON API plus a bundled dashboard for creating, searching, and managing short codes, and a minimal stats page for each code.

## Features

- Create short links with optional custom codes (validated against `[A-Za-z0-9]{6,8}`).
- Responsive dashboard with search/filter, click counts, timestamps, and soft-delete controls.
- `/code/:code` stats page that surfaces clicks, creation time, and destination URL.
- Helmet, CORS, and async error handling baked in for safer defaults.

## Requirements

- Node.js 18+ and npm
- PostgreSQL 13+ (or a hosted equivalent)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the `links` table (adjust as needed):

   ```sql
   CREATE TABLE links (
     code        VARCHAR(8) PRIMARY KEY,
     target      TEXT NOT NULL,
     clicks      INTEGER NOT NULL DEFAULT 0,
     last_clicked TIMESTAMPTZ,
     created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
     del_status  BOOLEAN NOT NULL DEFAULT false
   );

   CREATE INDEX IF NOT EXISTS idx_links_target ON links (target);
   ```

3. Copy `.env` and set the following variables:

   ```dotenv
   DATABASE_URL=postgres://user:pass@host:port/db
   BASE_URL=http://localhost:3000
   PORT=3000
   NODE_ENV=development
   ```

4. Start the server:

   ```bash
   # During development (auto-restarts via nodemon)
   npm run dev

   # Production-style run
   npm start
   ```

Visit `http://localhost:3000` for the dashboard, or `http://localhost:3000/code/<yourCode>` for stats about a specific link.

