export enum QualityFlag {
  Good = "good",
  Suspect = "suspect",
  Bad = "bad",
}

export const QUALITY_LIFECYCLE = [
  QualityFlag.Good,
  QualityFlag.Suspect,
  QualityFlag.Bad,
] as const;

export const QUALITY_DEGRADATION: Record<QualityFlag, QualityFlag> = {
  [QualityFlag.Good]: QualityFlag.Suspect,
  [QualityFlag.Suspect]: QualityFlag.Bad,
  [QualityFlag.Bad]: QualityFlag.Bad,
};

export const degradeQuality = (current: QualityFlag): QualityFlag => {
  return QUALITY_DEGRADATION[current];
};

export const isQualityTransitionValid = (from: QualityFlag, to: QualityFlag): boolean => {
  const allowed: Record<QualityFlag, QualityFlag[]> = {
    [QualityFlag.Good]: [QualityFlag.Good, QualityFlag.Suspect],
    [QualityFlag.Suspect]: [QualityFlag.Suspect, QualityFlag.Bad],
    [QualityFlag.Bad]: [QualityFlag.Bad],
  };

  return allowed[from].includes(to);
};
