# Roadmap

**Last Updated:** 2026-01-28

---

## Overview

This roadmap outlines the development path for Open Marine Instrumentation from MVP to production-ready system. Development follows agile milestones with iterative refinement and technical debt management.

---

## Completed Milestones ✅

### Milestone 0: Foundation (✅ Completed)

- [x] TypeScript + Angular 21.1 setup
- [x] Signal K integration (WebSocket + REST)
- [x] marine-data-contract package (types, paths, utils)
- [x] Basic simulator with HTTP publisher
- [x] ESLint + Prettier tooling

### Milestone 1: Alarms & Diagnostics Fix (✅ Completed)

**Problem:** Alarms and diagnostics were reading from stale `DataStoreService`, not receiving live data

**Solution:**
- [x] Migrated AlarmService to use `DatapointStoreService`
- [x] Migrated DiagnosticsService to use `DatapointStoreService`
- [x] Fixed alarm thresholds and hysteresis logic
- [x] Added diagnostic health indicators

### Milestone 2: Code Quality (✅ Completed)

**Problem:** ~4,400 lines of dead code accumulated in UI

**Solution:**
- [x] Removed `/pages/chart/` (legacy, 484 lines)
- [x] Removed `/pages/dashboard/` (legacy, 40 lines)
- [x] Removed old SignalK client service (207 lines)
- [x] Removed old chart map service (621 lines)
- [x] Removed duplicate components in `/ui/` (~600 lines)
- [x] Cleaned up `/services/` directory

### Milestone 3: Feature Facade Pattern (✅ Completed)

**Goal:** Standardize architecture across all main routes using facade pattern

**Completed:**
- [x] DashboardFacadeService (orchestrates dashboard + state)
- [x] ChartFacadeService (orchestrates map + chart state)
- [x] AlarmsFacadeService (orchestrates alarm state + filtering)
- [x] DiagnosticsFacadeService (orchestrates diagnostics display)
- [x] Consistent error handling across facades
- [x] Clear separation: page → facade → state/data-access

---

## Current Sprint: Stabilization (COMPLETED 2026-01-28)

### Phase 4: Contract & Data Cleanup

**Target:** Ensure data contract matches actual usage, fix known inconsistencies

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Add `navigation.headingMagnetic` | P1 | DONE | Added to PATHS |
| Fix simulator unit inconsistency | P1 | DONE | COG now radians |
| Update quality enum naming | P2 | DONE | Contract uses "warn" |
| Implement `isSourceValid()` checker | P2 | DONE | Removed from contract (unused) |
| Remove unused type aliases | P3 | DONE | Angle, Speed, Depth, Voltage, Current removed |

**Effort:** 1-2 days

---

## Next Milestones (Planned 📅)

### Milestone 5: Testing Infrastructure

**Goal:** Establish automated test pipeline

| Feature | Scope | Effort |
|---------|-------|--------|
| Unit tests (Vitest) | DatapointStoreService, formatters, calculations | 3 days |
| Integration tests | SignalK client + store flow | 2 days |
| Component tests | Key dashboard components | 3 days |
| E2E tests | Full flow: simulator → UI | 2 days |
| CI pipeline | GitHub Actions | 1 day |

**Expected Impact:** Confidence for refactoring, prevents regressions

---

### Milestone 6: True Wind Implementation

**Goal:** Calculate true wind from apparent wind + boat motion

| Task | Scope |
|------|-------|
| Add TWA/TWS paths to contract | Signal K paths |
| Implement calculation service | Coordinate transformation |
| Add validation rules | Low-speed, invalid-heading handling |
| Wire into dashboard | Display true wind instrument |
| Test with simulator | Verify calculations |

**Expected Impact:** Sailing performance metrics, trim optimization

---

### Milestone 7: Real Sensor Integration (Gateway)

**Goal:** Replace simulator with real NMEA0183 and NMEA2000 adapters

| Adapter | Scope | Status |
|---------|-------|--------|
| NMEA0183 | Serial parser, sentence types | Stub interfaces only |
| NMEA2000 | CAN parser, PGN translation | Stub interfaces only |
| Custom Serial | Generic framing | Stub interfaces only |

**Effort:** 2-3 weeks (complex serial handling, testing)

**Risk:** Electrical integration, cross-platform serial issues

---

### Milestone 8: Offline Support

**Goal:** Enable vessel operation without internet/Signal K

| Feature | Scope |
|--------|-------|
| Tile caching | Store MBTiles offline for map |
| Local storage | Cache last N hours of data |
| Waypoint sync | Store routes locally |
| Fallback mode | Display cached data when offline |

**Effort:** 1 week

---

### Milestone 9: Engine & Motor Metrics

**Goal:** Add engine performance monitoring

| Data Point | Unit | Priority |
|-----------|------|----------|
| `engine.rpm` | RPM | P1 |
| `engine.load` | % | P2 |
| `engine.temperature` | K | P2 |
| `fuel.remaining` | liters | P1 |
| `fuel.rate` | liters/hour | P2 |

**Requires:** New adapters (NMEA0183 engine sentences or NMEA2000 PGNs)

---

### Milestone 10: Solar & Battery SOC

**Goal:** Monitor electrical system energy flow

| Data Point | Unit | Priority |
|-----------|------|----------|
| `electrical.solar.voltage` | V | P1 |
| `electrical.solar.current` | A | P1 |
| `electrical.batteries.house.stateOfCharge` | % | P1 |
| `electrical.batteries.house.temperature` | K | P2 |

**Requires:** New adapters, battery management system integration

---

### Milestone 11: Weather Integration

**Goal:** Overlay forecast weather on chart

| Feature | Scope |
|---------|-------|
| GRIB file support | Download weather routes |
| Overlay visualization | Wind barbs, pressure contours |
| Routing optimization | Recommend routes based on forecast |

**Integration:** OpenWeatherMap API or NOAA

---

### Milestone 12: Mobile Responsive

**Goal:** Optimize UI for tablet/mobile devices

| Target Device | Screen Size | Priority |
|---------------|-------------|----------|
| iPad | 1024×1366 | P1 |
| Android tablet | 800×1280 | P1 |
| Phone portrait | 375×812 | P2 |
| Phone landscape | 812×375 | P2 |

**Effort:** 1 week (layout, touch interactions)

---

## Long-Term Vision 🎯

### Production-Ready (2026 Q3)

- [ ] 80%+ test coverage
- [ ] Real sensor integrations (NMEA0183, NMEA2000)
- [ ] Offline chart + data support
- [ ] Mobile responsive UI
- [ ] Performance optimized (< 3 second load, 60 FPS on charts)
- [ ] Documentation complete (user guide, API docs, deployment)

### Advanced Features (2026 Q4+)

- [ ] Weather integration + routing optimization
- [ ] Autopilot integration
- [ ] Multi-vessel networking
- [ ] Cloud sync (optional)
- [ ] Android/iOS native apps (React Native)

---

## Technical Debt Backlog

| Issue | Severity | Estimate |
|-------|----------|----------|
| Remove dead code (ongoing) | Medium | Done in M2 |
| Fix unit inconsistencies | High | 2 hours |
| Add contract path validation | Medium | 1 day |
| Implement source fallback logic | Medium | 1 day |
| Add proper error handling to WebSocket | High | 2 days |
| Improve chart performance (zoom/pan) | Low | 3 days |
| Reduce bundle size | Low | 2 days |

---

## Dependency Matrix

```
Milestone 5 (Testing)
    ↓ (required by all following)

Milestone 6 (True Wind)
    ↓
Milestone 7 (Real Sensors)
    ├─ enables
    ├─→ Milestone 9 (Engine Metrics)
    └─→ Milestone 10 (Battery SOC)

Milestone 8 (Offline)
    ├─ independent
    └─ enables Milestone 12 (Mobile)

Milestone 11 (Weather)
    ├─ independent
    └─ synergizes with Milestone 12
```

---

## Success Criteria

### Per Milestone

- [x] **M0:** All TypeScript compiles, ESLint passes
- [x] **M1:** Alarms trigger and display in UI
- [x] **M2:** No unused code in source directories
- [x] **M3:** Consistent facade pattern across all main routes
- [ ] **M4:** Contract matches usage, no type mismatches
- [ ] **M5:** >60% test coverage, CI pipeline runs
- [ ] **M6:** True wind displayed on dashboard, validated
- [ ] **M7:** NMEA0183 and NMEA2000 working with real sensors
- [ ] **M8:** UI functional without internet connection
- [ ] **M9:** Engine RPM and fuel display working
- [ ] **M10:** Battery SOC and solar metrics displayed
- [ ] **M11:** Forecast overlaid on chart, routing suggestions
- [ ] **M12:** Touch interactions smooth on tablet

### Overall Project

- **Code Quality:** A (strict TypeScript, ESLint, no dead code)
- **Test Coverage:** B+ (>80% after M5)
- **Documentation:** A (CLAUDE.md, architecture.md, data-model.md all current)
- **Performance:** A (sub-second load, 60 FPS charts)
- **User Experience:** B (functional MVP, mobile TBD)

---

## Release Plan

### v0.2.0 (After M4)
- Contract cleanup + data consistency fixes
- Bug fixes from M1-M3

### v0.3.0 (After M5)
- Complete test suite
- CI/CD pipeline
- Improved stability

### v1.0.0 (After M8)
- MVP feature complete
- Offline support
- Production-ready docs

### v1.1.0 (After M10)
- Engine metrics
- Battery/solar integration

### v2.0.0 (After M12)
- Full sensor suite
- Mobile apps
- Advanced features (weather, routing)

---

## Notes for AI Assistants

When working on features:

1. **Check this roadmap first** - Don't duplicate work
2. **Follow milestone order** - Earlier milestones unblock later ones
3. **Update CLAUDE.md** - Document any new patterns or conventions
4. **Update PROJECT_STATE.md** - Track actual vs. planned progress
5. **Run full test suite** - `npm test` in affected packages
6. **Lint before committing** - `npm run lint && npm run format`

---

## Questions?

See [CLAUDE.md](../CLAUDE.md) for architecture questions, [docs/architecture.md](./architecture.md) for system design, or [docs/data-model.md](./data-model.md) for data specifications.
