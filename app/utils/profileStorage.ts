import type {
  BaselineActivityLevel,
  BiologicalSex,
  CalorieGoalType,
  UserBodyProfile,
  WeightRecord,
} from "../types/profile";

export const BODY_PROFILE_STORAGE_KEY = "bodyProfile_data_v1";
export const WEIGHT_RECORDS_STORAGE_KEY = "weightTracker_records_v1";

const SAFE_TIMESTAMP = "1970-01-01T00:00:00.000Z";

export const DEFAULT_BODY_PROFILE: Readonly<UserBodyProfile> = {
  calorieGoalType: "maintenance",
  updatedAt: SAFE_TIMESTAMP,
};

type ProfileStorage = Pick<Storage, "getItem" | "setItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBiologicalSex(value: unknown): value is BiologicalSex {
  return value === "male" || value === "female";
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

function isCalorieGoalType(value: unknown): value is CalorieGoalType {
  return (
    value === "maintenance" ||
    value === "deficit" ||
    value === "surplus" ||
    value === "custom"
  );
}

function positiveFiniteNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  const number = positiveFiniteNumber(value);
  return number === undefined || !Number.isInteger(number) ? undefined : number;
}

function repairTimestamp(value: unknown): string {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : SAFE_TIMESTAMP;
}

function isLocalDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function resolveStorage(storage?: ProfileStorage | null): ProfileStorage | null {
  if (storage !== undefined) return storage;
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function repairBodyProfile(value: unknown): UserBodyProfile {
  if (!isRecord(value)) return { ...DEFAULT_BODY_PROFILE };

  const biologicalSex = isBiologicalSex(value.biologicalSex)
    ? value.biologicalSex
    : undefined;
  const age = positiveInteger(value.age);
  const heightCm = positiveFiniteNumber(value.heightCm);
  const currentWeightKg = positiveFiniteNumber(value.currentWeightKg);
  const baselineActivityLevel = isBaselineActivityLevel(
    value.baselineActivityLevel,
  )
    ? value.baselineActivityLevel
    : undefined;
  const calorieGoalType = isCalorieGoalType(value.calorieGoalType)
    ? value.calorieGoalType
    : DEFAULT_BODY_PROFILE.calorieGoalType;
  const calorieGoalValue = positiveFiniteNumber(value.calorieGoalValue);

  return {
    ...(biologicalSex !== undefined ? { biologicalSex } : {}),
    ...(age !== undefined ? { age } : {}),
    ...(heightCm !== undefined ? { heightCm } : {}),
    ...(currentWeightKg !== undefined ? { currentWeightKg } : {}),
    ...(baselineActivityLevel !== undefined ? { baselineActivityLevel } : {}),
    calorieGoalType,
    ...(calorieGoalValue !== undefined ? { calorieGoalValue } : {}),
    updatedAt: repairTimestamp(value.updatedAt),
  };
}

export function loadBodyProfile(
  storage?: ProfileStorage | null,
): UserBodyProfile {
  const target = resolveStorage(storage);
  if (!target) return { ...DEFAULT_BODY_PROFILE };

  try {
    const saved = target.getItem(BODY_PROFILE_STORAGE_KEY);
    return saved === null
      ? { ...DEFAULT_BODY_PROFILE }
      : repairBodyProfile(JSON.parse(saved) as unknown);
  } catch {
    return { ...DEFAULT_BODY_PROFILE };
  }
}

export function saveBodyProfile(
  profile: UserBodyProfile,
  storage?: ProfileStorage | null,
): UserBodyProfile {
  const repaired = repairBodyProfile(profile);
  const target = resolveStorage(storage);
  if (target) {
    try {
      target.setItem(BODY_PROFILE_STORAGE_KEY, JSON.stringify(repaired));
    } catch {
      // Persistence can be unavailable (for example, private browsing quotas).
    }
  }
  return repaired;
}

export function repairWeightRecords(value: unknown): WeightRecord[] {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set<string>();
  return value.flatMap((candidate): WeightRecord[] => {
    if (
      !isRecord(candidate) ||
      !isNonEmptyString(candidate.id) ||
      seenIds.has(candidate.id) ||
      !isLocalDate(candidate.date)
    ) {
      return [];
    }

    const weightKg = positiveFiniteNumber(candidate.weightKg);
    if (weightKg === undefined) return [];

    seenIds.add(candidate.id);
    return [
      {
        id: candidate.id,
        date: candidate.date,
        weightKg,
        createdAt: repairTimestamp(candidate.createdAt),
      },
    ];
  });
}

export function loadWeightRecords(
  storage?: ProfileStorage | null,
): WeightRecord[] {
  const target = resolveStorage(storage);
  if (!target) return [];

  try {
    const saved = target.getItem(WEIGHT_RECORDS_STORAGE_KEY);
    return saved === null
      ? []
      : repairWeightRecords(JSON.parse(saved) as unknown);
  } catch {
    return [];
  }
}

export function saveWeightRecords(
  records: WeightRecord[],
  storage?: ProfileStorage | null,
): WeightRecord[] {
  const repaired = repairWeightRecords(records);
  const target = resolveStorage(storage);
  if (target) {
    try {
      target.setItem(WEIGHT_RECORDS_STORAGE_KEY, JSON.stringify(repaired));
    } catch {
      // Keep the in-memory value usable even when persistence fails.
    }
  }
  return repaired;
}
