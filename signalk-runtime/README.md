# Signal K Runtime

Dockerized Signal K server for local development.

## Prerequisites

- Docker Desktop (Windows) or Docker Engine + Docker Compose (Ubuntu)

## Commands

```bash
docker compose up -d
docker logs -f signalk
```

Open http://localhost:3000

## Security (local dev)

Security is disabled in `docker-compose.yml` so local writes are open without tokens. To re-enable security, remove the `entrypoint` override (and optional `IS_IN_DOCKER` env var) and restart the container.

## Troubleshooting

- Port 3000 already in use: stop the conflicting process or change the host port mapping in `docker-compose.yml`.
- Container fails to start: inspect logs with `docker logs signalk` and confirm Docker has access to the drive.
