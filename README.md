# No Thankiew!

A real-time multiplayer web adaptation of the card game **No Thanks!**, playable across devices on a local network or the internet.

## How it works

- One device acts as the **Master Screen** — the shared game board displayed for everyone to see.
- Each player uses their own phone as a **controller** — scanning a QR code to join and tapping buttons to take or pass cards.
- A **single-device mode** is also available for passing one screen around the table.

## Features

- 3 difficulty modes: Easy (all visible, no timer), Medium (chips hidden, timer), Hard (everything hidden, fast timer with auto-take)
- Real-time sync via WebSockets — all game state lives on the server
- Reconnection support — players who drop mid-game are re-seated automatically using a session token
- Drag-and-drop seating arrangement in the lobby
- Chinese / English language toggle
- Fully scored end screen with per-player breakdown

## Tech Stack

| Layer | Tech |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| Backend | Node.js, Express, Socket.io |
| Frontend | React, Vite, Tailwind CSS, Zustand, react-router-dom |
| Shared | TypeScript types and game constants |

## Project Structure

```
apps/
  client/   — React frontend (Vite)
  server/   — Express + Socket.io backend
packages/
  shared/   — Types and constants shared between client and server
```

## Local Development

```sh
npm install
npm run dev
```

- Client runs at `http://localhost:5173`
- Server runs at `http://localhost:3001`
- Open the client on any device on the same network using your machine's local IP

## Environment Variables

### Server (`apps/server`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port to listen on | `3001` |
| `CLIENT_ORIGIN` | Allowed CORS origin (set to your frontend URL in production) | `*` |

### Client (`apps/client`)

| Variable | Description | Default |
|---|---|---|
| `VITE_SOCKET_URL` | Backend WebSocket URL | Auto-detected from `window.location.hostname:3001` |

## Deployment

- **Frontend**: Vercel — set root directory to `apps/client`, output directory to `dist`
- **Backend**: Render — build with `npm install && npx turbo build --filter=server`, start with `node apps/server/dist/index.js`

Set `VITE_SOCKET_URL` on Vercel to your Render URL, and `CLIENT_ORIGIN` on Render to your Vercel URL.

## Game Rules Summary

- Cards numbered 3–35, 9 randomly removed (24 remain)
- On your turn: flip a card, then **Take it** (gain the card + all chips on it) or **Pass** (spend 1 chip, add it to the card)
- Consecutive cards only score their lowest number
- Remaining chips subtract from your score
- Lowest score wins
