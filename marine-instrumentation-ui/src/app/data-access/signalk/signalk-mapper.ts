import { NormalizedDataPoint, SignalKMessage } from './signalk-message.types';

export function normalizeDelta(delta: SignalKMessage): NormalizedDataPoint[] {
  const normalized: NormalizedDataPoint[] = [];
  
  if (!('updates' in delta) || !delta.updates) return normalized;

  for (const update of delta.updates) {
    const source = update.$source || (update.source ? update.source.label : 'unknown') || 'unknown';
    // Parse timestamp once if possible, or use current time if missing
    // SignalK timestamps are ISO strings.
    const ts = update.timestamp ? new Date(update.timestamp).getTime() : Date.now();

    // Skip meta-only updates (units/descriptions) and any malformed update without a
    // values array. The course-provider emits meta deltas when a destination is set.
    if (!Array.isArray(update.values)) continue;

    for (const val of update.values) {
      // Keep empty-string paths ("") because some Signal K producers use them for aggregate vessel snapshots.
      if (val.path === undefined || val.path === null) continue;
      const entry: NormalizedDataPoint = {
        path: String(val.path),
        value: val.value,
        timestamp: ts,
        source: source,
      };
      if (delta.context) {
        entry.context = delta.context;
      }
      normalized.push(entry);
    }
  }
  return normalized;
}
