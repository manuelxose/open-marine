# Marine Data Simulator

Node.js TypeScript service that publishes simulated marine data into Signal K.

## Requirements

- Node.js 20 LTS
- Signal K server running (see `../signalk-runtime`)

## Install

```bash
npm install
```

## Run (dev)

```bash
npm run dev
```

If your Signal K server requires authentication for writes, set an API token:

```bash
# PowerShell
$env:SIGNALK_TOKEN="your-token"
npm run dev
```

## Example commands

```bash
npm run dev -- --host http://localhost:3000 --scenario basic-cruise --rate 1
```

## Scenarios

- basic-cruise: steady navigation with smooth trajectory, shallow-water depth events, and apparent wind with gusts

## Notes

- Publishes deltas via WebSocket stream `/signalk/v1/stream` (subscribe=none).
- When `SIGNALK_TOKEN` is set, it is passed as a WebSocket query token.
- Adjust the rate with `--rate` to speed up or slow down updates.
- Depth follows a seabed profile with occasional shallow-water events.
- Apparent wind includes gust bursts on top of a smoothed average.
- House battery simulates charge/discharge cycles with voltage sag under load.
