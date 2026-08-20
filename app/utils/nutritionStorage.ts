import {
  MEAL_TYPES,
  type FoodEntry,
  type MealType,
  type NutritionData,
} from "../types/nutrition";

export const NUTRITION_DATA_VERSION = 1 as const;
export const NUTRITION_STORAGE_KEY = "nutritionTracker_data_v1";

const SAFE_DATE = "1970-01-01";
const SAFE_CREATED_AT = `${SAFE_DATE}T00:00:00.000Z`;
const MEAL_TYPE_SET = new Set<MealType>(MEAL_TYPES);
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type NutritionStorage = Pick<Storage, "getItem" | "setItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function isMealType(value: unknown): value is MealType {
  return typeof value === "string" && MEAL_TYPE_SET.has(value as MealType);
}

function isLocalDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function localDateFromTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function repairCreatedAt(value: unknown, date: string): string {
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return value;
  }
  return date === SAFE_DATE ? SAFE_CREATED_AT : `${date}T00:00:00.000Z`;
}

function finiteNonNegativeNumber(value: unknown): number | null {
  if (
    typeof value !== "number" &&
    !(typeof value === "string" && value.trim().length > 0)
  ) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function repairEntries(value: unknown): FoodEntry[] {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set<string>();
  return value.flatMap((candidate, index): FoodEntry[] => {
    if (!isRecord(candidate)) return [];

    const foodName = nonEmptyString(candidate.foodName ?? candidate.name);
    const calories = finiteNonNegativeNumber(candidate.calories);
    if (!foodName || calories === null) return [];

    const createdAtCandidate = candidate.createdAt ?? candidate.timestamp;
    const date = isLocalDate(candidate.date)
      ? candidate.date
      : localDateFromTimestamp(createdAtCandidate);
    if (!date) return [];

    const mealType = isMealType(candidate.mealType)
      ? candidate.mealType
      : "snacks";
    const suppliedId = nonEmptyString(candidate.id);
    const id = suppliedId ?? `recovered-food-${date}-${index + 1}`;
    if (seenIds.has(id)) return [];
    seenIds.add(id);

    const quantity = nonEmptyString(candidate.quantity ?? candidate.serving);
    return [
      {
        id,
        date,
        mealType,
        foodName,
        ...(quantity ? { quantity } : {}),
        calories,
        createdAt: repairCreatedAt(createdAtCandidate, date),
      },
    ];
  });
}

function resolveStorage(
  storage?: NutritionStorage | null,
): NutritionStorage | null {
  if (storage !== undefined) return storage;
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createInitialNutritionData(): NutritionData {
  return {
    version: NUTRITION_DATA_VERSION,
    entries: [],
  };
}

/**
 * Repairs untrusted persisted data without mutating it. Missing version, date,
 * timestamp, quantity, and older name/serving fields are handled safely.
 */
export function repairNutritionData(value: unknown): NutritionData {
  if (!isRecord(value)) return createInitialNutritionData();

  return {
    version: NUTRITION_DATA_VERSION,
    entries: repairEntries(value.entries),
  };
}

export function loadNutritionData(
  storage?: NutritionStorage | null,
): NutritionData {
  const target = resolveStorage(storage);
  if (!target) return createInitialNutritionData();

  let data: NutritionData;
  try {
    const serialized = target.getItem(NUTRITION_STORAGE_KEY);
    data =
      serialized === null
        ? createInitialNutritionData()
        : repairNutritionData(JSON.parse(serialized) as unknown);
  } catch {
    data = createInitialNutritionData();
  }

  try {
    // Persist the initialized/repaired shape only under the nutrition namespace.
    target.setItem(NUTRITION_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Read-only/privacy storage can still supply usable in-memory data.
  }
  return data;
}

export function saveNutritionData(
  data: NutritionData,
  storage?: NutritionStorage | null,
): boolean {
  const target = resolveStorage(storage);
  if (!target) return false;

  try {
    target.setItem(
      NUTRITION_STORAGE_KEY,
      JSON.stringify(repairNutritionData(data)),
    );
    return true;
  } catch {
    return false;
  }
}
