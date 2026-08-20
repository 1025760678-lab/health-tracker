export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

export interface FoodEntry {
  id: string;
  /** Local calendar date in YYYY-MM-DD format. */
  date: string;
  mealType: MealType;
  foodName: string;
  /** Optional serving description, for example "2 个" or "250 ml". */
  quantity?: string;
  calories: number;
  createdAt: string;
}

export interface NutritionData {
  version: 1;
  entries: FoodEntry[];
}

/** Ordered consistently for forms, summaries, and history views. */
export const MEAL_TYPES: readonly MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snacks",
] as const;

export const MEAL_TYPE_NAMES: Readonly<Record<MealType, string>> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snacks: "加餐",
};

/** Alias that reads naturally in presentation code. */
export const MEAL_TYPE_LABELS = MEAL_TYPE_NAMES;
export const MEAL_LABELS = MEAL_TYPE_NAMES;
