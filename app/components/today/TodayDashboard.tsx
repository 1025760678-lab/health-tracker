import type { CSSProperties } from "react";
import type { NutritionData } from "../../types/nutrition";
import type { UserBodyProfile } from "../../types/profile";
import type { WaterRecord } from "../../types/water";
import type { WorkoutData } from "../../types/workout";
import {
  calculateBaselineExpenditure,
  calculateCalorieBalance,
  calculateTotalDailyExpenditure,
} from "../../utils/energyCalculations";
import { getDailyNutritionSummary, getLocalDateKey } from "../../utils/nutritionLogic";
import { findWorkoutSessionByDate, getWorkoutForDate } from "../../utils/workoutLogic";

export type HealthSection = "today" | "water" | "workout" | "nutrition";

interface TodayDashboardProps {
  waterRecords: WaterRecord[];
  waterGoal: number;
  workoutData: WorkoutData;
  nutritionData: NutritionData;
  profile: UserBodyProfile;
  onNavigate: (section: Exclude<HealthSection, "today">) => void;
}

const muscleNames = {
  chest: "胸",
  back: "背",
  shoulders: "肩",
  biceps: "二头肌",
  triceps: "三头肌",
} as const;

function formatCalories(value: number | null) {
  return value === null ? "待完善" : Math.round(value).toLocaleString();
}

export function TodayDashboard({
  waterRecords,
  waterGoal,
  workoutData,
  nutritionData,
  profile,
  onNavigate,
}: TodayDashboardProps) {
  const today = getLocalDateKey();
  const waterTotal = waterRecords
    .filter((record) => record.date === today)
    .reduce((total, record) => total + record.amount, 0);
  const waterPercent = Math.min(Math.round((waterTotal / waterGoal) * 100), 100);
  const nutrition = getDailyNutritionSummary(nutritionData, today);
  const workout = getWorkoutForDate(workoutData, today);
  const session = findWorkoutSessionByDate(workoutData, today);
  const baselineBurn = calculateBaselineExpenditure(profile);
  const workoutBurn = session?.estimatedCaloriesBurned ?? 0;
  const totalBurn = calculateTotalDailyExpenditure(baselineBurn, workoutBurn);
  const balance = calculateCalorieBalance(nutrition.totalCalories, totalBurn);
  const trainedGroups = workout?.muscleGroups.map((group) => muscleNames[group.muscleGroup.id]).join(" · ") || "还没有训练";

  return (
    <div className="today-dashboard tracker-view">
      <header className="today-header">
        <div>
          <p className="today-eyebrow">TODAY</p>
          <h1>今天</h1>
          <p>{new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date())}</p>
        </div>
        <span className="today-status-orb" aria-hidden="true">◌</span>
      </header>

      <button className="today-energy-card glass-surface" type="button" onClick={() => onNavigate("nutrition")}>
        <span className="today-card-heading"><span><small>ENERGY</small><strong>今日能量</strong></span><b aria-hidden="true">›</b></span>
        <span className="today-energy-primary">
          <span><small>已摄入</small><strong>{nutrition.totalCalories.toLocaleString()}</strong><em>kcal</em></span>
          <i aria-hidden="true" />
          <span><small>估算消耗</small><strong>{formatCalories(totalBurn)}</strong><em>{totalBurn === null ? "" : "kcal"}</em></span>
        </span>
        <span className="today-balance" data-status={balance?.status}>
          <small>{balance?.status === "surplus" ? "估算盈余" : balance?.status === "balanced" ? "估算平衡" : "估算缺口"}</small>
          <strong>{balance ? `${Math.round(balance.amount).toLocaleString()} kcal` : "完善身体资料后计算"}</strong>
        </span>
      </button>

      <div className="today-summary-grid">
        <button className="today-summary-card today-water-card glass-surface" type="button" onClick={() => onNavigate("water")}>
          <span className="today-card-heading"><span><small>WATER</small><strong>饮水</strong></span><b aria-hidden="true">›</b></span>
          <span className="today-water-content">
            <span className="today-mini-ring" style={{ "--today-water-progress": `${waterPercent}%` } as CSSProperties}><strong>{waterPercent}%</strong></span>
            <span><strong>{waterTotal.toLocaleString()}</strong><small>/ {waterGoal.toLocaleString()} ml</small></span>
          </span>
        </button>

        <button className="today-summary-card today-workout-card glass-surface" type="button" onClick={() => onNavigate("workout")}>
          <span className="today-card-heading"><span><small>WORKOUT</small><strong>训练</strong></span><b aria-hidden="true">›</b></span>
          <span className="today-workout-content">
            <strong>{trainedGroups}</strong>
            <span>{workout?.setCount ?? 0} 组{session?.durationMinutes ? ` · ${session.durationMinutes} 分钟` : ""}</span>
            <small>估算训练消耗 {Math.round(workoutBurn).toLocaleString()} kcal</small>
          </span>
        </button>
      </div>

      <button className="today-meals-card glass-surface" type="button" onClick={() => onNavigate("nutrition")}>
        <span className="today-card-heading"><span><small>NUTRITION</small><strong>今日餐食</strong></span><b aria-hidden="true">›</b></span>
        <span className="today-meal-list">
          <span><small>早餐</small><strong>{nutrition.mealCalories.breakfast.toLocaleString()} kcal</strong></span>
          <span><small>午餐</small><strong>{nutrition.mealCalories.lunch.toLocaleString()} kcal</strong></span>
          <span><small>晚餐</small><strong>{nutrition.mealCalories.dinner.toLocaleString()} kcal</strong></span>
          <span><small>加餐</small><strong>{nutrition.mealCalories.snacks.toLocaleString()} kcal</strong></span>
        </span>
        <span className="today-meal-total"><small>总计</small><strong>{nutrition.totalCalories.toLocaleString()} kcal</strong></span>
      </button>

      <p className="today-estimate-note">能量、BMR 与训练消耗均为估算值，不代表医疗测量。</p>
    </div>
  );
}
