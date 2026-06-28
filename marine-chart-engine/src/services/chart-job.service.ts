import crypto from 'node:crypto';
import type { ChartImportKind, ChartJob, LocalChartSource } from '../types/chart-source.types.js';

type JobTask = () => Promise<LocalChartSource>;

export class ChartJobService {
  private readonly jobs = new Map<string, ChartJob>();

  enqueue(kind: ChartImportKind, chartId: string, label: string, task: JobTask): ChartJob {
    const now = new Date().toISOString();
    const job: ChartJob = {
      id: crypto.randomUUID(),
      kind,
      status: 'queued',
      chartId,
      label,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);

    void this.run(job.id, task);
    return job;
  }

  get(jobId: string): ChartJob | null {
    return this.jobs.get(jobId) ?? null;
  }

  private async run(jobId: string, task: JobTask): Promise<void> {
    this.patch(jobId, { status: 'running' });
    try {
      const result = await task();
      this.patch(jobId, { status: 'completed', result });
    } catch (error) {
      this.patch(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private patch(jobId: string, patch: Partial<ChartJob>): void {
    const current = this.jobs.get(jobId);
    if (!current) {
      return;
    }
    this.jobs.set(jobId, {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }
}
