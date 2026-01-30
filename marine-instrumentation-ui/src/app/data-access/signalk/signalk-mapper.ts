import { NormalizedDataPoint, SignalKMessage } from './signalk-message.types';

export function normalizeDelta(delta: SignalKMessage): NormalizedDataPoint[] {
  const normalized: NormalizedDataPoint[] = [];
  
  if (!('updates' in delta) || !delta.updates) return normalized;

  for (const update of delta.updates) {
    const source = update.$source || (update.source ? update.source.label : 'unknown') || 'unknown';
    // Parse timestamp once if possible, or use current time if missing
    // SignalK timestamps are ISO strings.
    const ts = update.timestamp ? new Date(update.timestamp).getTime() : Date.now();

    for (const val of update.values) {
      if (!val.path) continue; // Some updates might be empty or meta
      normalized.push({
        context: delta.context,
        path: val.path,
        value: val.value,
        timestamp: ts,
        source: source
      });
    }
  }
  return normalized;
}
