import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TodayDashboard } from "../app/components/today/TodayDashboard";
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
  getLocalDateKey,
  getSevenDayDateRange,
  moveFoodEntry,
  updateFoodEntry,
} from "../app/utils/nutritionLogic";
import {
  loadNutritionData,
  saveNutritionData,
} from "../app/utils/nutritionStorage";
import {
  DEFAULT_BODY_PROFILE,
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
import { buildTodayInsights, calculateDailyStatusScore } from "../app/utils/todayDashboard";
import { loadDailyGoal, loadWaterRecords, saveDailyGoal, saveWaterRecords } from "../app/utils/storage";

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
  const waterRecords = [
    {
      id: "water-1",
      amount: 350,
      drinkType: "water" as const,
      date: "2026-08-20",
      timestamp: "2026-08-20T07:30:00.000Z",
    },
  ];

  assert.equal(saveWaterRecords(waterRecords, storage), true);
  assert.equal(saveDailyGoal(2400, storage), true);
  assert.equal(saveNutritionData(nutrition, storage), true);
  assert.equal(saveWorkoutData(workout, storage), true);
  saveBodyProfile(profile, storage);
  saveWeightRecords(weightRecords, storage);

  assert.deepEqual(loadWaterRecords(storage), waterRecords);
  assert.equal(loadDailyGoal(storage), 2400);
  assert.deepEqual(loadNutritionData(storage), nutrition);
  assert.deepEqual(loadWorkoutData(storage), workout);
  assert.deepEqual(loadBodyProfile(storage), profile);
  assert.deepEqual(loadWeightRecords(storage), weightRecords);
  assert.equal(values.size, 6);
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

test("today completion score remains hidden for sparse data and deterministic when recorded", () => {
  assert.equal(calculateDailyStatusScore({ waterPercent: 0, loggedMeals: 0, hasWorkout: false, profileComplete: false, recordedFactors: 0 }), null);
  assert.equal(calculateDailyStatusScore({ waterPercent: 40, loggedMeals: 0, hasWorkout: false, profileComplete: false, recordedFactors: 1 }), null);
  assert.equal(calculateDailyStatusScore({ waterPercent: 0, loggedMeals: 1, hasWorkout: false, profileComplete: false, recordedFactors: 1 }), null);
  assert.equal(calculateDailyStatusScore({ waterPercent: 0, loggedMeals: 0, hasWorkout: true, profileComplete: false, recordedFactors: 1 }), null);
  assert.equal(calculateDailyStatusScore({ waterPercent: 50, loggedMeals: 2, hasWorkout: true, profileComplete: true, recordedFactors: 4 }), 79);
  assert.equal(calculateDailyStatusScore({ waterPercent: 180, loggedMeals: 5, hasWorkout: true, profileComplete: true, recordedFactors: 4 }), 100);
});

test("today insights use only recorded values and stay concise", () => {
  assert.deepEqual(buildTodayInsights({
    waterRemaining: 750,
    waterTotal: 1250,
    targetCalories: 2000,
    caloriesConsumed: 1850,
    firstMissingMeal: "晚餐",
    workoutSets: 8,
    weeklyWorkouts: 2,
  }), ["今天还差 750 ml 达到饮水目标", "今日热量摄入接近目标", "今天已完成 8 组训练"]);

  assert.deepEqual(buildTodayInsights({
    waterRemaining: 2000,
    waterTotal: 0,
    targetCalories: null,
    caloriesConsumed: 0,
    firstMissingMeal: "早餐",
    workoutSets: 0,
    weeklyWorkouts: 0,
  }), ["今天还差 2,000 ml 达到饮水目标", "今天还没有记录早餐"]);
});

function renderTodayState({
  water = false,
  workout = false,
  nutrition = false,
  complete = false,
}: {
  water?: boolean;
  workout?: boolean;
  nutrition?: boolean;
  complete?: boolean;
}) {
  const today = getLocalDateKey();
  const fixture = workoutFixture();
  const workoutData = workout || complete
    ? {
        ...fixture,
        sessions: fixture.sessions.map((session) => session.id === "today" ? { ...session, date: today } : session),
      }
    : { version: 1 as const, exercises: fixture.exercises, sessions: [], workoutExercises: [], sets: [] };
  const mealTypes = complete ? (["breakfast", "lunch", "dinner"] as const) : (["breakfast"] as const);
  const nutritionData: NutritionData = {
    version: 1,
    entries: nutrition || complete ? mealTypes.map((mealType, index) => ({
      id: `meal-${index}`,
      date: today,
      mealType,
      foodName: `餐食 ${index + 1}`,
      calories: 500,
      createdAt: `${today}T0${8 + index}:00:00.000Z`,
    })) : [],
  };

  return renderToStaticMarkup(TodayDashboard({
    waterRecords: water || complete ? [{ id: "water-today", amount: complete ? 2000 : 350, drinkType: "water", date: today, timestamp: `${today}T08:00:00.000Z` }] : [],
    waterGoal: 2000,
    workoutData,
    nutritionData,
    profile: complete ? profile : { ...DEFAULT_BODY_PROFILE },
    weightRecords: complete ? [{ id: "weight-today", date: today, weightKg: 80, createdAt: `${today}T07:00:00.000Z` }] : [],
    onNavigate() {},
    onQuickAddWater() {},
  }));
}

test("today dashboard renders safe empty, water-only, workout-only, nutrition-only and complete states", () => {
  const empty = renderTodayState({});
  assert.match(empty, /暂无数据/);
  assert.match(empty, /待记录/);
  assert.match(empty, /待完善/);
  assert.doesNotMatch(empty, /估算缺口/);

  const waterOnly = renderTodayState({ water: true });
  assert.match(waterOnly, /350/);
  assert.match(waterOnly, /1 次/);

  const workoutOnly = renderTodayState({ workout: true });
  assert.match(workoutOnly, /胸部/);
  assert.match(workoutOnly, /2 组/);

  const nutritionOnly = renderTodayState({ nutrition: true });
  assert.match(nutritionOnly, /早餐/);
  assert.match(nutritionOnly, /500 kcal/);

  const complete = renderTodayState({ complete: true });
  assert.match(complete, />100%</);
  assert.match(complete, />3 \/ 3</);
  assert.match(complete, />100</);
  assert.match(complete, /今日记录已齐全/);
});
