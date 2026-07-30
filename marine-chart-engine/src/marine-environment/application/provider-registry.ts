import type { MarineVariable } from '../domain/marine-field.js';
import type { MarineProvider } from './marine-provider.js';

export class ProviderRegistry {
  private readonly providers = new Map<string, MarineProvider>();

  register(provider: MarineProvider): void {
    if (this.providers.has(provider.id)) throw new Error(`Marine provider ${provider.id} is already registered`);
    this.providers.set(provider.id, provider);
  }

  forVariable(variable: MarineVariable): MarineProvider[] {
    return [...this.providers.values()].filter((provider) => provider.variables.includes(variable));
  }

  list(): MarineProvider[] {
    return [...this.providers.values()];
  }
}

