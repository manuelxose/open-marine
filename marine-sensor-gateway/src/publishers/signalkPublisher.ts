import type { DataPoint } from "@omi/marine-data-contract";

interface DeltaValue {
  path: DataPoint<unknown>["path"];
  value: unknown;
}

interface DeltaUpdate {
  timestamp: string;
  source: { label: string; src: string; type: string };
  values: DeltaValue[];
}

interface DeltaMessage {
  context: string;
  updates: DeltaUpdate[];
}

export interface SignalKPublisherConfig {
  baseUrl: string;
  source: string;
  sourceType: string;
  sourceLabel: string;
}

export class SignalKHttpPublisher {
  private readonly baseUrl: string;
  private readonly source: DeltaUpdate["source"];

  constructor(config: SignalKPublisherConfig) {
    this.baseUrl = config.baseUrl.endsWith("/") ? config.baseUrl : `${config.baseUrl}/`;
    this.source = {
      src: config.source,
      type: config.sourceType,
      label: config.sourceLabel,
    };
  }

  async connect(): Promise<void> {
    const url = new URL("signalk/v1/api/", this.baseUrl);
    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new Error(`Signal K API not reachable: ${formatError(error)}`);
    }

    if (!response.ok) {
      throw new Error(`Signal K API not reachable (${response.status})`);
    }
  }

  async publish<T>(points: Array<DataPoint<T>>): Promise<void> {
    if (points.length === 0) {
      return;
    }

    const grouped = this.groupByContext(points);
    for (const [context, contextPoints] of grouped.entries()) {
      try {
        await this.postDelta(this.toDeltaMessage(context, contextPoints));
      } catch (error) {
        console.error(
          `[signalkPublisher] Failed to publish ${context}: ${formatError(error)}`,
        );
      }
    }
  }

  private groupByContext<T>(
    points: Array<DataPoint<T>>,
  ): Map<string, Array<DataPoint<T>>> {
    const grouped = new Map<string, Array<DataPoint<T>>>();
    for (const point of points) {
      const context = normalizeContext(point.context);
      const contextPoints = grouped.get(context);
      if (contextPoints) {
        contextPoints.push(point);
        continue;
      }
      grouped.set(context, [point]);
    }
    return grouped;
  }

  private toDeltaMessage<T>(
    context: string,
    points: Array<DataPoint<T>>,
  ): DeltaMessage {
    const [firstPoint] = points;
    const timestamp = firstPoint?.timestamp ?? new Date().toISOString();
    const values = points.map<DeltaValue>((point) => ({
      path: point.path,
      value: point.value,
    }));

    return {
      context,
      updates: [
        {
          timestamp,
          source: this.source,
          values,
        },
      ],
    };
  }

  private async postDelta(message: DeltaMessage): Promise<void> {
    const url = new URL("signalk/v1/api/", this.baseUrl);
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });
    } catch (error) {
      throw new Error(`Unable to POST delta: ${formatError(error)}`);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Failed to publish delta (${response.status}): ${body || "no response"}`,
      );
    }
  }
}

const normalizeContext = (context?: string): string => {
  if (!context || context === "self") {
    return "vessels.self";
  }
  return context;
};

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
