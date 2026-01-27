export interface SignalKUpdateValue {
  path: string;
  value: unknown;
}

export interface SignalKUpdate {
  source?: {
    label?: string;
    type?: string;
    // ... potentially other fields
  };
  $source?: string;
  timestamp: string;
  values: SignalKUpdateValue[];
}

export interface SignalKDeltaMessage {
  context?: string;
  updates: SignalKUpdate[];
  requestId?: string;
  state?: string; // for Hello message usually
  // ... potentially others
}

export interface NormalizedDataPoint {
  path: string;
  value: unknown;
  timestamp: number; // Date.now()
  source: string;
}
