# Signal K Runtime

Runtime local de Signal K para desarrollo de `open-marine`.

Estado: 2026-02-19.

## Objetivo

Levantar un servidor Signal K reproducible en Docker para conectar UI, simulator y gateway.

## Archivos clave

- `docker-compose.yml`
- `data/` (persistencia de configuracion de Signal K)

## Arranque

```powershell
docker compose up -d
docker logs -f signalk
```

Abrir:

- `http://localhost:3000`

## Parada

```powershell
docker compose down
```

## Notas de configuracion

- El compose actual usa `entrypoint` directo al binario de Signal K.
- Puerto publicado: `3000:3000`.
- TZ actual: `Europe/Madrid`.

## Problemas frecuentes

## Puerto ocupado

- Cambiar mapeo en `docker-compose.yml` o liberar el puerto 3000.

## No responde la UI de Signal K

- Revisar logs con `docker logs signalk`.
- Verificar que Docker tenga permisos de volumen en `./data`.

## Integracion con el resto del stack

- UI consume REST/WS desde este runtime.
- Simulator publica deltas al stream de este runtime.
- Gateway AIS reenvia NMEA para ingestion en este runtime.
