export interface DailyStatusInput {
  waterPercent: number;
  loggedMeals: number;
  hasWorkout: boolean;
  profileComplete: boolean;
  recordedFactors: number;
}

export function calculateDailyStatusScore(input: DailyStatusInput) {
  if (input.recordedFactors < 2) return null;
  return Math.round(
    Math.min(100, Math.max(0, input.waterPercent)) * 0.25
    + Math.min(3, Math.max(0, input.loggedMeals)) / 3 * 25
    + (input.hasWorkout ? 25 : 0)
    + (input.profileComplete ? 25 : 0),
  );
}

export interface TodayInsightInput {
  waterRemaining: number;
  waterTotal: number;
  targetCalories: number | null;
  caloriesConsumed: number;
  firstMissingMeal?: string;
  workoutSets: number;
  weeklyWorkouts: number;
}

export function buildTodayInsights(input: TodayInsightInput) {
  const insights: string[] = [];
  if (input.waterRemaining > 0) insights.push(`今天还差 ${Math.round(input.waterRemaining).toLocaleString("zh-CN")} ml 达到饮水目标`);
  else if (input.waterTotal > 0) insights.push("今天已达到饮水目标");

  const calorieRatio = input.targetCalories ? input.caloriesConsumed / input.targetCalories : null;
  if (calorieRatio !== null && input.caloriesConsumed > 0 && calorieRatio >= 0.85 && calorieRatio <= 1.1) {
    insights.push("今日热量摄入接近目标");
  } else if (input.firstMissingMeal) {
    insights.push(`今天还没有记录${input.firstMissingMeal}`);
  }

  if (input.workoutSets > 0) insights.push(`今天已完成 ${input.workoutSets} 组训练`);
  else if (input.weeklyWorkouts > 0) insights.push(`本周已训练 ${input.weeklyWorkouts} 次`);
  if (insights.length < 2) insights.push("从饮水、餐食或训练开始记录今天");
  return insights.slice(0, 3);
}
