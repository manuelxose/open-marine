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

export interface SignalKHelloMessage {
  name?: string;
  self?: string;
  version?: string;
  timestamp?: string;
  contexts?: Record<string, string>;
}

export type SignalKMessage = SignalKDeltaMessage | SignalKHelloMessage;

export interface NormalizedDataPoint {
  context?: string;
  path: string;
  value: unknown;
  timestamp: number; // Date.now()
  source: string;
}
