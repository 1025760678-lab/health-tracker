import type { BaselineActivityLevel, BiologicalSex } from "../types/profile";
import { BASELINE_ACTIVITY_FACTORS, estimateWorkoutCalories } from "./energyCalculations";

export type RecipeGoal = "cut" | "maintain" | "gain";
export type RecipePace = "gentle" | "standard" | "focused";
export type WeeklyTrainingDays = 0 | 2 | 4 | 6;

export interface RecipeScenario {
  weightKg: number;
  age: number;
  heightCm: number;
  biologicalSex: BiologicalSex;
  activityLevel: BaselineActivityLevel;
  trainingDays: WeeklyTrainingDays;
  goal: RecipeGoal;
  pace: RecipePace;
}

export interface RecipeEstimate {
  weightKg: number;
  restingCalories: number;
  maintenanceCalories: number;
  intakeCalories: number;
  adjustmentCalories: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
}

const adjustmentRate: Record<RecipeGoal, Record<RecipePace, number>> = {
  cut: { gentle: -0.1, standard: -0.15, focused: -0.2 },
  maintain: { gentle: 0, standard: 0, focused: 0 },
  gain: { gentle: 0.05, standard: 0.1, focused: 0.15 },
};

/** A what-if estimate, not a prediction of future weight or a prescribed diet. */
export function calculateRecipeEstimate(input: RecipeScenario): RecipeEstimate | null {
  const { weightKg, age, heightCm, biologicalSex, activityLevel, trainingDays, goal, pace } = input;
  if (
    !Number.isFinite(weightKg) || weightKg < 25 || weightKg > 300 ||
    !Number.isInteger(age) || age < 18 || age > 100 ||
    !Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250 ||
    (biologicalSex !== "male" && biologicalSex !== "female") ||
    !Object.hasOwn(BASELINE_ACTIVITY_FACTORS, activityLevel) ||
    !([0, 2, 4, 6] as number[]).includes(trainingDays) ||
    !Object.hasOwn(adjustmentRate, goal) ||
    !Object.hasOwn(adjustmentRate[goal], pace)
  ) return null;

  const restingCalories = 10 * weightKg + 6.25 * heightCm - 5 * age + (biologicalSex === "male" ? 5 : -161);
  if (restingCalories <= 0) return null;
  // The activity factor covers non-workout activity; the optional training
  // assumption is a weekly average and does not use logged workout calories.
  const weeklyWorkout = (estimateWorkoutCalories(weightKg, 45, "moderate") ?? 0) * trainingDays;
  const maintenanceCalories = Math.round(restingCalories * BASELINE_ACTIVITY_FACTORS[activityLevel] + weeklyWorkout / 7);
  const intakeCalories = Math.round(maintenanceCalories * (1 + adjustmentRate[goal][pace]));
  const proteinG = Math.round(weightKg * (goal === "maintain" ? 1.6 : 1.8));
  const fatG = Math.round(weightKg * 0.8);
  const carbsG = Math.max(0, Math.round((intakeCalories - proteinG * 4 - fatG * 9) / 4));

  return {
    weightKg,
    restingCalories: Math.round(restingCalories),
    maintenanceCalories,
    intakeCalories,
    adjustmentCalories: intakeCalories - maintenanceCalories,
    carbsG,
    proteinG,
    fatG,
  };
}

export function getRecipeStages(
  input: RecipeScenario,
  targetWeightKg: number | null,
): RecipeEstimate[] {
  const initial = calculateRecipeEstimate(input);
  if (initial === null) return [];
  if (
    targetWeightKg === null || !Number.isFinite(targetWeightKg) ||
    targetWeightKg < 25 || targetWeightKg > 300 ||
    input.goal === "maintain" ||
    (input.goal === "cut" && targetWeightKg >= input.weightKg) ||
    (input.goal === "gain" && targetWeightKg <= input.weightKg)
  ) return [initial];

  const midpoint = Math.round((input.weightKg + targetWeightKg) * 5) / 10;
  return [
    initial,
    calculateRecipeEstimate({ ...input, weightKg: midpoint }),
    calculateRecipeEstimate({ ...input, weightKg: targetWeightKg }),
  ]
    .filter((value): value is RecipeEstimate => value !== null);
}
