import type { ScenarioPoint } from "../scenarios/scenario.js";
import type { Publisher } from "./publisher.js";

interface DeltaValue {
  path: string;
  value: ScenarioPoint["value"];
}

interface DeltaUpdate {
  timestamp: string;
  source: { label: string; src: string; type?: string };
  values: DeltaValue[];
}

interface DeltaMessage {
  context: string;
  updates: DeltaUpdate[];
}

const DEFAULT_SOURCE_LABEL = "mock";

class DeltaEndpointNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeltaEndpointNotFoundError";
  }
}

const buildDeltaSource = (
  source?: ScenarioPoint["source"],
): { label: string; src: string; type?: string } => {
  const label = source?.label ?? DEFAULT_SOURCE_LABEL;
  const src = source?.label ?? DEFAULT_SOURCE_LABEL;
  return {
    label,
    src,
    ...(source?.type ? { type: source.type } : {}),
  };
};

export class HttpPublisher implements Publisher {
  private readonly baseUrl: string;
  private readonly token: string | undefined;
  private deltaUnsupported = false;

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    this.token = token;
  }

  async connect(): Promise<void> {
    const url = new URL("signalk/v1/api/", this.baseUrl);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Signal K API not reachable (${response.status})`);
    }
  }

  async publish(points: ScenarioPoint[]): Promise<void> {
    if (points.length === 0) {
      return;
    }

    if (this.token) {
      await this.publishRest(points);
      return;
    }

    if (this.deltaUnsupported) {
      await this.publishRest(points);
      return;
    }

    try {
      const pointsByContext = new Map<string, ScenarioPoint[]>();
      for (const point of points) {
        const ctx = normalizeContext(point.context);
        let list = pointsByContext.get(ctx);
        if (!list) {
          list = [];
          pointsByContext.set(ctx, list);
        }
        list.push(point);
      }

      for (const [context, contextPoints] of pointsByContext) {
        const [firstPoint] = contextPoints;
        if (!firstPoint) continue;

        const timestamp = firstPoint.timestamp;
        const source = buildDeltaSource(firstPoint.source);
        const values: DeltaValue[] = contextPoints.map((point) => ({
          path: point.path,
          value: point.value,
        }));

        await this.postDelta({
          context,
          updates: [
            {
              timestamp,
              source,
              values,
            },
          ],
        });
      }
    } catch (error) {
      if (error instanceof DeltaEndpointNotFoundError) {
        this.deltaUnsupported = true;
        await this.publishRest(points);
        return;
      }
      throw error;
    }
  }

  private async postDelta(message: DeltaMessage): Promise<void> {
    const url = new URL("signalk/v1/api/", this.baseUrl);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new DeltaEndpointNotFoundError(
          "Signal K delta endpoint not available (HTTP 404).",
        );
      }
      const body = await response.text();
      throw new Error(`Failed to publish delta (${response.status}): ${body || "no response"}`);
    }
  }

  private async publishRest(points: ScenarioPoint[]): Promise<void> {
    await Promise.all(points.map((point) => this.putValue(point)));
  }

  private async putValue(point: ScenarioPoint): Promise<void> {
    const path = point.path.split(".").join("/");
    const vesselPath = resolveVesselPath(point.context);
    const url = new URL(`signalk/v1/api/${vesselPath}/${path}`, this.baseUrl);
    const payload = {
      value: point.value,
      timestamp: point.timestamp,
      source: buildDeltaSource(point.source),
    };
    const response = await fetch(url, {
      method: "PUT",
      headers: this.buildHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (!this.token && (response.status === 401 || response.status === 403)) {
        throw new Error(
          `Signal K REST write unauthorized (${response.status}). Enable dev security bypass or set SIGNALK_TOKEN.`,
        );
      }
      const body = await response.text();
      throw new Error(`Failed to publish ${point.path} (${response.status}): ${body || "no response"}`);
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }
}

const normalizeContext = (context?: string): string => {
  if (!context || context === "self") {
    return "vessels.self";
  }
  return context;
};

const resolveVesselPath = (context?: string): string => {
  const normalized = normalizeContext(context);
  if (normalized === "vessels.self") {
    return "vessels/self";
  }
  if (normalized.startsWith("vessels.")) {
    const vesselId = normalized.slice("vessels.".length);
    return `vessels/${encodeURIComponent(vesselId)}`;
  }
  return `vessels/${encodeURIComponent(normalized)}`;
};
