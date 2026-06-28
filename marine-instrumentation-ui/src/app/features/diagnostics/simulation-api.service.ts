import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, NgZone, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  SimulationEvent,
  SimulationRun,
  SimulationSampleBatch,
  SimulationScenarioDocument,
} from '@omi/marine-data-contract';
import { APP_ENVIRONMENT, type AppEnvironment } from '../../core/config/app-environment.token';

export interface RunSummary {
  id: string;
  scenarioId: string;
  status: SimulationRun['status'];
  startedAtUtc: string;
  completedAtUtc?: string | undefined;
  simulatedTimeMs: number;
  mode: SimulationRun['mode'];
  failureReason?: string | undefined;
}

@Injectable({ providedIn: 'root' })
export class SimulationApiService {
  readonly online = signal(false);
  private source: EventSource | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly zone: NgZone,
    @Inject(APP_ENVIRONMENT) private readonly environment: AppEnvironment,
  ) {}

  async loadScenarios(): Promise<SimulationScenarioDocument[]> {
    return this.get<SimulationScenarioDocument[]>('/api/v2/scenarios');
  }

  async loadScenario(id: string): Promise<SimulationScenarioDocument> {
    return this.get<SimulationScenarioDocument>(`/api/v2/scenarios/${encodeURIComponent(id)}`);
  }

  async saveScenario(scenario: SimulationScenarioDocument): Promise<SimulationScenarioDocument> {
    return this.post<SimulationScenarioDocument>('/api/v2/scenarios', scenario);
  }

  async deleteScenario(id: string): Promise<void> {
    await this.delete(`/api/v2/scenarios/${encodeURIComponent(id)}`);
  }

  async exportScenario(id: string): Promise<Blob> {
    return this.getBlob(`/api/v2/scenarios/${encodeURIComponent(id)}/export`);
  }

  async importScenario(body: unknown): Promise<SimulationScenarioDocument> {
    return this.post<SimulationScenarioDocument>('/api/v2/scenarios/import', body);
  }

  async generateWindScenario(body: unknown): Promise<SimulationScenarioDocument> {
    return this.post<SimulationScenarioDocument>('/api/v2/scenarios/generate-wind', body);
  }

  async arm(): Promise<{ token: string; expiresAtUtc: string }> {
    return this.post<{ token: string; expiresAtUtc: string }>('/api/v2/arm', {});
  }

  async loadRuns(): Promise<RunSummary[]> {
    return this.get<RunSummary[]>('/api/v2/runs');
  }

  async getRun(id: string): Promise<SimulationRun> {
    return this.get<SimulationRun>(`/api/v2/runs/${encodeURIComponent(id)}`);
  }

  async startRun(
    scenarioId: string,
    armToken: string,
    parameters: Record<string, number | boolean | string>,
    mode: 'data' | 'closed-loop' = 'data',
    speed = 1,
    seed = 42,
  ): Promise<SimulationRun> {
    return this.post<SimulationRun>('/api/v2/runs', { scenarioId, armToken, parameters, mode, speed, seed });
  }

  async abortRun(id: string): Promise<SimulationRun> {
    return this.post<SimulationRun>(`/api/v2/runs/${encodeURIComponent(id)}/abort`, {});
  }

  async leaseRun(id: string): Promise<{ expiresAtUtc: string; remainingMs: number }> {
    return this.post<{ expiresAtUtc: string; remainingMs: number }>(`/api/v2/runs/${encodeURIComponent(id)}/lease`, {});
  }

  async injectRun(id: string, channelId: string, value: number | boolean | string): Promise<SimulationRun> {
    return this.post<SimulationRun>(`/api/v2/runs/${encodeURIComponent(id)}/injections`, { channelId, value });
  }

  async loadSamples(id: string, afterTick = 0, maxPoints?: number): Promise<SimulationSampleBatch[]> {
    const params = new URLSearchParams();
    params.set('after', String(afterTick));
    if (maxPoints !== undefined) params.set('maxPoints', String(maxPoints));
    return this.get<SimulationSampleBatch[]>(`/api/v2/runs/${encodeURIComponent(id)}/samples?${params.toString()}`);
  }

  reportUrl(id: string, format: 'json' | 'csv' | 'html'): string {
    return `${this.environment.testBenchApiUrl}/api/v2/runs/${encodeURIComponent(id)}/report?format=${format}`;
  }

  connectEvents(
    runId: string,
    afterSequence: number,
    onEvent: (event: SimulationEvent) => void,
    onDisconnected: () => void,
  ): void {
    this.disconnectEvents();
    const url = `${this.environment.testBenchApiUrl}/api/v2/runs/${encodeURIComponent(runId)}/events?after=${afterSequence}`;
    this.zone.runOutsideAngular(() => {
      const source = new EventSource(url);
      this.source = source;
      source.addEventListener('sim-event', (raw) => {
        const message = raw as MessageEvent<string>;
        try {
          const event = JSON.parse(message.data) as SimulationEvent;
          this.zone.run(() => onEvent(event));
        } catch {
          // Ignore malformed events
        }
      });
      source.onopen = () => this.zone.run(() => this.online.set(true));
      source.onerror = () => this.zone.run(() => {
        this.online.set(false);
        onDisconnected();
      });
    });
  }

  disconnectEvents(): void {
    this.source?.close();
    this.source = null;
    this.online.set(false);
  }

  private async get<T>(path: string): Promise<T> {
    try {
      const result = await firstValueFrom(this.http.get<T>(`${this.environment.testBenchApiUrl}${path}`));
      this.online.set(true);
      return result;
    } catch (error) {
      this.online.set(false);
      throw error;
    }
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    try {
      const result = await firstValueFrom(this.http.post<T>(`${this.environment.testBenchApiUrl}${path}`, body));
      this.online.set(true);
      return result;
    } catch (error) {
      this.online.set(false);
      throw error;
    }
  }

  private async delete(path: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${this.environment.testBenchApiUrl}${path}`));
      this.online.set(true);
    } catch (error) {
      this.online.set(false);
      throw error;
    }
  }

  private async getBlob(path: string): Promise<Blob> {
    try {
      const result = await firstValueFrom(this.http.get(`${this.environment.testBenchApiUrl}${path}`, { responseType: 'blob' }));
      this.online.set(true);
      return result;
    } catch (error) {
      this.online.set(false);
      throw error;
    }
  }
}
