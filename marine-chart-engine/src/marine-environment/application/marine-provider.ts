import type {
  MarineField,
  MarineFieldRequest,
  MarineVariable,
  ProviderCandidate,
} from '../domain/marine-field.js';

export interface MarineProvider {
  readonly id: string;
  readonly label: string;
  readonly variables: readonly MarineVariable[];
  describe(request: MarineFieldRequest): Promise<ProviderCandidate>;
  getField(request: MarineFieldRequest): Promise<MarineField>;
}

export class MarineProviderError extends Error {
  constructor(
    readonly code:
      | 'NETWORK'
      | 'AUTH'
      | 'NO_COVERAGE'
      | 'NO_DATA'
      | 'STALE'
      | 'INVALID_DATA'
      | 'PARSING'
      | 'RATE_LIMIT'
      | 'TIMEOUT',
    message: string,
  ) {
    super(message);
    this.name = 'MarineProviderError';
  }
}

