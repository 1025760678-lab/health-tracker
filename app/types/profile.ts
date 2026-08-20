export type BiologicalSex = "male" | "female";

/**
 * Baseline, non-workout daily activity. Tracked workouts are added separately
 * so their energy expenditure is never counted twice.
 */
export type BaselineActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very"
  | "extra";

export type CalorieGoalType =
  | "maintenance"
  | "deficit"
  | "surplus"
  | "custom";

export interface UserBodyProfile {
  biologicalSex?: BiologicalSex;
  age?: number;
  heightCm?: number;
  currentWeightKg?: number;
  baselineActivityLevel?: BaselineActivityLevel;
  calorieGoalType: CalorieGoalType;
  /**
   * Deficit/surplus amount in kcal, or the absolute intake target for custom.
   * Maintenance does not require a value.
   */
  calorieGoalValue?: number;
  updatedAt: string;
}

export interface WeightRecord {
  id: string;
  /** Local calendar date in YYYY-MM-DD format. */
  date: string;
  weightKg: number;
  createdAt: string;
}
