import type { Logger } from "../app/logger.js";

export interface SkValue {
  path: string;
  value: unknown;
}

interface DeltaMessage {
  context: string;
  updates: Array<{
    timestamp: string;
    source: { label: string; src: string; type: string };
    values: SkValue[];
  }>;
}

/**
 * Publishes autopilot status (and, on the bench, simulated boat state) to
 * Signal K via HTTP deltas. Mirrors marine-sensor-gateway's publisher so the
 * UI's DatapointStore consumes engine output with no special-casing.
 */
export class SignalKPublisher {
  private readonly baseUrl: string;
  private readonly source = {
    src: "omi-autopilot",
    type: "autopilot",
    label: "OMI Autopilot",
  };

  constructor(
    baseUrl: string,
    private readonly log: Logger,
  ) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  }

  async publish(values: SkValue[], context = "vessels.self"): Promise<void> {
    if (values.length === 0) {
      return;
    }
    const message: DeltaMessage = {
      context,
      updates: [{ timestamp: new Date().toISOString(), source: this.source, values }],
    };

    const url = new URL("signalk/v1/api/", this.baseUrl);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
      if (!response.ok) {
        this.log.warn(`publish failed (${response.status})`);
      }
    } catch (error) {
      this.log.warn("publish error", error instanceof Error ? error.message : String(error));
    }
  }
}
