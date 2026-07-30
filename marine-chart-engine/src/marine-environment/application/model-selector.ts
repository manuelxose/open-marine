import type { ProviderCandidate, ProviderDecision } from '../domain/marine-field.js';

const healthFactor = (health: ProviderCandidate['health']): number =>
  health === 'available' ? 1 : health === 'degraded' ? 0.65 : health === 'stale' ? 0.25 : 0;

export class ModelSelector {
  rank(candidates: ProviderCandidate[], currentConditions: boolean): ProviderDecision {
    const ranked = candidates.map((candidate) => {
      const reasons: string[] = [];
      let score = 100 * healthFactor(candidate.health);
      if (!candidate.coversViewport) {
        score -= 100;
        reasons.push('viewport is outside complete provider coverage');
      } else {
        score += 30;
        reasons.push('complete viewport coverage');
      }
      if (candidate.spatialResolutionMeters !== null) {
        score += Math.max(0, 35 - Math.log2(Math.max(250, candidate.spatialResolutionMeters) / 250) * 7);
        reasons.push(`source grid approximately ${Math.round(candidate.spatialResolutionMeters)} m`);
      } else {
        reasons.push('physical source resolution is not exposed');
      }
      if (candidate.temporalResolutionMinutes !== null) {
        score += Math.max(0, 20 - candidate.temporalResolutionMinutes / 12);
      }
      if (candidate.ageMinutes !== null) {
        score -= Math.max(0, (candidate.ageMinutes - 90) / 30);
        reasons.push(`data age ${Math.round(candidate.ageMinutes)} min`);
      }
      score += candidate.coastalSuitability * 25;
      if (candidate.observation) {
        const bonus = currentConditions ? 45 : -40;
        score += bonus;
        reasons.push(currentConditions ? 'recent observation preferred for current conditions' : 'observation is not used as a future forecast');
      }
      if (candidate.missingVariables.length > 0) {
        score -= 25 * candidate.missingVariables.length;
        reasons.push(`missing ${candidate.missingVariables.join(', ')}`);
      }
      if (candidate.latencyMs !== null) score -= Math.min(15, candidate.latencyMs / 1000);
      return { ...candidate, score: Number(score.toFixed(2)), reasons };
    }).sort((left, right) => (right.score ?? -Infinity) - (left.score ?? -Infinity));

    const selected = ranked.find((candidate) =>
      candidate.health !== 'unavailable' && candidate.coversViewport && candidate.missingVariables.length === 0,
    ) ?? null;
    return {
      selected: selected?.providerId ?? null,
      candidates: ranked,
      reasons: selected
        ? [`${selected.providerLabel} ranked highest`, ...(selected.reasons ?? [])]
        : ['No provider has valid data and complete coverage for this request'],
    };
  }
}

