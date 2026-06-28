import Database, { type Database as DatabaseType } from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  SimulationEvent,
  SimulationRun,
  SimulationRunSummary,
  SimulationSample,
  SimulationSampleBatch,
  SimulationScenarioDocument,
} from "@omi/marine-data-contract";
import type { SimulationStore } from "../core/types.js";

export class SqliteStore implements SimulationStore {
  readonly name = "sqlite";
  private db: DatabaseType | null = null;

  constructor(
    private readonly filename: string,
    private readonly retentionDays = 90,
    private readonly maxBytes = 1_073_741_824,
  ) {}

  open(): void {
    mkdirSync(dirname(this.filename), { recursive: true });
    this.db = new Database(this.filename);
    this.database.pragma("journal_mode = WAL");
    this.database.pragma("synchronous = NORMAL");
    this.ensureSchema();
    this.migrateV1ToV2IfNeeded();
    this.applyRetention();
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  saveScenario(scenario: SimulationScenarioDocument): void {
    this.database.prepare(`
      INSERT INTO scenarios (id, version, name, description, is_preset, document_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        version = excluded.version,
        name = excluded.name,
        description = excluded.description,
        is_preset = excluded.is_preset,
        document_json = excluded.document_json,
        updated_at = excluded.updated_at
    `).run(
      scenario.id,
      scenario.version,
      scenario.name,
      scenario.description,
      scenario.isPreset ? 1 : 0,
      JSON.stringify(scenario),
      scenario.createdAt,
      scenario.updatedAt,
    );
  }

  getScenario(id: string): SimulationScenarioDocument | null {
    const row = this.database.prepare("SELECT document_json FROM scenarios WHERE id = ?").get(id) as { document_json: string } | undefined;
    return row ? JSON.parse(row.document_json) as SimulationScenarioDocument : null;
  }

  listScenarios(): SimulationScenarioDocument[] {
    const rows = this.database.prepare("SELECT document_json FROM scenarios ORDER BY is_preset DESC, name ASC").all() as Array<{ document_json: string }>;
    return rows.map((row) => JSON.parse(row.document_json) as SimulationScenarioDocument);
  }

  deleteScenario(id: string): void {
    this.database.prepare("DELETE FROM scenarios WHERE id = ? AND is_preset = 0").run(id);
  }

  saveRun(run: SimulationRun): void {
    this.database.prepare(`
      INSERT INTO runs (
        id, scenario_id, scenario_version, status, mode, speed, seed, started_utc,
        completed_utc, simulated_time_ms, parameters_json, steps_json,
        assertions_json, failure_reason, snapshot_json, last_sequence
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        completed_utc = excluded.completed_utc,
        simulated_time_ms = excluded.simulated_time_ms,
        steps_json = excluded.steps_json,
        assertions_json = excluded.assertions_json,
        failure_reason = excluded.failure_reason,
        snapshot_json = excluded.snapshot_json,
        last_sequence = excluded.last_sequence
    `).run(
      run.id,
      run.scenarioId,
      run.scenarioVersion,
      run.status,
      run.mode,
      run.speed,
      run.seed,
      run.startedAtUtc,
      run.completedAtUtc ?? null,
      run.simulatedTimeMs,
      JSON.stringify(run.parameters),
      JSON.stringify(run.steps),
      JSON.stringify(run.assertions),
      run.failureReason ?? null,
      run.channelSnapshot ? JSON.stringify(run.channelSnapshot) : null,
      run.lastSequence,
    );
  }

  getRun(id: string): SimulationRun | null {
    const row = this.database.prepare("SELECT * FROM runs WHERE id = ?").get(id) as RunRow | undefined;
    return row ? this.hydrateRun(row) : null;
  }

  listRuns(limit = 100): SimulationRunSummary[] {
    const rows = this.database.prepare(`
      SELECT id, scenario_id, status, started_utc, completed_utc, simulated_time_ms, mode, failure_reason
      FROM runs ORDER BY started_utc DESC LIMIT ?
    `).all(limit) as Array<{
      id: string;
      scenario_id: string;
      status: string;
      started_utc: string;
      completed_utc: string | null;
      simulated_time_ms: number;
      mode: string;
      failure_reason: string | null;
    }>;
    return rows.map((row) => ({
      id: row.id,
      scenarioId: row.scenario_id,
      status: row.status as SimulationRun["status"],
      startedAtUtc: row.started_utc,
      completedAtUtc: row.completed_utc ?? undefined,
      simulatedTimeMs: row.simulated_time_ms,
      mode: row.mode as SimulationRun["mode"],
      failureReason: row.failure_reason ?? undefined,
    }));
  }

  saveEvent(event: SimulationEvent): void {
    this.database.prepare(`
      INSERT INTO events (id, run_id, sequence, kind, simulated_time_ms, at_utc, message, step_id, channel_id, value_json, assertion_json, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(run_id, sequence) DO UPDATE SET
        kind = excluded.kind,
        simulated_time_ms = excluded.simulated_time_ms,
        at_utc = excluded.at_utc,
        message = excluded.message,
        step_id = excluded.step_id,
        channel_id = excluded.channel_id,
        value_json = excluded.value_json,
        assertion_json = excluded.assertion_json,
        payload_json = excluded.payload_json
    `).run(
      event.id,
      event.runId,
      event.sequence,
      event.kind,
      event.atSimulatedMs,
      event.atUtc,
      event.message,
      event.stepId ?? null,
      event.channelId ?? null,
      event.value !== undefined ? JSON.stringify(event.value) : null,
      event.assertion ? JSON.stringify(event.assertion) : null,
      event.payload ? JSON.stringify(event.payload) : null,
    );
  }

  getEvents(runId: string, afterSequence = 0): SimulationEvent[] {
    const rows = this.database.prepare(`
      SELECT * FROM events WHERE run_id = ? AND sequence > ? ORDER BY sequence ASC
    `).all(runId, afterSequence) as EventRow[];
    return rows.map((row) => ({
      id: row.id,
      runId: row.run_id,
      sequence: row.sequence,
      kind: row.kind as SimulationEvent["kind"],
      atSimulatedMs: row.simulated_time_ms,
      atUtc: row.at_utc,
      message: row.message,
      ...(row.step_id ? { stepId: row.step_id } : {}),
      ...(row.channel_id ? { channelId: row.channel_id } : {}),
      ...(row.value_json ? { value: JSON.parse(row.value_json) } : {}),
      ...(row.assertion_json ? { assertion: JSON.parse(row.assertion_json) as SimulationEvent["assertion"] } : {}),
      ...(row.payload_json ? { payload: JSON.parse(row.payload_json) as Record<string, unknown> } : {}),
    }));
  }

  saveSampleBatch(batch: SimulationSampleBatch): void {
    const insert = this.database.prepare(`
      INSERT INTO samples (run_id, tick, simulated_time_ms, channel_id, value_json, quality)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const transaction = this.database.transaction((samples: SimulationSample[]) => {
      for (const sample of samples) {
        insert.run(batch.runId, batch.tick, batch.simulatedTimeMs, sample.channelId, JSON.stringify(sample.value), sample.quality);
      }
    });
    transaction(batch.samples);
  }

  getSamples(
    runId: string,
    options: {
      channels?: string[];
      fromSimulatedMs?: number;
      toSimulatedMs?: number;
      maxPoints?: number;
      afterTick?: number;
    } = {},
  ): SimulationSampleBatch[] {
    let sql = `
      SELECT run_id, tick, simulated_time_ms, channel_id, value_json, quality
      FROM samples WHERE run_id = ?
    `;
    const params: Array<string | number> = [runId];
    if (options.channels && options.channels.length > 0) {
      sql += ` AND channel_id IN (${options.channels.map(() => "?").join(",")})`;
      params.push(...options.channels);
    }
    if (options.fromSimulatedMs !== undefined) {
      sql += " AND simulated_time_ms >= ?";
      params.push(options.fromSimulatedMs);
    }
    if (options.toSimulatedMs !== undefined) {
      sql += " AND simulated_time_ms <= ?";
      params.push(options.toSimulatedMs);
    }
    if (options.afterTick !== undefined) {
      sql += " AND tick > ?";
      params.push(options.afterTick);
    }
    sql += " ORDER BY tick ASC, channel_id ASC";
    if (options.maxPoints !== undefined) {
      sql += " LIMIT ?";
      params.push(options.maxPoints);
    }
    const rows = this.database.prepare(sql).all(...params) as SampleRow[];
    const batches = new Map<number, SimulationSampleBatch>();
    for (const row of rows) {
      const batch = batches.get(row.tick) ?? {
        runId: row.run_id,
        tick: row.tick,
        simulatedTimeMs: row.simulated_time_ms,
        samples: [],
      };
      batch.samples.push({
        channelId: row.channel_id,
        value: JSON.parse(row.value_json),
        quality: row.quality as SimulationSample["quality"],
      });
      batches.set(row.tick, batch);
    }
    return Array.from(batches.values());
  }

  applyRetention(): void {
    const cutoff = new Date(Date.now() - this.retentionDays * 86_400_000).toISOString();
    const expired = this.database.prepare("SELECT id FROM runs WHERE started_utc < ?").all(cutoff) as Array<{ id: string }>;
    for (const { id } of expired) this.deleteRun(id);

    const dbSize = this.database.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get() as { size: number } | undefined;
    if (dbSize && dbSize.size > this.maxBytes) {
      const oldest = this.database.prepare("SELECT id FROM runs ORDER BY started_utc ASC LIMIT 10").all() as Array<{ id: string }>;
      for (const { id } of oldest) this.deleteRun(id);
    }
    this.database.exec("VACUUM");
  }

  private get database(): DatabaseType {
    if (!this.db) throw new Error("sqlite-store-not-open");
    return this.db;
  }

  private ensureSchema(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS scenarios (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        is_preset INTEGER NOT NULL DEFAULT 0,
        document_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        scenario_id TEXT NOT NULL,
        scenario_version TEXT NOT NULL DEFAULT '1.0.0',
        status TEXT NOT NULL,
        mode TEXT NOT NULL,
        speed REAL NOT NULL,
        seed INTEGER NOT NULL,
        started_utc TEXT NOT NULL,
        completed_utc TEXT,
        simulated_time_ms INTEGER NOT NULL DEFAULT 0,
        parameters_json TEXT NOT NULL,
        steps_json TEXT NOT NULL DEFAULT '[]',
        assertions_json TEXT NOT NULL DEFAULT '[]',
        failure_reason TEXT,
        snapshot_json TEXT,
        last_sequence INTEGER NOT NULL DEFAULT 0,
        migrated_from_v1 INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS events (
        id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        kind TEXT NOT NULL,
        simulated_time_ms INTEGER NOT NULL,
        at_utc TEXT NOT NULL,
        message TEXT NOT NULL,
        step_id TEXT,
        channel_id TEXT,
        value_json TEXT,
        assertion_json TEXT,
        payload_json TEXT,
        PRIMARY KEY (run_id, sequence)
      );
      CREATE TABLE IF NOT EXISTS samples (
        run_id TEXT NOT NULL,
        tick INTEGER NOT NULL,
        simulated_time_ms INTEGER NOT NULL,
        channel_id TEXT NOT NULL,
        value_json TEXT NOT NULL,
        quality TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_runs_started ON runs(started_utc DESC);
      CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id, sequence);
      CREATE INDEX IF NOT EXISTS idx_samples_run_tick ON samples(run_id, tick);
      CREATE INDEX IF NOT EXISTS idx_samples_run_channel_time ON samples(run_id, channel_id, simulated_time_ms);
    `);
  }

  private migrateV1ToV2IfNeeded(): void {
    const hasBenchId = this.database.prepare("SELECT 1 FROM pragma_table_info('runs') WHERE name = 'bench_id'").get();
    if (!hasBenchId) return;

    this.database.exec(`
      ALTER TABLE runs RENAME TO runs_v1;
      ALTER TABLE events RENAME TO events_v1;
      ALTER TABLE samples RENAME TO samples_v1;
    `);
    this.ensureSchema();
    this.database.exec(`
      INSERT INTO runs (
        id, scenario_id, scenario_version, status, mode, speed, seed, started_utc,
        completed_utc, simulated_time_ms, parameters_json, steps_json, assertions_json,
        failure_reason, snapshot_json, last_sequence, migrated_from_v1
      )
      SELECT
        id, bench_id, '1.0.0', status, 'data', 1.0, 0, started_utc,
        completed_utc, 0, payload_json, '[]', '[]', NULL, NULL, 0, 1
      FROM runs_v1;

      INSERT INTO events (
        id, run_id, sequence, kind, simulated_time_ms, at_utc, message,
        step_id, channel_id, value_json, assertion_json, payload_json
      )
      SELECT
        run_id || '-' || sequence, run_id, sequence, kind, CAST(monotonic_ms AS INTEGER), at_utc,
        COALESCE(json_extract(payload_json, '$.message'), ''), NULL,
        json_extract(payload_json, '$.channelId'),
        json_extract(payload_json, '$.value'),
        json_extract(payload_json, '$.assertion'),
        payload_json
      FROM events_v1;

      INSERT INTO samples (run_id, tick, simulated_time_ms, channel_id, value_json, quality)
      SELECT run_id, sequence, CAST(monotonic_ms AS INTEGER), signal_id, value_json, 'good'
      FROM samples_v1;

      DROP TABLE runs_v1;
      DROP TABLE events_v1;
      DROP TABLE samples_v1;
    `);
  }

  private deleteRun(id: string): void {
    this.database.prepare("DELETE FROM samples WHERE run_id = ?").run(id);
    this.database.prepare("DELETE FROM events WHERE run_id = ?").run(id);
    this.database.prepare("DELETE FROM runs WHERE id = ?").run(id);
  }

  private hydrateRun(row: RunRow): SimulationRun {
    return {
      id: row.id,
      scenarioId: row.scenario_id,
      scenarioVersion: row.scenario_version,
      status: row.status as SimulationRun["status"],
      mode: row.mode as SimulationRun["mode"],
      speed: row.speed,
      seed: row.seed,
      parameters: JSON.parse(row.parameters_json) as SimulationRun["parameters"],
      startedAtUtc: row.started_utc,
      completedAtUtc: row.completed_utc ?? undefined,
      simulatedTimeMs: row.simulated_time_ms,
      steps: JSON.parse(row.steps_json) as SimulationRun["steps"],
      assertions: JSON.parse(row.assertions_json) as SimulationRun["assertions"],
      lastSequence: row.last_sequence,
      failureReason: row.failure_reason ?? undefined,
      channelSnapshot: row.snapshot_json ? JSON.parse(row.snapshot_json) as SimulationRun["channelSnapshot"] : undefined,
    };
  }
}

interface RunRow {
  id: string;
  scenario_id: string;
  scenario_version: string;
  status: string;
  mode: string;
  speed: number;
  seed: number;
  started_utc: string;
  completed_utc: string | null;
  simulated_time_ms: number;
  parameters_json: string;
  steps_json: string;
  assertions_json: string;
  failure_reason: string | null;
  snapshot_json: string | null;
  last_sequence: number;
}

interface EventRow {
  id: string;
  run_id: string;
  sequence: number;
  kind: string;
  simulated_time_ms: number;
  at_utc: string;
  message: string;
  step_id: string | null;
  channel_id: string | null;
  value_json: string | null;
  assertion_json: string | null;
  payload_json: string | null;
}

interface SampleRow {
  run_id: string;
  tick: number;
  simulated_time_ms: number;
  channel_id: string;
  value_json: string;
  quality: string;
}

