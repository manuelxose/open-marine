import Database, { type Database as DatabaseType } from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  SimulationEvent,
  SimulationRun,
  SimulationRunSummary,
  SimulationSampleBatch,
  SimulationScenarioDocument,
} from "@omi/marine-data-contract";

export interface StoredRunSummary extends SimulationRunSummary {}

export class SimulationDatabase {
  private dirty = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly db: DatabaseType;

  private constructor(
    filename: string,
    private readonly retentionDays: number,
    private readonly maxBytes: number,
  ) {
    mkdirSync(dirname(filename), { recursive: true });
    this.db = new Database(filename);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.db.exec(`
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
        status TEXT NOT NULL,
        mode TEXT NOT NULL,
        speed REAL NOT NULL,
        seed INTEGER NOT NULL,
        started_utc TEXT NOT NULL,
        completed_utc TEXT,
        simulated_time_ms INTEGER NOT NULL DEFAULT 0,
        parameters_json TEXT NOT NULL,
        snapshot_json TEXT,
        migrated_from_v1 INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS events (
        run_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        kind TEXT NOT NULL,
        simulated_time_ms INTEGER NOT NULL,
        at_utc TEXT NOT NULL,
        message TEXT NOT NULL,
        channel_id TEXT,
        value_json TEXT,
        assertion_json TEXT,
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
    this.applyRetention();
  }

  static open(
    filename: string,
    retentionDays: number,
    maxBytes: number,
  ): SimulationDatabase {
    return new SimulationDatabase(filename, retentionDays, maxBytes);
  }

  // ── Scenarios ───────────────────────────────────────────────────────────

  saveScenario(scenario: SimulationScenarioDocument): void {
    const stmt = this.db.prepare(`
      INSERT INTO scenarios (id, version, name, description, is_preset, document_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        version = excluded.version,
        name = excluded.name,
        description = excluded.description,
        is_preset = excluded.is_preset,
        document_json = excluded.document_json,
        updated_at = excluded.updated_at
    `);
    stmt.run(
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
    const row = this.db.prepare("SELECT document_json FROM scenarios WHERE id = ?").get(id) as
      | { document_json: string }
      | undefined;
    return row ? JSON.parse(row.document_json) as SimulationScenarioDocument : null;
  }

  listScenarios(): SimulationScenarioDocument[] {
    const rows = this.db.prepare("SELECT document_json FROM scenarios ORDER BY is_preset DESC, name ASC").all() as
      Array<{ document_json: string }>;
    return rows.map((r) => JSON.parse(r.document_json) as SimulationScenarioDocument);
  }

  deleteScenario(id: string): void {
    this.db.prepare("DELETE FROM scenarios WHERE id = ? AND is_preset = 0").run(id);
  }

  // ── Runs ────────────────────────────────────────────────────────────────

  saveRun(run: SimulationRun): void {
    const stmt = this.db.prepare(`
      INSERT INTO runs (id, scenario_id, status, mode, speed, seed, started_utc, completed_utc, simulated_time_ms, parameters_json, snapshot_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        completed_utc = excluded.completed_utc,
        simulated_time_ms = excluded.simulated_time_ms,
        snapshot_json = excluded.snapshot_json
    `);
    stmt.run(
      run.id,
      run.scenarioId,
      run.status,
      run.mode,
      run.speed,
      run.seed,
      run.startedAtUtc,
      run.completedAtUtc ?? null,
      run.simulatedTimeMs,
      JSON.stringify(run.parameters),
      run.channelSnapshot ? JSON.stringify(run.channelSnapshot) : null,
    );
  }

  getRun(id: string): SimulationRun | null {
    const row = this.db.prepare(`
      SELECT id, scenario_id, status, mode, speed, seed, started_utc, completed_utc, simulated_time_ms, parameters_json, snapshot_json
      FROM runs WHERE id = ?
    `).get(id) as
      | { id: string; scenario_id: string; status: string; mode: string; speed: number; seed: number; started_utc: string; completed_utc: string | null; simulated_time_ms: number; parameters_json: string; snapshot_json: string | null }
      | undefined;
    if (!row) return null;
    return this.hydrateRun(row);
  }

  listRuns(limit = 100): SimulationRunSummary[] {
    const rows = this.db.prepare(`
      SELECT id, scenario_id, status, started_utc, completed_utc, simulated_time_ms, mode, snapshot_json
      FROM runs ORDER BY started_utc DESC LIMIT ?
    `).all(limit) as
      Array<{ id: string; scenario_id: string; status: string; started_utc: string; completed_utc: string | null; simulated_time_ms: number; mode: string; snapshot_json: string | null }>;
    return rows.map((r) => ({
      id: r.id,
      scenarioId: r.scenario_id,
      status: r.status as SimulationRun["status"],
      startedAtUtc: r.started_utc,
      completedAtUtc: r.completed_utc ?? undefined,
      simulatedTimeMs: r.simulated_time_ms,
      mode: r.mode as SimulationRun["mode"],
      failureReason: r.snapshot_json ? (JSON.parse(r.snapshot_json) as SimulationRun["channelSnapshot"])?.[0]?.value as string : undefined,
    }));
  }

  // ── Events ──────────────────────────────────────────────────────────────

  saveEvent(event: SimulationEvent): void {
    const stmt = this.db.prepare(`
      INSERT INTO events (run_id, sequence, kind, simulated_time_ms, at_utc, message, channel_id, value_json, assertion_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(run_id, sequence) DO UPDATE SET
        kind = excluded.kind,
        simulated_time_ms = excluded.simulated_time_ms,
        at_utc = excluded.at_utc,
        message = excluded.message,
        channel_id = excluded.channel_id,
        value_json = excluded.value_json,
        assertion_json = excluded.assertion_json
    `);
    stmt.run(
      event.runId,
      event.sequence,
      event.kind,
      event.atSimulatedMs,
      event.atUtc,
      event.message,
      event.channelId ?? null,
      event.value !== undefined ? JSON.stringify(event.value) : null,
      event.assertion ? JSON.stringify(event.assertion) : null,
    );
  }

  getEvents(runId: string, afterSequence = 0): SimulationEvent[] {
    const rows = this.db.prepare(`
      SELECT * FROM events WHERE run_id = ? AND sequence > ? ORDER BY sequence ASC
    `).all(runId, afterSequence) as Array<{
      run_id: string;
      sequence: number;
      kind: string;
      simulated_time_ms: number;
      at_utc: string;
      message: string;
      channel_id: string | null;
      value_json: string | null;
      assertion_json: string | null;
    }>;
    return rows.map((r) => ({
      id: `${r.run_id}-${r.sequence}`,
      runId: r.run_id,
      sequence: r.sequence,
      kind: r.kind as SimulationEvent["kind"],
      atSimulatedMs: r.simulated_time_ms,
      atUtc: r.at_utc,
      message: r.message,
      ...(r.channel_id ? { channelId: r.channel_id } : {}),
      ...(r.value_json ? { value: JSON.parse(r.value_json) } : {}),
      ...(r.assertion_json ? { assertion: JSON.parse(r.assertion_json) as SimulationEvent["assertion"] } : {}),
    }));
  }

  // ── Samples ─────────────────────────────────────────────────────────────

  saveSampleBatch(batch: SimulationSampleBatch): void {
    const insert = this.db.prepare(`
      INSERT INTO samples (run_id, tick, simulated_time_ms, channel_id, value_json, quality)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const transaction = this.db.transaction((rows: SimulationSampleBatch) => {
      for (const sample of rows.samples) {
        insert.run(
          rows.runId,
          rows.tick,
          rows.simulatedTimeMs,
          sample.channelId,
          JSON.stringify(sample.value),
          sample.quality,
        );
      }
    });
    transaction(batch);
  }

  getSamples(
    runId: string,
    options: { channels?: string[] | undefined; fromSimulatedMs?: number | undefined; toSimulatedMs?: number | undefined; maxPoints?: number | undefined } = {},
  ): SimulationSampleBatch[] {
    let sql = `
      SELECT run_id, tick, simulated_time_ms, channel_id, value_json, quality
      FROM samples WHERE run_id = ?
    `;
    const params: (string | number)[] = [runId];
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
    sql += " ORDER BY tick ASC, channel_id ASC";
    if (options.maxPoints) {
      sql += " LIMIT ?";
      params.push(options.maxPoints);
    }
    const rows = this.db.prepare(sql).all(...params) as Array<{
      run_id: string;
      tick: number;
      simulated_time_ms: number;
      channel_id: string;
      value_json: string;
      quality: string;
    }>;
    const batches = new Map<number, SimulationSampleBatch>();
    for (const r of rows) {
      let batch = batches.get(r.tick);
      if (!batch) {
        batch = { runId: r.run_id, tick: r.tick, simulatedTimeMs: r.simulated_time_ms, samples: [] };
        batches.set(r.tick, batch);
      }
      batch.samples.push({ channelId: r.channel_id, value: JSON.parse(r.value_json), quality: r.quality as SimulationSampleBatch["samples"][0]["quality"] });
    }
    return Array.from(batches.values());
  }

  // ── Retention ───────────────────────────────────────────────────────────

  applyRetention(): void {
    const cutoff = new Date(Date.now() - this.retentionDays * 86_400_000).toISOString();
    const expired = this.db.prepare("SELECT id FROM runs WHERE started_utc < ?").all(cutoff) as Array<{ id: string }>;
    for (const { id } of expired) {
      this.deleteRun(id);
    }

    const dbSize = this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get() as
      | { size: number }
      | undefined;
    if (dbSize && dbSize.size > this.maxBytes) {
      const oldest = this.db.prepare("SELECT id FROM runs ORDER BY started_utc ASC LIMIT 10").all() as Array<{ id: string }>;
      for (const { id } of oldest) {
        this.deleteRun(id);
      }
    }
    this.db.exec("VACUUM");
  }

  close(): void {
    this.db.close();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private deleteRun(id: string): void {
    this.db.prepare("DELETE FROM samples WHERE run_id = ?").run(id);
    this.db.prepare("DELETE FROM events WHERE run_id = ?").run(id);
    this.db.prepare("DELETE FROM runs WHERE id = ?").run(id);
  }

  private hydrateRun(row: {
    id: string;
    scenario_id: string;
    status: string;
    mode: string;
    speed: number;
    seed: number;
    started_utc: string;
    completed_utc: string | null;
    simulated_time_ms: number;
    parameters_json: string;
    snapshot_json: string | null;
  }): SimulationRun {
    return {
      id: row.id,
      scenarioId: row.scenario_id,
      scenarioVersion: "1.0.0",
      status: row.status as SimulationRun["status"],
      mode: row.mode as SimulationRun["mode"],
      speed: row.speed,
      seed: row.seed,
      parameters: JSON.parse(row.parameters_json) as SimulationRun["parameters"],
      startedAtUtc: row.started_utc,
      completedAtUtc: row.completed_utc ?? undefined,
      simulatedTimeMs: row.simulated_time_ms,
      steps: [],
      assertions: [],
      lastSequence: 0,
      channelSnapshot: row.snapshot_json ? JSON.parse(row.snapshot_json) as SimulationRun["channelSnapshot"] : undefined,
    };
  }
}
