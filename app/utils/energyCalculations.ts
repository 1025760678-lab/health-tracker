import type {
  BaselineActivityLevel,
  CalorieGoalType,
  UserBodyProfile,
  WeightRecord,
} from "../types/profile";
import type { WorkoutIntensity } from "../types/workout";

export const BASELINE_ACTIVITY_FACTORS: Readonly<
  Record<BaselineActivityLevel, number>
> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

export const STRENGTH_TRAINING_MET_VALUES: Readonly<
  Record<WorkoutIntensity, number>
> = {
  light: 3.5,
  moderate: 5,
  vigorous: 6,
};

export type CalorieBalanceStatus = "deficit" | "surplus" | "balanced";

export interface CalorieBalanceResult {
  /** Calories consumed minus estimated total burn. */
  balance: number;
  status: CalorieBalanceStatus;
  /** Absolute value for friendly UI display (no confusing negative deficit). */
  amount: number;
  label: "Estimated Deficit" | "Estimated Surplus" | "Estimated Balance";
}

export interface CalorieTargetResult {
  goalType: CalorieGoalType;
  estimatedMaintenanceCalories: number;
  dailyIntakeTargetCalories: number;
  adjustmentCalories: number;
}

export type WeightTrendDirection =
  | "up"
  | "down"
  | "stable"
  | "insufficient-data";

export interface WeightTrendPoint {
  date: string;
  weightKg: number;
}

export interface SevenDayWeightTrend {
  points: WeightTrendPoint[];
  changeKg: number | null;
  direction: WeightTrendDirection;
}

function isPositiveFinite(
  value: number | null | undefined,
): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeFinite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isBaselineActivityLevel(
  value: unknown,
): value is BaselineActivityLevel {
  return (
    value === "sedentary" ||
    value === "light" ||
    value === "moderate" ||
    value === "very" ||
    value === "extra"
  );
}

function isWorkoutIntensity(value: unknown): value is WorkoutIntensity {
  return value === "light" || value === "moderate" || value === "vigorous";
}

/** Mifflin-St Jeor estimate. Returns null until every required field is valid. */
export function calculateBMR(profile: UserBodyProfile): number | null {
  const { biologicalSex, age, heightCm, currentWeightKg } = profile;
  if (
    (biologicalSex !== "male" && biologicalSex !== "female") ||
    !isPositiveFinite(age) ||
    !Number.isInteger(age) ||
    !isPositiveFinite(heightCm) ||
    !isPositiveFinite(currentWeightKg)
  ) {
    return null;
  }

  const estimatedBmr =
    10 * currentWeightKg +
    6.25 * heightCm -
    5 * age +
    (biologicalSex === "male" ? 5 : -161);
  return isPositiveFinite(estimatedBmr) ? estimatedBmr : null;
}

/**
 * Estimates normal non-workout daily expenditure. The activity setting is a
 * baseline lifestyle factor; tracked exercise must not be baked into it.
 */
export function calculateBaselineExpenditure(
  profile: UserBodyProfile,
): number | null {
  const bmr = calculateBMR(profile);
  const level = profile.baselineActivityLevel;
  if (bmr === null || !isBaselineActivityLevel(level)) return null;
  return bmr * BASELINE_ACTIVITY_FACTORS[level];
}

/** MET estimate for strength training: MET × 3.5 × kg ÷ 200 × minutes. */
export function estimateWorkoutCalories(
  bodyWeightKg: number | undefined,
  durationMinutes: number | undefined,
  intensity: WorkoutIntensity | undefined,
): number | null {
  if (
    !isPositiveFinite(bodyWeightKg) ||
    !isPositiveFinite(durationMinutes) ||
    !isWorkoutIntensity(intensity)
  ) {
    return null;
  }

  const met = STRENGTH_TRAINING_MET_VALUES[intensity];
  return (met * 3.5 * bodyWeightKg * durationMinutes) / 200;
}

/**
 * Combines baseline expenditure and only the calories from explicitly tracked
 * workouts. This is the single supported model and prevents double-counting.
 */
export function calculateTotalDailyExpenditure(
  baselineExpenditure: number | null | undefined,
  trackedWorkoutCalories: number | null | undefined,
): number | null {
  if (
    !isNonNegativeFinite(baselineExpenditure) ||
    !isNonNegativeFinite(trackedWorkoutCalories)
  ) {
    return null;
  }
  return baselineExpenditure + trackedWorkoutCalories;
}

export function calculateEstimatedTotalBurn(
  profile: UserBodyProfile,
  trackedWorkoutCalories: number | null | undefined,
): number | null {
  return calculateTotalDailyExpenditure(
    calculateBaselineExpenditure(profile),
    trackedWorkoutCalories,
  );
}

export function calculateCalorieBalance(
  caloriesConsumed: number | null | undefined,
  estimatedTotalBurn: number | null | undefined,
): CalorieBalanceResult | null {
  if (
    !isNonNegativeFinite(caloriesConsumed) ||
    !isNonNegativeFinite(estimatedTotalBurn)
  ) {
    return null;
  }

  const balance = caloriesConsumed - estimatedTotalBurn;
  if (balance < 0) {
    return {
      balance,
      status: "deficit",
      amount: Math.abs(balance),
      label: "Estimated Deficit",
    };
  }
  if (balance > 0) {
    return {
      balance,
      status: "surplus",
      amount: balance,
      label: "Estimated Surplus",
    };
  }
  return {
    balance: 0,
    status: "balanced",
    amount: 0,
    label: "Estimated Balance",
  };
}

export function calculateCalorieTarget(
  estimatedMaintenanceCalories: number | null | undefined,
  goalType: CalorieGoalType,
  goalValue?: number,
): CalorieTargetResult | null {
  if (!isPositiveFinite(estimatedMaintenanceCalories)) return null;

  if (goalType === "maintenance") {
    return {
      goalType,
      estimatedMaintenanceCalories,
      dailyIntakeTargetCalories: estimatedMaintenanceCalories,
      adjustmentCalories: 0,
    };
  }

  if (!isPositiveFinite(goalValue)) return null;

  const dailyIntakeTargetCalories =
    goalType === "deficit"
      ? estimatedMaintenanceCalories - goalValue
      : goalType === "surplus"
        ? estimatedMaintenanceCalories + goalValue
        : goalValue;

  if (!isPositiveFinite(dailyIntakeTargetCalories)) return null;

  return {
    goalType,
    estimatedMaintenanceCalories,
    dailyIntakeTargetCalories,
    adjustmentCalories:
      goalType === "deficit"
        ? -goalValue
        : goalType === "surplus"
          ? goalValue
          : goalValue - estimatedMaintenanceCalories,
  };
}

export function calculateProfileCalorieTarget(
  estimatedMaintenanceCalories: number | null | undefined,
  profile: UserBodyProfile,
): CalorieTargetResult | null {
  return calculateCalorieTarget(
    estimatedMaintenanceCalories,
    profile.calorieGoalType,
    profile.calorieGoalValue,
  );
}

function localDateKey(date: Date): string | null {
  if (!Number.isFinite(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Returns one latest measurement per day for the ending date's 7-day window. */
export function getSevenDayWeightTrend(
  records: readonly WeightRecord[],
  endingOn: Date = new Date(),
): SevenDayWeightTrend {
  const endDateKey = localDateKey(endingOn);
  if (endDateKey === null) {
    return { points: [], changeKg: null, direction: "insufficient-data" };
  }

  const startDate = new Date(
    endingOn.getFullYear(),
    endingOn.getMonth(),
    endingOn.getDate() - 6,
  );
  const startDateKey = localDateKey(startDate);
  if (startDateKey === null) {
    return { points: [], changeKg: null, direction: "insufficient-data" };
  }

  const latestByDate = new Map<string, WeightRecord>();
  for (const record of records) {
    if (
      record.date < startDateKey ||
      record.date > endDateKey ||
      !isPositiveFinite(record.weightKg)
    ) {
      continue;
    }

    const current = latestByDate.get(record.date);
    if (
      current === undefined ||
      record.createdAt.localeCompare(current.createdAt) > 0
    ) {
      latestByDate.set(record.date, record);
    }
  }

  const points = Array.from(latestByDate.values())
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.createdAt.localeCompare(b.createdAt),
    )
    .map(({ date, weightKg }) => ({ date, weightKg }));

  if (points.length < 2) {
    return { points, changeKg: null, direction: "insufficient-data" };
  }

  const changeKg = points.at(-1)!.weightKg - points[0].weightKg;
  return {
    points,
    changeKg,
    direction: changeKg > 0 ? "up" : changeKg < 0 ? "down" : "stable",
  };
}
