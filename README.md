# Open Marine Instrumentation

Open-source sailboat instrumentation platform built around Signal K. The platform provides a shared data contract, a simulator that publishes data into Signal K, and an Angular dashboard that consumes the live stream.

## Requirements

- Node.js 20 LTS
- Docker Desktop (Windows) or Docker Engine (Ubuntu)

## Quickstart

1) Start Signal K (Docker)

```bash
cd signalk-runtime
docker compose up -d
docker logs -f signalk
```

2) Build/install contract

```bash
cd ../marine-data-contract
npm install
npm run build
```

3) Run simulator

```bash
cd ../marine-data-simulator
npm install
npm run dev
```

4) Run UI

```bash
cd ../marine-instrumentation-ui
npm install
npm start
```

## Endpoints

- Signal K UI/API: http://localhost:3000
- Signal K WebSocket stream: ws://localhost:3000/signalk/v1/stream

## Screenshots

- [Dashboard overview](docs/screenshots/dashboard-overview.png)
- [Dark mode](docs/screenshots/dark-mode.png)

(Placeholders only; images not included.)
