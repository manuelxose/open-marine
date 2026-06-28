import type { SimulationChannelDefinition, SimulationSample, SignalKPath } from "@omi/marine-data-contract";
import type { SimulationDataPoint } from "../core/types.js";

export const normalizeContext = (context?: string): string => {
  if (!context || context === "self") return "vessels.self";
  return context;
};

export const resolveVesselPath = (context?: string): string => {
  const normalized = normalizeContext(context);
  if (normalized === "vessels.self") return "vessels/self";
  if (normalized.startsWith("vessels.")) return `vessels/${encodeURIComponent(normalized.slice("vessels.".length))}`;
  return `vessels/${encodeURIComponent(normalized)}`;
};

export const samplesToDataPoints = (
  samples: SimulationSample[],
  channels: SimulationChannelDefinition[],
  timestamp: string,
): SimulationDataPoint[] => {
  const byId = new Map(channels.map((channel) => [channel.id, channel]));
  const points: SimulationDataPoint[] = [];
  for (const sample of samples) {
    const channel = byId.get(sample.channelId);
    if (!channel?.path) continue;
    points.push({
      path: channel.path as SignalKPath,
      value: sample.value,
      timestamp,
      context: "vessels.self",
      source: { label: "omi-simulation-platform", type: "simulation" },
      quality: sample.quality,
    });
  }
  return points;
};

