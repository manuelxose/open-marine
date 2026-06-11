export enum QualityFlag {
  Good = "good",
  Warn = "warn",
  Bad = "bad",
}

export const QUALITY_LIFECYCLE = [
  QualityFlag.Good,
  QualityFlag.Warn,
  QualityFlag.Bad,
] as const;

export const QUALITY_DEGRADATION: Record<QualityFlag, QualityFlag> = {
  [QualityFlag.Good]: QualityFlag.Warn,
  [QualityFlag.Warn]: QualityFlag.Bad,
  [QualityFlag.Bad]: QualityFlag.Bad,
};

export const degradeQuality = (current: QualityFlag): QualityFlag => {
  return QUALITY_DEGRADATION[current];
};

export const isQualityTransitionValid = (from: QualityFlag, to: QualityFlag): boolean => {
  const allowed: Record<QualityFlag, QualityFlag[]> = {
    [QualityFlag.Good]: [QualityFlag.Good, QualityFlag.Warn],
    [QualityFlag.Warn]: [QualityFlag.Warn, QualityFlag.Bad],
    [QualityFlag.Bad]: [QualityFlag.Bad],
  };

  return allowed[from].includes(to);
};
