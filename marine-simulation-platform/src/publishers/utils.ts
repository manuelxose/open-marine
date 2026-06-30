import { PATHS, type SimulationChannelDefinition, type SimulationSample, type SignalKPath } from "@omi/marine-data-contract";
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
    if (sample.channelId.startsWith("ais.intruder.")) {
      const path = aisPath(sample.channelId);
      if (!path) continue;
      points.push({
        path,
        value: sample.value,
        timestamp,
        context: "vessels.urn:mrn:imo:mmsi:224000001",
        source: { label: "omi-simulation-platform", type: "simulation" },
        quality: sample.quality,
      });
      continue;
    }
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

const aisPath = (channelId: string): SignalKPath | null => {
  switch (channelId) {
    case "ais.intruder.position":
      return PATHS.navigation.position;
    case "ais.intruder.sog":
      return PATHS.navigation.speedOverGround;
    case "ais.intruder.cog":
      return PATHS.navigation.courseOverGroundTrue;
    default:
      return null;
  }
};
