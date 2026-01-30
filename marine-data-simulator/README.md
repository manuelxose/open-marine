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
# Basic sailing with wind gusts and shallow water events
npm run dev -- --host http://localhost:3000 --scenario basic-cruise --rate 1

# Harbor maneuvering with 3 specific targets (Tug, Pilot, Barge)
npm run dev -- --host http://localhost:3000 --scenario harbor-traffic --rate 2

# High density traffic for stress testing collision alarms (25 targets)
npm run dev -- --host http://localhost:3000 --scenario busy-shipping-lane --rate 1

# Failures cascade: Depth (15s) -> Battery (30s) -> AIS (45s) -> Wind (60s)
npm run dev -- --host http://localhost:3000 --scenario combined-failures --rate 1

# Simple crossing situation
npm run dev -- --host http://localhost:3000 --scenario coastal-run --rate 1

# Anchored boat with poor GPS reception
npm run dev -- --host http://localhost:3000 --scenario anchored-stale --rate 1
```

## Scenarios Detail

### 1. `basic-cruise` (Default)
**Best for**: General dashboard testing, wind displays, depth alarms.
- **Ownship**: Sailing at ~3.2 knots, Southbound.
- **Environment**:
  - True/Apparent wind with random gusts.
  - Depth changes with random "shallow water" events (testing depth alarms).
  - Battery discharge/charge cycles (testing electrical panels).
- **Targets**: 
  - One "intruder" (BLACK PEARL) on a converging course.

### 2. `busy-shipping-lane` (New)
**Best for**: AIS list visualization, AIS styling, CPA/TCPA alarms, performance testing.
- **Ownship**: Motoring North at 6 knots.
- **Targets**: 
  - **25 AIS Targets** generated programmatically.
  - Includes Cargo, Passenger, Fishing, Pleasure, and Tugs.
  - **3 Collision Threats**: Generated on high-speed collision courses to trigger CPA alerts immediately.
  - **Random Traffic**: 22 other vessels moving in random directions at varied speeds (2-22 knots).

### 3. `harbor-traffic`
**Best for**: Close-quarters maneuvering, static targets.
- **Ownship**: Moving slowly in a harbor.
- **Targets**:
  - `Harbor Tug`: Moving.
  - `Pilot Boat`: Fast moving.
  - `Anchored Barge`: Stationary (SOG 0).

### 4. `combined-failures` (New)
**Best for**: Testing alarm system prioritization and UI clutter.
- **Sequence**:
  - **0s**: Normal operation.
  - **15s**: Depth drops to 1.8m (Shallow Alarm).
  - **30s**: Voltage drops to 10.5V (Battery Critical).
  - **45s**: "COLLISION TESTER" vessel appears directly ahead at 15kn (CPA < 0.5nm).
  - **60s**: Wind gusts to 45 knots (High Wind).

### 5. `coastal-run`
**Best for**: Simple navigation plotting.
- **Ownship**: Steady course along the coast.
- **Targets**: One ferry crossing diagonally.

### 5. `anchored-stale`
**Best for**: Testing system status handling (GPS lost, old data).
- **Ownship**: Anchored.
- **Behavior**: GPS position updates stop frequently to simulate signal loss, testing "Stale Data" indicators in the UI.

## Configuration

To modify a scenario or create a new one:
1. Create a new file in `src/scenarios/` (copying `busyShippingLane.ts` is a good start).
2. Register it in `src/index.ts` in the `scenarios` object.
3. Re-run `npm run dev`.

All scenarios output standard Signal K Delta messages via WebSocket.
- Adjust the rate with `--rate` to speed up or slow down updates.
- Depth follows a seabed profile with occasional shallow-water events.
- Apparent wind includes gust bursts on top of a smoothed average.
- House battery simulates charge/discharge cycles with voltage sag under load.
