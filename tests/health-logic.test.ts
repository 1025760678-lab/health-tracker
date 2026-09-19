import assert from "node:assert/strict";
import test from "node:test";
import type { NutritionData } from "../app/types/nutrition";
import type { UserBodyProfile } from "../app/types/profile";
import type { WorkoutData } from "../app/types/workout";
import {
  calculateBMR,
  calculateBaselineExpenditure,
  calculateCalorieBalance,
  calculateTotalDailyExpenditure,
  estimateWorkoutCalories,
} from "../app/utils/energyCalculations";
import {
  addFoodEntry,
  deleteFoodEntry,
  getDailyNutritionSummary,
  getSevenDayDateRange,
  moveFoodEntry,
  updateFoodEntry,
} from "../app/utils/nutritionLogic";
import {
  loadNutritionData,
  saveNutritionData,
} from "../app/utils/nutritionStorage";
import {
  loadBodyProfile,
  loadWeightRecords,
  saveBodyProfile,
  saveWeightRecords,
} from "../app/utils/profileStorage";
import {
  deleteExerciseCascade,
  deleteWorkoutSet,
  getPreviousWorkoutPerformance,
  getWorkoutForDate,
} from "../app/utils/workoutLogic";
import {
  loadWorkoutData,
  saveWorkoutData,
} from "../app/utils/workoutStorage";

const profile: UserBodyProfile = {
  biologicalSex: "male",
  age: 30,
  heightCm: 180,
  currentWeightKg: 80,
  baselineActivityLevel: "sedentary",
  calorieGoalType: "maintenance",
  updatedAt: "2026-08-20T00:00:00.000Z",
};

test("Mifflin-St Jeor and tracked workout burn use the single non-duplicating model", () => {
  assert.equal(calculateBMR(profile), 1780);
  assert.equal(calculateBaselineExpenditure(profile), 2136);
  assert.equal(estimateWorkoutCalories(80, 60, "moderate"), 420);
  assert.equal(calculateTotalDailyExpenditure(2136, 420), 2556);
  assert.deepEqual(calculateCalorieBalance(2000, 2556), {
    balance: -556,
    status: "deficit",
    amount: 556,
    label: "Estimated Deficit",
  });
  assert.equal(calculateBMR({ ...profile, biologicalSex: undefined }), null);
});

test("nutrition CRUD, meal movement, totals and seven-day range remain deterministic", () => {
  const empty: NutritionData = { version: 1, entries: [] };
  const breakfast = {
    id: "food-1",
    date: "2026-08-20",
    mealType: "breakfast" as const,
    foodName: "鸡蛋",
    quantity: "2 个",
    calories: 140,
    createdAt: "2026-08-20T08:00:00.000Z",
  };
  const added = addFoodEntry(empty, breakfast);
  const edited = updateFoodEntry(added, breakfast.id, { calories: 160 });
  const moved = moveFoodEntry(edited, breakfast.id, "lunch");
  const summary = getDailyNutritionSummary(moved, "2026-08-20");
  assert.equal(summary.totalCalories, 160);
  assert.equal(summary.mealCalories.breakfast, 0);
  assert.equal(summary.mealCalories.lunch, 160);
  assert.equal(deleteFoodEntry(moved, breakfast.id).entries.length, 0);
  assert.deepEqual(getSevenDayDateRange("2026-08-20"), [
    "2026-08-14",
    "2026-08-15",
    "2026-08-16",
    "2026-08-17",
    "2026-08-18",
    "2026-08-19",
    "2026-08-20",
  ]);
});

function workoutFixture(): WorkoutData {
  return {
    version: 1,
    exercises: [
      { id: "bench", name: "Bench Press", muscleGroupId: "chest", createdAt: "2026-08-01T00:00:00.000Z" },
    ],
    sessions: [
      { id: "previous", date: "2026-08-18", createdAt: "2026-08-18T10:00:00.000Z" },
      { id: "today", date: "2026-08-20", createdAt: "2026-08-20T10:00:00.000Z" },
    ],
    workoutExercises: [
      { id: "previous-bench", workoutSessionId: "previous", exerciseId: "bench", createdAt: "2026-08-18T10:01:00.000Z" },
      { id: "today-bench", workoutSessionId: "today", exerciseId: "bench", createdAt: "2026-08-20T10:01:00.000Z" },
    ],
    sets: [
      { id: "previous-set", workoutExerciseId: "previous-bench", setNumber: 1, weight: 70, reps: 8, createdAt: "2026-08-18T10:02:00.000Z" },
      { id: "today-set-1", workoutExerciseId: "today-bench", setNumber: 1, weight: 75, reps: 8, createdAt: "2026-08-20T10:02:00.000Z" },
      { id: "today-set-2", workoutExerciseId: "today-bench", setNumber: 2, weight: 75, reps: 7, createdAt: "2026-08-20T10:03:00.000Z" },
    ],
  };
}

test("workout grouping, previous reference and deletion cascades stay consistent", () => {
  const data = workoutFixture();
  assert.equal(getWorkoutForDate(data, "2026-08-20")?.setCount, 2);
  assert.equal(getPreviousWorkoutPerformance(data, "bench", "2026-08-20")?.sets[0].weight, 70);

  const afterSetDelete = deleteWorkoutSet(data, "today-set-1");
  const remaining = afterSetDelete.sets.find((set) => set.id === "today-set-2");
  assert.equal(remaining?.setNumber, 1);

  const afterExerciseDelete = deleteExerciseCascade(data, "bench");
  assert.equal(afterExerciseDelete.exercises.length, 0);
  assert.equal(afterExerciseDelete.workoutExercises.length, 0);
  assert.equal(afterExerciseDelete.sets.length, 0);
});

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    storage: {
      getItem(key: string) {
        return values.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        values.set(key, value);
      },
      removeItem(key: string) {
        values.delete(key);
      },
    },
    values,
  };
}

test("all new tracker namespaces survive a storage reload independently", () => {
  const { storage, values } = createMemoryStorage();
  const nutrition: NutritionData = {
    version: 1,
    entries: [
      {
        id: "dinner-1",
        date: "2026-08-20",
        mealType: "dinner",
        foodName: "三文鱼饭",
        quantity: "1 份",
        calories: 620,
        createdAt: "2026-08-20T18:30:00.000Z",
      },
    ],
  };
  const workout = workoutFixture();
  const weightRecords = [
    {
      id: "weight-1",
      date: "2026-08-20",
      weightKg: 80,
      createdAt: "2026-08-20T07:00:00.000Z",
    },
  ];

  assert.equal(saveNutritionData(nutrition, storage), true);
  assert.equal(saveWorkoutData(workout, storage), true);
  saveBodyProfile(profile, storage);
  saveWeightRecords(weightRecords, storage);

  assert.deepEqual(loadNutritionData(storage), nutrition);
  assert.deepEqual(loadWorkoutData(storage), workout);
  assert.deepEqual(loadBodyProfile(storage), profile);
  assert.deepEqual(loadWeightRecords(storage), weightRecords);
  assert.equal(values.size, 4);
});

test("workout set targets and feedback survive a storage reload", () => {
  const { storage } = createMemoryStorage();
  const workout = workoutFixture();
  workout.workoutExercises[1] = {
    ...workout.workoutExercises[1],
    targetSets: 5,
    effort: "hard",
    notes: "下次减轻一点重量",
  };

  assert.equal(saveWorkoutData(workout, storage), true);
  assert.deepEqual(loadWorkoutData(storage)?.workoutExercises[1], workout.workoutExercises[1]);
});
