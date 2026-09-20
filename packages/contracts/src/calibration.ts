export interface CalibrationResult {
  calibratedCounts: number[];
  rawTotal: number;
  placedPopulation: number;
  unplacedPopulation: number;
}

export function calibratePopulationCells(
  rawCellCounts: readonly number[],
  targetPopulation: number,
): CalibrationResult {
  if (!Number.isFinite(targetPopulation) || targetPopulation < 0) {
    throw new RangeError('Target population must be nonnegative');
  }
  if (rawCellCounts.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new RangeError('Raw cell counts must be nonnegative finite numbers');
  }
  const rawTotal = rawCellCounts.reduce((sum, value) => sum + value, 0);
  if (rawTotal === 0) {
    return {
      calibratedCounts: rawCellCounts.map(() => 0),
      rawTotal,
      placedPopulation: 0,
      unplacedPopulation: targetPopulation,
    };
  }
  const scale = targetPopulation / rawTotal;
  const calibratedCounts = rawCellCounts.map((value) => value * scale);
  return {
    calibratedCounts,
    rawTotal,
    placedPopulation: calibratedCounts.reduce((sum, value) => sum + value, 0),
    unplacedPopulation: 0,
  };
}
