# Supply Chain Route Intelligence

Production-grade route optimization and live disruption management for supply chain logistics.

## Features

- **Real Route Calculation** — OSRM, GraphHopper, OpenRouteService with automatic fallback
- **Live Disruption Detection** — NewsAPI, TomTom Traffic, Open511
- **Multi-Disruption Analysis** — Select multiple incidents, compute alternate routes
- **Fact-Based Metrics** — Distance, time, cost, and risk from real data
- **Scenario Persistence** — Firestore or in-memory storage with audit trail
- **AI-Powered Reasoning** — Gemini-powered route explanations with fallback

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│  React/Vite │────▶│  Express API│────▶│ Routing Services│
│   (Preact)  │     │   (Node.js) │     │ OSRM/GH/ORS     │
└─────────────┘     └──────┬──────┘     └─────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐ ┌──────────┐ ┌──────────┐
        │ NewsAPI │ │  TomTom  │ │ Open511  │
        └─────────┘ └──────────┘ └──────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Firestore   │
                    │  (or memory) │
                    └──────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install -g yarn
yarn install

# Terminal 1 — API
yarn workspace @bal/api dev

# Terminal 2 — Web
yarn workspace @bal/web dev

# Open http://localhost:5173
```

### With Live Disruptions

```bash
export NEWSAPI_KEY=your_key_here
yarn workspace @bal/api dev
```

## Configuration

| Variable | Purpose |
|----------|---------|
| `OSRM_BASE_URL` | Self-hosted OSRM instance |
| `GRAPHHOPPER_URL` / `GRAPHHOPPER_API_KEY` | GraphHopper routing |
| `ORS_API_KEY` | OpenRouteService API key |
| `NEWSAPI_KEY` | News-based disruptions |
| `TOMTOM_API_KEY` | Real-time traffic incidents |
| `OPEN511_BASE_URL` | Standardized traffic data |
| `GEMINI_API_KEY` | AI reasoning generation |
| `GCP_PROJECT_ID` | Firestore persistence |
| `USE_IN_MEMORY_DB=true` | Force in-memory storage |

## API

### Compute Route
```bash
POST /api/routes/compute
{
  "source": {"lat": 40.7128, "lon": -74.0060},
  "destination": {"lat": 34.0522, "lon": -118.2437},
  "label": "NYC to LA"
}
```

### Compute Alternate Route
```bash
POST /api/routes/disruption
{
  "scenario_id": "uuid",
  "incidents": [
    {"id": "i1", "category": "construction", "severity": "high",
     "location": {"lat": 38.5, "lon": -120.0}, "description": "..."}
  ]
}
```

### Chat
```bash
POST /api/chat
{"scenario_id": "uuid", "message": "Should we dispatch?"}
```

## Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Run API + Web concurrently |
| `yarn test` | Run all tests |
| `yarn test:api` | API tests (Jest) |
| `yarn test:web` | Web tests (Vitest) |
| `yarn test:e2e` | E2E tests (Playwright) |
| `yarn build` | Build for production |

## Tech Stack

- **Frontend**: Preact, Vite, Leaflet, OpenStreetMap
- **Backend**: Express, Zod, UUID
- **Routing**: OSRM, GraphHopper, OpenRouteService
- **Disruptions**: NewsAPI, TomTom, Open511
- **Storage**: Firestore / in-memory with disk backup
- **AI**: Google Gemini (with graceful fallback)
- **Testing**: Jest, Vitest, Playwright

## License

MIT

