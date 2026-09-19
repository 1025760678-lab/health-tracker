import {
  DEFAULT_EXERCISES,
  MUSCLE_GROUPS,
  type CalorieEstimateMethod,
  type Exercise,
  type MuscleGroupId,
  type WorkoutData,
  type WorkoutExercise,
  type WorkoutIntensity,
  type WorkoutSession,
  type WorkoutSet,
} from "../types/workout";

export const WORKOUT_DATA_VERSION = 1;
export const WORKOUT_STORAGE_KEY = "workoutTracker_data";

const SAFE_CREATED_AT = "1970-01-01T00:00:00.000Z";
const MUSCLE_GROUP_IDS = new Set<MuscleGroupId>(
  MUSCLE_GROUPS.map((group) => group.id),
);

type WorkoutStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isMuscleGroupId(value: unknown): value is MuscleGroupId {
  return typeof value === "string" && MUSCLE_GROUP_IDS.has(value as MuscleGroupId);
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

function repairTimestamp(value: unknown): string {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : SAFE_CREATED_AT;
}

function finiteNonNegativeNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function optionalFiniteNonNegativeNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return finiteNonNegativeNumber(value) ?? undefined;
}

function repairStartTime(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) return trimmed;
  return Number.isFinite(Date.parse(trimmed)) ? trimmed : undefined;
}

function isWorkoutIntensity(value: unknown): value is WorkoutIntensity {
  return value === "light" || value === "moderate" || value === "vigorous";
}

function isCalorieEstimateMethod(
  value: unknown,
): value is CalorieEstimateMethod {
  return value === "met" || value === "manual";
}

function uniqueById<T extends { id: string }>(records: T[]): T[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    if (seen.has(record.id)) return false;
    seen.add(record.id);
    return true;
  });
}

function repairExercises(value: unknown): Exercise[] {
  if (!Array.isArray(value)) return [];

  return uniqueById(
    value.flatMap((candidate): Exercise[] => {
      if (
        !isRecord(candidate) ||
        !isNonEmptyString(candidate.id) ||
        !isNonEmptyString(candidate.name) ||
        !isMuscleGroupId(candidate.muscleGroupId)
      ) {
        return [];
      }

      return [
        {
          id: candidate.id,
          name: candidate.name.trim(),
          muscleGroupId: candidate.muscleGroupId,
          createdAt: repairTimestamp(candidate.createdAt),
        },
      ];
    }),
  );
}

function repairSessions(value: unknown): WorkoutSession[] {
  if (!Array.isArray(value)) return [];

  return uniqueById(
    value.flatMap((candidate): WorkoutSession[] => {
      if (
        !isRecord(candidate) ||
        !isNonEmptyString(candidate.id) ||
        !isLocalDate(candidate.date)
      ) {
        return [];
      }

      const startTime = repairStartTime(candidate.startTime);
      const durationMinutes = optionalFiniteNonNegativeNumber(
        candidate.durationMinutes,
      );
      const estimatedCaloriesBurned = optionalFiniteNonNegativeNumber(
        candidate.estimatedCaloriesBurned,
      );
      const notes =
        typeof candidate.notes === "string" && candidate.notes.trim().length > 0
          ? candidate.notes.trim()
          : undefined;

      return [
        {
          id: candidate.id,
          date: candidate.date,
          createdAt: repairTimestamp(candidate.createdAt),
          ...(startTime !== undefined ? { startTime } : {}),
          ...(durationMinutes !== undefined ? { durationMinutes } : {}),
          ...(isWorkoutIntensity(candidate.intensity)
            ? { intensity: candidate.intensity }
            : {}),
          ...(estimatedCaloriesBurned !== undefined
            ? { estimatedCaloriesBurned }
            : {}),
          ...(isCalorieEstimateMethod(candidate.calorieEstimateMethod)
            ? { calorieEstimateMethod: candidate.calorieEstimateMethod }
            : {}),
          ...(notes !== undefined ? { notes } : {}),
        },
      ];
    }),
  );
}

function repairWorkoutExercises(
  value: unknown,
  exerciseIds: ReadonlySet<string>,
  sessionIds: ReadonlySet<string>,
): WorkoutExercise[] {
  if (!Array.isArray(value)) return [];

  return uniqueById(
    value.flatMap((candidate): WorkoutExercise[] => {
      if (
        !isRecord(candidate) ||
        !isNonEmptyString(candidate.id) ||
        !isNonEmptyString(candidate.exerciseId) ||
        !isNonEmptyString(candidate.workoutSessionId) ||
        !exerciseIds.has(candidate.exerciseId) ||
        !sessionIds.has(candidate.workoutSessionId)
      ) {
        return [];
      }

      return [
        {
          id: candidate.id,
          workoutSessionId: candidate.workoutSessionId,
          exerciseId: candidate.exerciseId,
          createdAt: repairTimestamp(candidate.createdAt),
          ...(typeof candidate.targetSets === "number" && Number.isInteger(candidate.targetSets) && candidate.targetSets >= 1 && candidate.targetSets <= 12
            ? { targetSets: candidate.targetSets } : {}),
          ...(candidate.effort === "easy" || candidate.effort === "normal" || candidate.effort === "hard"
            ? { effort: candidate.effort } : {}),
          ...(typeof candidate.notes === "string" && candidate.notes.trim()
            ? { notes: candidate.notes.trim().slice(0, 240) } : {}),
        },
      ];
    }),
  );
}

function repairSets(
  value: unknown,
  workoutExerciseIds: ReadonlySet<string>,
): WorkoutSet[] {
  if (!Array.isArray(value)) return [];

  const repaired = uniqueById(
    value.flatMap((candidate): WorkoutSet[] => {
      if (
        !isRecord(candidate) ||
        !isNonEmptyString(candidate.id) ||
        !isNonEmptyString(candidate.workoutExerciseId) ||
        !workoutExerciseIds.has(candidate.workoutExerciseId)
      ) {
        return [];
      }

      const weight = finiteNonNegativeNumber(candidate.weight);
      const reps = finiteNonNegativeNumber(candidate.reps);
      if (weight === null || reps === null) return [];

      const setNumber = finiteNonNegativeNumber(candidate.setNumber);
      return [
        {
          id: candidate.id,
          workoutExerciseId: candidate.workoutExerciseId,
          setNumber: setNumber === null ? 0 : Math.floor(setNumber),
          weight,
          reps: Math.floor(reps),
          createdAt: repairTimestamp(candidate.createdAt),
        },
      ];
    }),
  );

  const setsByWorkoutExercise = new Map<string, WorkoutSet[]>();
  for (const set of repaired) {
    const group = setsByWorkoutExercise.get(set.workoutExerciseId) ?? [];
    group.push(set);
    setsByWorkoutExercise.set(set.workoutExerciseId, group);
  }

  return Array.from(setsByWorkoutExercise.values()).flatMap((sets) =>
    [...sets]
      .sort(
        (a, b) =>
          a.setNumber - b.setNumber ||
          a.createdAt.localeCompare(b.createdAt) ||
          a.id.localeCompare(b.id),
      )
      .map((set, index) => ({ ...set, setNumber: index + 1 })),
  );
}

function resolveStorage(storage?: WorkoutStorage | null): WorkoutStorage | null {
  if (storage !== undefined) return storage;
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createInitialWorkoutData(): WorkoutData {
  return {
    version: WORKOUT_DATA_VERSION,
    exercises: DEFAULT_EXERCISES.map((exercise) => ({ ...exercise })),
    sessions: [],
    workoutExercises: [],
    sets: [],
  };
}

/**
 * Converts an unknown persisted value into a relationally valid data graph.
 * Existing exercise arrays are never merged with the starter library.
 */
export function repairWorkoutData(value: unknown): WorkoutData {
  if (!isRecord(value)) return createInitialWorkoutData();

  const exercises = repairExercises(value.exercises);
  const sessions = repairSessions(value.sessions);
  const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
  const sessionIds = new Set(sessions.map((session) => session.id));
  const workoutExercises = repairWorkoutExercises(
    value.workoutExercises,
    exerciseIds,
    sessionIds,
  );
  const workoutExerciseIds = new Set(
    workoutExercises.map((workoutExercise) => workoutExercise.id),
  );

  return {
    version: WORKOUT_DATA_VERSION,
    exercises,
    sessions,
    workoutExercises,
    sets: repairSets(value.sets, workoutExerciseIds),
  };
}

export function loadWorkoutData(storage?: WorkoutStorage | null): WorkoutData {
  const target = resolveStorage(storage);
  if (!target) return createInitialWorkoutData();

  try {
    const serialized = target.getItem(WORKOUT_STORAGE_KEY);
    if (serialized === null) {
      const initialData = createInitialWorkoutData();
      target.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(initialData));
      return initialData;
    }

    const repaired = repairWorkoutData(JSON.parse(serialized) as unknown);
    target.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(repaired));
    return repaired;
  } catch {
    const initialData = createInitialWorkoutData();
    try {
      target.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(initialData));
    } catch {
      // Storage can be unavailable in privacy mode; in-memory defaults still work.
    }
    return initialData;
  }
}

export function saveWorkoutData(
  data: WorkoutData,
  storage?: WorkoutStorage | null,
): boolean {
  const target = resolveStorage(storage);
  if (!target) return false;

  try {
    target.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(repairWorkoutData(data)));
    return true;
  } catch {
    return false;
  }
}

export function clearWorkoutData(storage?: WorkoutStorage | null): boolean {
  const target = resolveStorage(storage);
  if (!target) return false;

  try {
    target.removeItem(WORKOUT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
