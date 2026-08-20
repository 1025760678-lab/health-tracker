import {
  MUSCLE_GROUPS,
  type Exercise,
  type MuscleGroup,
  type MuscleGroupId,
  type WorkoutData,
  type WorkoutExercise,
  type WorkoutSession,
  type WorkoutSet,
} from "../types/workout";

export type WorkoutDateInput = Date | string;

export interface WorkoutExerciseSummary {
  workoutExercise: WorkoutExercise;
  exercise: Exercise;
  sets: WorkoutSet[];
}

export interface WorkoutMuscleGroupSummary {
  muscleGroup: MuscleGroup;
  exercises: WorkoutExerciseSummary[];
}

export interface WorkoutDaySummary {
  session: WorkoutSession;
  muscleGroups: WorkoutMuscleGroupSummary[];
  exerciseCount: number;
  setCount: number;
  totalReps: number;
  totalVolume: number;
}

export interface PreviousWorkoutPerformance {
  session: WorkoutSession;
  workoutExercises: WorkoutExercise[];
  sets: WorkoutSet[];
}

export interface PersonalBest {
  heaviestSet: WorkoutSet | null;
  heaviestWeight: number;
  bestEstimatedSet: WorkoutSet | null;
  bestEstimatedOneRepMax: number;
}

export interface WorkoutSummaryMetrics {
  sessionCount: number;
  exerciseCount: number;
  uniqueExerciseCount: number;
  muscleGroupCount: number;
  setCount: number;
  totalReps: number;
  totalVolume: number;
}

export interface EnsureWorkoutSessionResult {
  data: WorkoutData;
  session: WorkoutSession;
  created: boolean;
}

export type CreateWorkoutSessionOptions = Partial<
  Omit<WorkoutSession, "date">
>;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
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
    throw new RangeError("Cannot create a workout date from an invalid Date.");
  }

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(
    date.getDate(),
  )}`;
}

export function toWorkoutDateKey(value: WorkoutDateInput): string {
  if (value instanceof Date) return getLocalDateKey(value);
  if (isValidDateKey(value)) return value;

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new RangeError(`Invalid workout date: ${value}`);
  }
  return getLocalDateKey(parsed);
}

export function findWorkoutSessionByDate(
  data: WorkoutData,
  date: WorkoutDateInput,
): WorkoutSession | undefined {
  const dateKey = toWorkoutDateKey(date);
  return data.sessions.find((session) => session.date === dateKey);
}

export function createWorkoutSessionForDate(
  date: WorkoutDateInput,
  options: CreateWorkoutSessionOptions = {},
): WorkoutSession {
  const dateKey = toWorkoutDateKey(date);
  const { id, createdAt, ...details } = options;
  return {
    id: id ?? `workout-session-${dateKey}`,
    date: dateKey,
    createdAt: createdAt ?? `${dateKey}T00:00:00.000Z`,
    ...details,
  };
}

/** Finds the local-date session or returns a new immutable WorkoutData value. */
export function ensureWorkoutSession(
  data: WorkoutData,
  date: WorkoutDateInput,
  options: CreateWorkoutSessionOptions = {},
): EnsureWorkoutSessionResult {
  const existing = findWorkoutSessionByDate(data, date);
  if (existing) return { data, session: existing, created: false };

  const session = createWorkoutSessionForDate(date, options);
  return {
    data: { ...data, sessions: [...data.sessions, session] },
    session,
    created: true,
  };
}

function compareSets(a: WorkoutSet, b: WorkoutSet): number {
  return (
    a.setNumber - b.setNumber ||
    a.createdAt.localeCompare(b.createdAt) ||
    a.id.localeCompare(b.id)
  );
}

function getWorkoutExercisesForSession(
  data: WorkoutData,
  sessionId: string,
): WorkoutExercise[] {
  return data.workoutExercises
    .filter((entry) => entry.workoutSessionId === sessionId)
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
}

/** Builds the grouped, presentation-ready record for one local calendar date. */
export function getWorkoutForDate(
  data: WorkoutData,
  date: WorkoutDateInput,
): WorkoutDaySummary | null {
  const session = findWorkoutSessionByDate(data, date);
  if (!session) return null;

  const exerciseById = new Map(
    data.exercises.map((exercise) => [exercise.id, exercise]),
  );
  const setsByWorkoutExercise = new Map<string, WorkoutSet[]>();
  for (const set of data.sets) {
    const group = setsByWorkoutExercise.get(set.workoutExerciseId) ?? [];
    group.push(set);
    setsByWorkoutExercise.set(set.workoutExerciseId, group);
  }

  const entries = getWorkoutExercisesForSession(data, session.id).flatMap(
    (workoutExercise): WorkoutExerciseSummary[] => {
      const exercise = exerciseById.get(workoutExercise.exerciseId);
      if (!exercise) return [];
      const sets = [...(setsByWorkoutExercise.get(workoutExercise.id) ?? [])].sort(
        compareSets,
      );
      if (sets.length === 0) return [];
      return [{ workoutExercise, exercise, sets }];
    },
  );

  const muscleGroups = MUSCLE_GROUPS.flatMap(
    (muscleGroup): WorkoutMuscleGroupSummary[] => {
      const exercises = entries.filter(
        (entry) => entry.exercise.muscleGroupId === muscleGroup.id,
      );
      return exercises.length > 0 ? [{ muscleGroup, exercises }] : [];
    },
  );
  const allSets = entries.flatMap((entry) => entry.sets);

  return {
    session,
    muscleGroups,
    exerciseCount: entries.length,
    setCount: allSets.length,
    totalReps: allSets.reduce((total, set) => total + set.reps, 0),
    totalVolume: allSets.reduce(
      (total, set) => total + set.weight * set.reps,
      0,
    ),
  };
}

export function getTodaysWorkout(
  data: WorkoutData,
  today: Date = new Date(),
): WorkoutDaySummary | null {
  return getWorkoutForDate(data, getLocalDateKey(today));
}

export function getWorkoutHistory(data: WorkoutData): WorkoutDaySummary[] {
  return [...data.sessions]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )
    .flatMap((session) => {
      const summary = getWorkoutForDate(data, session.date);
      return summary && summary.setCount > 0 ? [summary] : [];
    });
}

/** Returns the most recent earlier session that contains completed sets. */
export function getPreviousWorkoutPerformance(
  data: WorkoutData,
  exerciseId: string,
  beforeDate: WorkoutDateInput,
): PreviousWorkoutPerformance | null {
  const cutoff = toWorkoutDateKey(beforeDate);
  const candidateSessions = data.sessions
    .filter((session) => session.date < cutoff)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );

  for (const session of candidateSessions) {
    const workoutExercises = getWorkoutExercisesForSession(data, session.id).filter(
      (entry) => entry.exerciseId === exerciseId,
    );
    const workoutExerciseIds = new Set(
      workoutExercises.map((entry) => entry.id),
    );
    const sets = data.sets
      .filter((set) => workoutExerciseIds.has(set.workoutExerciseId))
      .sort(
        (a, b) =>
          a.createdAt.localeCompare(b.createdAt) || compareSets(a, b),
      );

    if (sets.length > 0) return { session, workoutExercises, sets };
  }

  return null;
}

export function calculateEstimatedOneRepMax(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight < 0 || reps < 0) {
    return 0;
  }
  return weight * (1 + reps / 30);
}

function setsForExercise(data: WorkoutData, exerciseId: string): WorkoutSet[] {
  const workoutExerciseIds = new Set(
    data.workoutExercises
      .filter((entry) => entry.exerciseId === exerciseId)
      .map((entry) => entry.id),
  );
  return data.sets.filter((set) => workoutExerciseIds.has(set.workoutExerciseId));
}

export function getPersonalBest(
  data: WorkoutData,
  exerciseId: string,
): PersonalBest {
  const sets = setsForExercise(data, exerciseId);
  const heaviestSet = sets.reduce<WorkoutSet | null>((best, set) => {
    if (!best) return set;
    if (set.weight !== best.weight) return set.weight > best.weight ? set : best;
    if (set.reps !== best.reps) return set.reps > best.reps ? set : best;
    return set.createdAt > best.createdAt ? set : best;
  }, null);
  const bestEstimatedSet = sets.reduce<WorkoutSet | null>((best, set) => {
    if (!best) return set;
    const estimate = calculateEstimatedOneRepMax(set.weight, set.reps);
    const bestEstimate = calculateEstimatedOneRepMax(best.weight, best.reps);
    if (estimate !== bestEstimate) return estimate > bestEstimate ? set : best;
    return set.weight > best.weight ? set : best;
  }, null);

  return {
    heaviestSet,
    heaviestWeight: heaviestSet?.weight ?? 0,
    bestEstimatedSet,
    bestEstimatedOneRepMax: bestEstimatedSet
      ? calculateEstimatedOneRepMax(
          bestEstimatedSet.weight,
          bestEstimatedSet.reps,
        )
      : 0,
  };
}

export function getWorkoutSummaryMetrics(
  data: WorkoutData,
  date?: WorkoutDateInput,
): WorkoutSummaryMetrics {
  const allowedSessionIds = new Set(
    data.sessions
      .filter(
        (session) => date === undefined || session.date === toWorkoutDateKey(date),
      )
      .map((session) => session.id),
  );
  const workoutExercises = data.workoutExercises.filter((entry) =>
    allowedSessionIds.has(entry.workoutSessionId),
  );
  const workoutExerciseIds = new Set(workoutExercises.map((entry) => entry.id));
  const sets = data.sets.filter((set) =>
    workoutExerciseIds.has(set.workoutExerciseId),
  );
  const completedWorkoutExerciseIds = new Set(
    sets.map((set) => set.workoutExerciseId),
  );
  const completedWorkoutExercises = workoutExercises.filter((entry) =>
    completedWorkoutExerciseIds.has(entry.id),
  );
  const uniqueExerciseIds = new Set(
    completedWorkoutExercises.map((entry) => entry.exerciseId),
  );
  const exerciseById = new Map(
    data.exercises.map((exercise) => [exercise.id, exercise]),
  );
  const muscleGroupIds = new Set<MuscleGroupId>();
  for (const exerciseId of uniqueExerciseIds) {
    const muscleGroupId = exerciseById.get(exerciseId)?.muscleGroupId;
    if (muscleGroupId) muscleGroupIds.add(muscleGroupId);
  }
  const completedSessionIds = new Set(
    completedWorkoutExercises.map((entry) => entry.workoutSessionId),
  );

  return {
    sessionCount: completedSessionIds.size,
    exerciseCount: completedWorkoutExercises.length,
    uniqueExerciseCount: uniqueExerciseIds.size,
    muscleGroupCount: muscleGroupIds.size,
    setCount: sets.length,
    totalReps: sets.reduce((total, set) => total + set.reps, 0),
    totalVolume: sets.reduce((total, set) => total + set.weight * set.reps, 0),
  };
}

export const getWorkoutSummary = getWorkoutSummaryMetrics;

/** Renumbers every exercise independently without mutating the input array. */
export function reorderWorkoutSetNumbers(sets: readonly WorkoutSet[]): WorkoutSet[] {
  const groups = new Map<string, WorkoutSet[]>();
  for (const set of sets) {
    const group = groups.get(set.workoutExerciseId) ?? [];
    group.push(set);
    groups.set(set.workoutExerciseId, group);
  }

  return Array.from(groups.values()).flatMap((group) =>
    [...group].sort(compareSets).map((set, index) => ({
      ...set,
      setNumber: index + 1,
    })),
  );
}

export const renumberWorkoutSets = reorderWorkoutSetNumbers;

export function renumberSetsForWorkoutExercise(
  data: WorkoutData,
  workoutExerciseId: string,
): WorkoutData {
  const targetSets = data.sets.filter(
    (set) => set.workoutExerciseId === workoutExerciseId,
  );
  const renumbered = new Map(
    reorderWorkoutSetNumbers(targetSets).map((set) => [set.id, set]),
  );
  return {
    ...data,
    sets: data.sets.map((set) => renumbered.get(set.id) ?? set),
  };
}

function removeEmptySessions(data: WorkoutData): WorkoutData {
  const usedSessionIds = new Set(
    data.workoutExercises.map((entry) => entry.workoutSessionId),
  );
  return {
    ...data,
    sessions: data.sessions.filter((session) => usedSessionIds.has(session.id)),
  };
}

export function deleteExerciseCascade(
  data: WorkoutData,
  exerciseId: string,
): WorkoutData {
  const removedWorkoutExerciseIds = new Set(
    data.workoutExercises
      .filter((entry) => entry.exerciseId === exerciseId)
      .map((entry) => entry.id),
  );
  return removeEmptySessions({
    ...data,
    exercises: data.exercises.filter((exercise) => exercise.id !== exerciseId),
    workoutExercises: data.workoutExercises.filter(
      (entry) => entry.exerciseId !== exerciseId,
    ),
    sets: data.sets.filter(
      (set) => !removedWorkoutExerciseIds.has(set.workoutExerciseId),
    ),
  });
}

export function deleteWorkoutExerciseCascade(
  data: WorkoutData,
  workoutExerciseId: string,
): WorkoutData {
  return removeEmptySessions({
    ...data,
    workoutExercises: data.workoutExercises.filter(
      (entry) => entry.id !== workoutExerciseId,
    ),
    sets: data.sets.filter(
      (set) => set.workoutExerciseId !== workoutExerciseId,
    ),
  });
}

export function deleteWorkoutSessionCascade(
  data: WorkoutData,
  sessionId: string,
): WorkoutData {
  const removedWorkoutExerciseIds = new Set(
    data.workoutExercises
      .filter((entry) => entry.workoutSessionId === sessionId)
      .map((entry) => entry.id),
  );
  return {
    ...data,
    sessions: data.sessions.filter((session) => session.id !== sessionId),
    workoutExercises: data.workoutExercises.filter(
      (entry) => entry.workoutSessionId !== sessionId,
    ),
    sets: data.sets.filter(
      (set) => !removedWorkoutExerciseIds.has(set.workoutExerciseId),
    ),
  };
}

export function deleteWorkoutSet(data: WorkoutData, setId: string): WorkoutData {
  const removed = data.sets.find((set) => set.id === setId);
  if (!removed) return data;

  return renumberSetsForWorkoutExercise(
    { ...data, sets: data.sets.filter((set) => set.id !== setId) },
    removed.workoutExerciseId,
  );
}
