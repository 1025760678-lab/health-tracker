import {
  MEAL_TYPES,
  type FoodEntry,
  type MealType,
  type NutritionData,
} from "../types/nutrition";

export type NutritionDateInput = Date | string;

export type MealCalorieTotals = Record<MealType, number>;

export interface DailyNutritionSummary {
  date: string;
  mealCalories: MealCalorieTotals;
  totalCalories: number;
}

export interface NutritionHistoryGroup extends DailyNutritionSummary {
  entries: FoodEntry[];
  entriesByMeal: Record<MealType, FoodEntry[]>;
}

/** The caller supplies identity/time so data mutations remain deterministic. */
export type NewFoodEntry = FoodEntry;

export type FoodEntryChanges = Partial<Omit<FoodEntry, "id">>;

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function isValidDateKey(value: string): boolean {
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

/** Returns a YYYY-MM-DD key using the device's local calendar, not UTC. */
export function getLocalDateKey(date: Date = new Date()): string {
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError("Cannot create a nutrition date from an invalid Date.");
  }

  return `${date.getFullYear()}-${padDatePart(
    date.getMonth() + 1,
  )}-${padDatePart(date.getDate())}`;
}

export function toNutritionDateKey(value: NutritionDateInput): string {
  if (value instanceof Date) return getLocalDateKey(value);
  if (isValidDateKey(value)) return value;

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new RangeError(`Invalid nutrition date: ${value}`);
  }
  return getLocalDateKey(parsed);
}

function localDateAtNoon(value: NutritionDateInput): Date {
  const dateKey = toNutritionDateKey(value);
  const [year, month, day] = dateKey.split("-").map(Number);
  // Noon avoids DST transitions that can occur around local midnight.
  return new Date(year, month - 1, day, 12);
}

function emptyMealTotals(): MealCalorieTotals {
  return { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 };
}

function emptyMealEntries(): Record<MealType, FoodEntry[]> {
  return { breakfast: [], lunch: [], dinner: [], snacks: [] };
}

function compareEntries(a: FoodEntry, b: FoodEntry): number {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

function assertValidEntry(entry: FoodEntry): void {
  if (!entry.id.trim()) throw new TypeError("Food entry id is required.");
  if (!isValidDateKey(entry.date)) {
    throw new RangeError(`Invalid food entry date: ${entry.date}`);
  }
  if (!MEAL_TYPES.includes(entry.mealType)) {
    throw new TypeError(`Invalid meal type: ${entry.mealType}`);
  }
  if (!entry.foodName.trim()) throw new TypeError("Food name is required.");
  if (!Number.isFinite(entry.calories) || entry.calories < 0) {
    throw new RangeError("Calories must be a non-negative finite number.");
  }
  if (!Number.isFinite(Date.parse(entry.createdAt))) {
    throw new RangeError("Food entry createdAt must be a valid timestamp.");
  }
}

export function getEntriesForDate(
  data: NutritionData,
  date: NutritionDateInput,
): FoodEntry[] {
  const dateKey = toNutritionDateKey(date);
  return data.entries
    .filter((entry) => entry.date === dateKey)
    .sort(compareEntries);
}

export function getEntriesForMeal(
  data: NutritionData,
  date: NutritionDateInput,
  mealType: MealType,
): FoodEntry[] {
  return getEntriesForDate(data, date).filter(
    (entry) => entry.mealType === mealType,
  );
}

export function calculateMealCalories(
  entries: readonly FoodEntry[],
  mealType: MealType,
): number {
  return entries.reduce(
    (total, entry) =>
      entry.mealType === mealType ? total + entry.calories : total,
    0,
  );
}

export function getMealCalorieTotals(
  entries: readonly FoodEntry[],
): MealCalorieTotals {
  return entries.reduce<MealCalorieTotals>((totals, entry) => {
    totals[entry.mealType] += entry.calories;
    return totals;
  }, emptyMealTotals());
}

export function calculateTotalCalories(entries: readonly FoodEntry[]): number {
  return entries.reduce((total, entry) => total + entry.calories, 0);
}

export function getDailyNutritionSummary(
  data: NutritionData,
  date: NutritionDateInput,
): DailyNutritionSummary {
  const dateKey = toNutritionDateKey(date);
  const entries = getEntriesForDate(data, dateKey);
  return {
    date: dateKey,
    mealCalories: getMealCalorieTotals(entries),
    totalCalories: calculateTotalCalories(entries),
  };
}

/** Returns seven local date keys, oldest first and including the end date. */
export function getSevenDayDateRange(
  endDate: NutritionDateInput = new Date(),
): string[] {
  const end = localDateAtNoon(endDate);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (6 - index));
    return getLocalDateKey(date);
  });
}

/** Includes empty dates so a weekly chart always has exactly seven points. */
export function getSevenDayNutritionSummary(
  data: NutritionData,
  endDate: NutritionDateInput = new Date(),
): DailyNutritionSummary[] {
  return getSevenDayDateRange(endDate).map((date) =>
    getDailyNutritionSummary(data, date),
  );
}

/** Groups populated days newest first, with entries ordered within each meal. */
export function getNutritionHistory(
  data: NutritionData,
): NutritionHistoryGroup[] {
  const dates = Array.from(new Set(data.entries.map((entry) => entry.date))).sort(
    (a, b) => b.localeCompare(a),
  );

  return dates.map((date) => {
    const entries = getEntriesForDate(data, date);
    const entriesByMeal = entries.reduce<Record<MealType, FoodEntry[]>>(
      (groups, entry) => {
        groups[entry.mealType].push(entry);
        return groups;
      },
      emptyMealEntries(),
    );
    const mealCalories = getMealCalorieTotals(entries);

    return {
      date,
      entries,
      entriesByMeal,
      mealCalories,
      totalCalories: calculateTotalCalories(entries),
    };
  });
}

/** Adds one entry and returns a new NutritionData value. */
export function addFoodEntry(
  data: NutritionData,
  input: NewFoodEntry,
): NutritionData {
  const entry: FoodEntry = {
    ...input,
    id: input.id.trim(),
    date: toNutritionDateKey(input.date),
    foodName: input.foodName.trim(),
    ...(input.quantity?.trim()
      ? { quantity: input.quantity.trim() }
      : { quantity: undefined }),
    createdAt: input.createdAt,
  };
  assertValidEntry(entry);

  if (data.entries.some((candidate) => candidate.id === entry.id)) {
    throw new Error(`Food entry already exists: ${entry.id}`);
  }

  return { ...data, entries: [...data.entries, entry] };
}

/** Updates an existing entry without mutating the input data. */
export function updateFoodEntry(
  data: NutritionData,
  entryId: string,
  changes: FoodEntryChanges,
): NutritionData {
  let found = false;
  const entries = data.entries.map((entry) => {
    if (entry.id !== entryId) return entry;
    found = true;
    const updated: FoodEntry = {
      ...entry,
      ...changes,
      id: entry.id,
      date:
        changes.date === undefined
          ? entry.date
          : toNutritionDateKey(changes.date),
      foodName: (changes.foodName ?? entry.foodName).trim(),
      ...(changes.quantity === undefined
        ? {}
        : changes.quantity.trim()
          ? { quantity: changes.quantity.trim() }
          : { quantity: undefined }),
    };
    assertValidEntry(updated);
    return updated;
  });

  return found ? { ...data, entries } : data;
}

export function deleteFoodEntry(
  data: NutritionData,
  entryId: string,
): NutritionData {
  const entries = data.entries.filter((entry) => entry.id !== entryId);
  return entries.length === data.entries.length ? data : { ...data, entries };
}

export function moveFoodEntry(
  data: NutritionData,
  entryId: string,
  mealType: MealType,
): NutritionData {
  if (!MEAL_TYPES.includes(mealType)) {
    throw new TypeError(`Invalid meal type: ${mealType}`);
  }
  return updateFoodEntry(data, entryId, { mealType });
}

// Compact aliases for consumers that name mutations by their domain object.
export const addNutritionEntry = addFoodEntry;
export const updateNutritionEntry = updateFoodEntry;
export const deleteNutritionEntry = deleteFoodEntry;
export const moveNutritionEntry = moveFoodEntry;
