import type { Scenario } from "./scenarios/scenario.js";

export type ScenarioFactory<TState> = () => Scenario<TState>;

interface RegisteredScenario {
  id: string;
  name: string;
  factory: ScenarioFactory<unknown>;
}

const registry = new Map<string, RegisteredScenario>();

export const registerScenario = <TState>(
  id: string,
  name: string,
  factory: ScenarioFactory<TState>,
): void => {
  registry.set(id, { id, name, factory: factory as ScenarioFactory<unknown> });
};

export const getScenarioFactory = (id: string): ScenarioFactory<unknown> | undefined => {
  return registry.get(id)?.factory;
};

export const listScenarios = (): Array<{ id: string; name: string }> => {
  return Array.from(registry.values()).map((s) => ({ id: s.id, name: s.name }));
};

export const clearRegistry = (): void => {
  registry.clear();
};
