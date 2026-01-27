import type { DataPoint } from "@omi/marine-data-contract";
import type { SensorAdapter } from "./adapters/base.js";

export interface SignalKPublisher {
  publish<T>(points: Array<DataPoint<T>>): Promise<void>;
}

export interface AdapterRegistration {
  id: string;
  name: string;
  adapter: SensorAdapter;
  enabled: boolean;
}

export interface SensorGateway {
  registerAdapter(adapter: SensorAdapter): void;
  unregisterAdapter(adapterId: string): void;
  listAdapters(): AdapterRegistration[];
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class StubSensorGateway implements SensorGateway {
  private readonly adapters = new Map<string, AdapterRegistration>();

  registerAdapter(adapter: SensorAdapter): void {
    this.adapters.set(adapter.id, {
      id: adapter.id,
      name: adapter.name,
      adapter,
      enabled: false,
    });
  }

  unregisterAdapter(adapterId: string): void {
    this.adapters.delete(adapterId);
  }

  listAdapters(): AdapterRegistration[] {
    return Array.from(this.adapters.values());
  }

  async start(): Promise<void> {
    return;
  }

  async stop(): Promise<void> {
    return;
  }
}
