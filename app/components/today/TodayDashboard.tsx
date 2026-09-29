import type { CSSProperties } from "react";
import type { NutritionData, MealType } from "../../types/nutrition";
import type { UserBodyProfile, WeightRecord } from "../../types/profile";
import type { WaterRecord } from "../../types/water";
import type { WorkoutData } from "../../types/workout";
import {
  calculateBaselineExpenditure,
  calculateCalorieBalance,
  calculateProfileCalorieTarget,
  calculateTotalDailyExpenditure,
  getSevenDayWeightTrend,
} from "../../utils/energyCalculations";
import {
  getDailyNutritionSummary,
  getLocalDateKey,
  getSevenDayDateRange,
} from "../../utils/nutritionLogic";
import { findWorkoutSessionByDate, getWorkoutForDate } from "../../utils/workoutLogic";
import { buildTodayInsights, calculateDailyStatusScore } from "../../utils/todayDashboard";

export type HealthSection = "today" | "water" | "workout" | "nutrition";
export type TodayNavigationTarget = "today" | "profile";

interface TodayDashboardProps {
  waterRecords: WaterRecord[];
  waterGoal: number;
  workoutData: WorkoutData;
  nutritionData: NutritionData;
  profile: UserBodyProfile;
  weightRecords: WeightRecord[];
  onNavigate: (section: Exclude<HealthSection, "today">, target?: TodayNavigationTarget) => void;
  onQuickAddWater: () => void;
}

const muscleNames = {
  chest: "胸部",
  back: "背部",
  shoulders: "肩部",
  biceps: "二头肌",
  triceps: "三头肌",
} as const;

const mainMeals: readonly MealType[] = ["breakfast", "lunch", "dinner"];
const mealNames: Record<MealType, string> = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snacks: "加餐" };

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: digits });
}

function profileIsComplete(profile: UserBodyProfile) {
  return Boolean(profile.biologicalSex && profile.age && profile.heightCm && profile.currentWeightKg && profile.baselineActivityLevel);
}

function dailyStatusLabel(score: number) {
  if (score >= 85) return "记录很完整";
  if (score >= 65) return "状态不错";
  if (score >= 40) return "继续记录";
  return "今天刚开始";
}

export function TodayDashboard({ waterRecords, waterGoal, workoutData, nutritionData, profile, weightRecords, onNavigate, onQuickAddWater }: TodayDashboardProps) {
  const today = getLocalDateKey();
  const weekDates = getSevenDayDateRange(today);
  const todayWaterRecords = waterRecords.filter((record) => record.date === today);
  const waterTotal = todayWaterRecords.reduce((total, record) => total + record.amount, 0);
  const waterPercent = waterGoal > 0 ? Math.min(Math.round(waterTotal / waterGoal * 100), 100) : 0;
  const waterRemaining = Math.max(0, waterGoal - waterTotal);
  const averageDrink = todayWaterRecords.length ? waterTotal / todayWaterRecords.length : 0;

  const nutrition = getDailyNutritionSummary(nutritionData, today);
  const todayEntries = nutritionData.entries.filter((entry) => entry.date === today);
  const hasNutritionData = todayEntries.length > 0;
  const loggedMeals = mainMeals.filter((meal) => todayEntries.some((entry) => entry.mealType === meal));
  const missingMeals = mainMeals.filter((meal) => !loggedMeals.includes(meal));

  const workout = getWorkoutForDate(workoutData, today);
  const session = findWorkoutSessionByDate(workoutData, today);
  const baselineBurn = calculateBaselineExpenditure(profile);
  const workoutBurn = session?.estimatedCaloriesBurned ?? 0;
  const hasWorkoutBurn = session?.estimatedCaloriesBurned !== undefined;
  const totalBurn = calculateTotalDailyExpenditure(baselineBurn, workoutBurn);
  const balance = hasNutritionData ? calculateCalorieBalance(nutrition.totalCalories, totalBurn) : null;
  const calorieTarget = calculateProfileCalorieTarget(totalBurn, profile);
  const targetCalories = calorieTarget?.dailyIntakeTargetCalories ?? null;
  const caloriePercent = targetCalories && hasNutritionData ? Math.min(100, Math.round(nutrition.totalCalories / targetCalories * 100)) : null;
  const remainingCalories = targetCalories === null || !hasNutritionData ? null : Math.max(0, targetCalories - nutrition.totalCalories);
  const trainedGroups = workout?.muscleGroups.map((group) => muscleNames[group.muscleGroup.id]).join(" · ") || "待记录";

  const weekly = weekDates.map((date) => {
    const dailyNutrition = getDailyNutritionSummary(nutritionData, date);
    const dailyWorkout = getWorkoutForDate(workoutData, date);
    return {
      date,
      water: waterRecords.filter((record) => record.date === date).reduce((sum, record) => sum + record.amount, 0),
      calories: dailyNutrition.totalCalories,
      hasNutrition: nutritionData.entries.some((entry) => entry.date === date),
      workout: Boolean(dailyWorkout?.setCount),
    };
  });
  const weeklyWorkouts = weekly.filter((day) => day.workout).length;
  const weeklyWaterAverage = weekly.reduce((sum, day) => sum + day.water, 0) / 7;
  const weeklyCalorieAverage = weekly.reduce((sum, day) => sum + day.calories, 0) / 7;
  const hasWeeklyWater = weekly.some((day) => day.water > 0);
  const hasWeeklyNutrition = weekly.some((day) => day.hasNutrition);
  const maxWeeklyCalories = Math.max(targetCalories ?? 0, ...weekly.map((day) => day.calories), 1);

  const completeProfile = profileIsComplete(profile);
  const recordedFactors = [todayWaterRecords.length > 0, todayEntries.length > 0, Boolean(workout?.setCount), completeProfile].filter(Boolean).length;
  const statusScore = calculateDailyStatusScore({
    waterPercent,
    loggedMeals: loggedMeals.length,
    hasWorkout: Boolean(workout?.setCount),
    profileComplete: completeProfile,
    recordedFactors,
  });
  const todayWeightRecorded = weightRecords.some((record) => record.date === today);
  const recordedToday = [todayWaterRecords.length > 0, todayEntries.length > 0, Boolean(workout?.setCount), todayWeightRecorded].filter(Boolean).length;

  const orderedWeights = [...weightRecords].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const currentWeight = orderedWeights.at(-1)?.weightKg ?? profile.currentWeightKg;
  const weightTrend = getSevenDayWeightTrend(weightRecords);

  const insights = buildTodayInsights({
    waterRemaining,
    waterTotal,
    targetCalories,
    caloriesConsumed: nutrition.totalCalories,
    firstMissingMeal: missingMeals[0] ? mealNames[missingMeals[0]] : undefined,
    workoutSets: workout?.setCount ?? 0,
    weeklyWorkouts,
  });

  return (
    <div className="today-dashboard today-dashboard-v2 tracker-view">
      <header className="today-header today-header-v2">
        <div>
          <p className="today-eyebrow">TODAY</p>
          <h1>今天</h1>
          <p>{new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date())}</p>
          <span className="today-daily-line">{recordedToday > 0 ? `今天已记录 ${recordedToday} 项健康数据` : "今天还没有健康记录"}{recordedToday < 4 ? ` · 还有 ${4 - recordedToday} 项待记录` : " · 今日记录已齐全"}</span>
        </div>
        <span className="today-status-orb" aria-hidden="true">◌</span>
      </header>

      <div className="today-primary-grid">
        <section className="today-status-card today-v2-card glass-surface" aria-labelledby="daily-status-heading">
          <div className="today-v2-heading"><div><small>DAILY STATUS</small><h2 id="daily-status-heading">今日状态</h2></div><span>仅基于记录完成度</span></div>
          <div className="today-status-main"><strong data-empty={statusScore === null}>{statusScore ?? "暂无数据"}</strong><div><b>{statusScore === null ? "完成更多记录后查看" : dailyStatusLabel(statusScore)}</b><span>{statusScore === null ? "至少完成两类记录" : "不是医疗或恢复评分"}</span></div></div>
          <div className="today-status-factors">
            <span><small>饮水</small><strong>{waterPercent}%</strong></span>
            <span><small>饮食记录</small><strong>{loggedMeals.length} / 3</strong></span>
            <span><small>训练</small><strong>{workout?.setCount ? "已完成" : "待记录"}</strong></span>
            <span><small>身体资料</small><strong>{completeProfile ? "完整" : "待完善"}</strong></span>
          </div>
        </section>

        <button className="today-energy-card today-v2-card glass-surface" type="button" onClick={() => onNavigate("nutrition")}>
          <span className="today-card-heading"><span><small>ENERGY</small><strong>今日能量</strong></span><b aria-hidden="true">›</b></span>
          <span className="today-energy-primary today-energy-primary-v2"><span><small>摄入</small><strong>{hasNutritionData ? formatNumber(nutrition.totalCalories) : "待记录"}</strong><em>{hasNutritionData ? "kcal" : "添加餐食后显示"}</em></span><i aria-hidden="true" /><span><small>估算消耗</small><strong>{totalBurn === null ? "待完善" : formatNumber(totalBurn)}</strong><em>{totalBurn === null ? "完善身体资料后计算" : "kcal"}</em></span></span>
          <span className="today-balance" data-status={balance?.status}><small>{balance?.status === "surplus" ? "估算盈余" : balance?.status === "balanced" ? "估算平衡" : balance?.status === "deficit" ? "估算缺口" : "估算能量平衡"}</small><strong>{balance ? `${formatNumber(balance.amount)} kcal` : "暂无数据"}</strong></span>
          <span className="today-intake-progress"><span><small>每日摄入目标</small><strong>{targetCalories === null ? "待完善" : hasNutritionData ? `${formatNumber(nutrition.totalCalories)} / ${formatNumber(targetCalories)} kcal` : `待记录 · 目标 ${formatNumber(targetCalories)} kcal`}</strong></span><i aria-hidden="true"><b style={{ width: `${caloriePercent ?? 0}%` }} /></i></span>
        </button>
      </div>

      <div className="today-summary-grid today-summary-grid-v2">
        <button className="today-summary-card today-water-card glass-surface" type="button" onClick={() => onNavigate("water")}>
          <span className="today-card-heading"><span><small>WATER</small><strong>饮水</strong></span><b aria-hidden="true">›</b></span>
          <span className="today-water-content"><span className="today-mini-ring" style={{ "--today-water-progress": `${waterPercent}%` } as CSSProperties}><strong>{waterPercent}%</strong></span><span><strong>{formatNumber(waterTotal)}</strong><small>/ {formatNumber(waterGoal)} ml</small></span></span>
          <span className="today-compact-metrics"><span><small>剩余</small><strong>{formatNumber(waterRemaining)} ml</strong></span><span><small>今日记录</small><strong>{todayWaterRecords.length} 次</strong></span><span><small>平均每杯</small><strong>{todayWaterRecords.length ? `${formatNumber(averageDrink)} ml` : "暂无数据"}</strong></span></span>
        </button>

        <button className="today-summary-card today-workout-card glass-surface" type="button" onClick={() => onNavigate("workout")}>
          <span className="today-card-heading"><span><small>WORKOUT</small><strong>训练</strong></span><b aria-hidden="true">›</b></span>
          <span className="today-workout-content today-workout-content-v2"><strong>{trainedGroups}</strong><span>{workout?.setCount ?? 0} 组{session?.durationMinutes ? ` · ${formatNumber(session.durationMinutes)} 分钟` : ""}</span><small>{workout ? hasWorkoutBurn ? `估算训练消耗 ${formatNumber(workoutBurn)} kcal` : "训练消耗 暂无数据" : `本周训练 ${weeklyWorkouts} 次`}</small></span>
          <span className="today-compact-metrics"><span><small>动作</small><strong>{workout?.exerciseCount ?? 0}</strong></span><span><small>总次数</small><strong>{formatNumber(workout?.totalReps ?? 0)}</strong></span><span><small>训练容量</small><strong>{formatNumber(workout?.totalVolume ?? 0, 1)} kg</strong></span></span>
        </button>
      </div>

      <button className="today-meals-card today-v2-card glass-surface" type="button" onClick={() => onNavigate("nutrition")}>
        <span className="today-card-heading"><span><small>NUTRITION</small><strong>今日餐食</strong></span><b aria-hidden="true">›</b></span>
        <span className="today-meal-list today-meal-list-v2">{(["breakfast", "lunch", "dinner", "snacks"] as const).map((meal) => { const hasMeal = todayEntries.some((entry) => entry.mealType === meal); return <span key={meal}><small>{mealNames[meal]}</small><strong>{hasMeal ? `${formatNumber(nutrition.mealCalories[meal])} kcal` : "待记录"}</strong></span>; })}</span>
        <span className="today-meal-total today-meal-total-v2"><small>{hasNutritionData ? `总计 ${formatNumber(nutrition.totalCalories)} kcal` : "总计 暂无数据"}</small><strong>已记录 {loggedMeals.length} / 3 餐</strong><em>{targetCalories === null ? "目标待完善" : !hasNutritionData ? "餐食待记录" : remainingCalories && remainingCalories > 0 ? `剩余 ${formatNumber(remainingCalories)} kcal` : "已达到摄入目标"}</em></span>
      </button>

      <section className="today-weekly-card today-v2-card glass-surface" aria-labelledby="today-weekly-heading">
        <div className="today-v2-heading"><div><small>WEEKLY OVERVIEW</small><h2 id="today-weekly-heading">本周趋势</h2></div><span>最近 7 天</span></div>
        <div className="today-weekly-chart" role="img" aria-label="最近七天的饮水、热量摄入和训练日趋势">
          {weekly.map((day) => <div className="today-week-column" key={day.date}><span className="today-week-bars" aria-hidden="true"><i data-kind="water" style={{ height: `${Math.min(100, waterGoal ? day.water / waterGoal * 100 : 0)}%` }} /><i data-kind="calories" style={{ height: `${Math.min(100, day.calories / maxWeeklyCalories * 100)}%` }} /></span><b data-workout={day.workout} aria-label={day.workout ? "训练日" : "未训练"}>{day.workout ? "●" : "○"}</b><small>{new Intl.DateTimeFormat("zh-CN", { weekday: "narrow" }).format(new Date(`${day.date}T12:00:00`))}</small></div>)}
        </div>
        <div className="today-week-legend"><span><i data-kind="water" />饮水</span><span><i data-kind="calories" />热量</span><span><i data-kind="workout" />训练日</span></div>
        <div className="today-week-totals"><span><small>本周训练</small><strong>{weeklyWorkouts} 次</strong></span><span><small>平均饮水</small><strong>{hasWeeklyWater ? `${(weeklyWaterAverage / 1000).toFixed(2)} L` : "暂无数据"}</strong></span><span><small>平均摄入</small><strong>{hasWeeklyNutrition ? `${formatNumber(weeklyCalorieAverage)} kcal` : "暂无数据"}</strong></span></div>
      </section>

      <div className="today-support-grid">
        <section className="today-insights-card today-v2-card glass-surface" aria-labelledby="today-insights-heading"><div className="today-v2-heading"><div><small>INSIGHTS</small><h2 id="today-insights-heading">今日洞察</h2></div></div><ul>{insights.slice(0, 3).map((insight, index) => <li key={insight}><span>{index + 1}</span>{insight}</li>)}</ul></section>
        <section className="today-actions-card today-v2-card glass-surface" aria-labelledby="today-actions-heading"><div className="today-v2-heading"><div><small>QUICK ACTIONS</small><h2 id="today-actions-heading">快速记录</h2></div></div><div className="today-action-grid"><button type="button" onClick={onQuickAddWater}><span>＋</span>250 ml</button><button type="button" onClick={() => onNavigate("nutrition", "today")}><span>◒</span>记录饮食</button><button type="button" onClick={() => onNavigate("workout")}><span>◆</span>开始训练</button><button type="button" onClick={() => onNavigate("nutrition", "profile")}><span>◎</span>记录体重</button></div></section>
      </div>

      <div className="today-final-grid">
        <section className="today-goals-card today-v2-card glass-surface" aria-labelledby="today-goals-heading"><div className="today-v2-heading"><div><small>GOALS</small><h2 id="today-goals-heading">今日目标</h2></div></div><div className="today-goal-list">{[["饮水", todayWaterRecords.length ? `${waterPercent}%` : "待记录", waterPercent], ["热量", targetCalories === null ? "待完善" : caloriePercent === null ? "待记录" : `${caloriePercent}%`, caloriePercent ?? 0], ["训练", workout?.setCount ? "已完成" : "待记录", workout?.setCount ? 100 : 0], ["餐食", hasNutritionData ? `${loggedMeals.length} / 3` : "待记录", loggedMeals.length / 3 * 100]].map(([label, value, percent]) => <div key={label as string}><span><small>{label}</small><strong>{value}</strong></span><i><b style={{ width: `${percent}%` }} /></i></div>)}</div></section>
        <button className="today-body-card today-v2-card glass-surface" type="button" onClick={() => onNavigate("nutrition", "profile")}><span className="today-card-heading"><span><small>BODY</small><strong>身体数据</strong></span><b aria-hidden="true">›</b></span>{currentWeight ? <span className="today-body-metric"><span><strong>{currentWeight}</strong><small>kg</small></span><em>当前体重</em>{weightTrend.changeKg !== null && <b data-direction={weightTrend.direction}>{weightTrend.changeKg > 0 ? "+" : ""}{weightTrend.changeKg.toFixed(1)} kg <small>7 日变化</small></b>}</span> : <span className="today-body-empty">暂无体重数据</span>}</button>
      </div>

      <p className="today-estimate-note">今日状态仅反映记录完成度；能量与训练消耗均为估算值，不代表医疗测量。</p>
    </div>
  );
}
