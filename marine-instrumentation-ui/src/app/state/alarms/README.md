# Alarm System

The OMI alarm system consists of a pure engine, a reactive store, and UI components.

## Submodules

### 1. Alarm Engine (`alarm-engine.ts`)
A pure TypeScript class that evaluates ship data against a set of rules. It is stateless and easily testable.

Currently monitored:
- **Shallow Water**: Triggers based on the `shallowThreshold` preference.
- **Low Voltage**: Triggers if battery voltage drops below 11.5V (warning) or 11.0V (critical).
- **GPS Status**: 
  - `stale`: If coordinates haven't updated in >5s.
  - `lost`: If no coordinate data is available.

### 2. Alarm Store (`alarm-store.service.ts`)
An Angular service that:
- Collects real-time data from `DatapointStoreService`.
- Retrieves user preferences from `PreferencesService`.
- Runs the `AlarmEngine` on every change.
- Maintains acknowledgment state (un-persisted for safety, reset on reload).

### 3. Selectors (`selectors.ts`)
RxJS-based selectors for the UI to consume specific slices of alarm state.

## UI Components

- **Alarm Banner**: Automatically shown at the top of the app when unacknowledged alarms exist.
- **Alarms Page**: accessible via `/alarms`, providing a full history and detailed view of all active alerts.

## Testing
Run unit tests to verify alarm logic:
```bash
npm test -- src/app/state/alarms/alarm-engine.spec.ts
```
