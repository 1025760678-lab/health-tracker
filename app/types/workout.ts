export type MuscleGroupId =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps";

export type ParentMuscleGroupId = "arms";

export interface MuscleGroup {
  id: MuscleGroupId;
  name: string;
  parentGroup?: ParentMuscleGroupId;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroupId: MuscleGroupId;
  createdAt: string;
}

export type WorkoutIntensity = "light" | "moderate" | "vigorous";
export type CalorieEstimateMethod = "met" | "manual";

export interface WorkoutSession {
  id: string;
  /** Local calendar date in YYYY-MM-DD format. */
  date: string;
  createdAt: string;
  /** Local start time, normally stored as HH:mm. */
  startTime?: string;
  durationMinutes?: number;
  intensity?: WorkoutIntensity;
  estimatedCaloriesBurned?: number;
  calorieEstimateMethod?: CalorieEstimateMethod;
  notes?: string;
}

export interface WorkoutExercise {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  createdAt: string;
}

export interface WorkoutSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  createdAt: string;
}

export interface WorkoutData {
  version: number;
  exercises: Exercise[];
  sessions: WorkoutSession[];
  workoutExercises: WorkoutExercise[];
  sets: WorkoutSet[];
}

export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  { id: "chest", name: "Chest" },
  { id: "back", name: "Back" },
  { id: "shoulders", name: "Shoulders" },
  { id: "biceps", name: "Biceps", parentGroup: "arms" },
  { id: "triceps", name: "Triceps", parentGroup: "arms" },
] as const;

const DEFAULT_EXERCISE_CREATED_AT = "2026-01-01T00:00:00.000Z";

/**
 * Starter library. These records are copied only when storage is initialized for
 * the first time, so deleting a starter exercise remains permanent.
 */
export const DEFAULT_EXERCISES: readonly Exercise[] = [
  {
    id: "default-bench-press",
    name: "Bench Press",
    muscleGroupId: "chest",
    createdAt: DEFAULT_EXERCISE_CREATED_AT,
  },
  {
    id: "default-incline-dumbbell-press",
    name: "Incline Dumbbell Press",
    muscleGroupId: "chest",
    createdAt: DEFAULT_EXERCISE_CREATED_AT,
  },
  {
    id: "default-chest-fly",
    name: "Chest Fly",
    muscleGroupId: "chest",
    createdAt: DEFAULT_EXERCISE_CREATED_AT,
  },
  {
    id: "default-lat-pulldown",
    name: "Lat Pulldown",
    muscleGroupId: "back",
    createdAt: DEFAULT_EXERCISE_CREATED_AT,
  },
  {
    id: "default-seated-row",
    name: "Seated Row",
    muscleGroupId: "back",
    createdAt: DEFAULT_EXERCISE_CREATED_AT,
  },
  {
    id: "default-pull-up",
    name: "Pull Up",
    muscleGroupId: "back",
    createdAt: DEFAULT_EXERCISE_CREATED_AT,
  },
  {
    id: "default-shoulder-press",
    name: "Shoulder Press",
    muscleGroupId: "shoulders",
    createdAt: DEFAULT_EXERCISE_CREATED_AT,
  },
  {
    id: "default-lateral-raise",
    name: "Lateral Raise",
    muscleGroupId: "shoulders",
    createdAt: DEFAULT_EXERCISE_CREATED_AT,
  },
  {
    id: "default-rear-delt-fly",
    name: "Rear Delt Fly",
    muscleGroupId: "shoulders",
    createdAt: DEFAULT_EXERCISE_CREATED_AT,
  },
  {
    id: "default-dumbbell-curl",
    name: "Dumbbell Curl",
    muscleGroupId: "biceps",
    createdAt: DEFAULT_EXERCISE_CREATED_AT,
  },
  {
    id: "default-hammer-curl",
    name: "Hammer Curl",
    muscleGroupId: "biceps",
    createdAt: DEFAULT_EXERCISE_CREATED_AT,
  },
  {
    id: "default-barbell-curl",
    name: "Barbell Curl",
    muscleGroupId: "biceps",
    createdAt: DEFAULT_EXERCISE_CREATED_AT,
  },
  {
    id: "default-triceps-pushdown",
    name: "Triceps Pushdown",
    muscleGroupId: "triceps",
    createdAt: DEFAULT_EXERCISE_CREATED_AT,
  },
  {
    id: "default-overhead-triceps-extension",
    name: "Overhead Triceps Extension",
    muscleGroupId: "triceps",
    createdAt: DEFAULT_EXERCISE_CREATED_AT,
  },
  {
    id: "default-dips",
    name: "Dips",
    muscleGroupId: "triceps",
    createdAt: DEFAULT_EXERCISE_CREATED_AT,
  },
] as const;
