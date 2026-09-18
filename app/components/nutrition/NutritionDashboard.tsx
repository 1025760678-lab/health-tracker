"use client";

import { useState } from "react";
import type { NutritionData } from "../../types/nutrition";
import type { UserBodyProfile, WeightRecord } from "../../types/profile";
import type { WaterRecord } from "../../types/water";
import type { WorkoutData } from "../../types/workout";
import {
  addFoodEntry,
  deleteFoodEntry,
  getDailyNutritionSummary,
  getEntriesForDate,
  getLocalDateKey,
  getSevenDayNutritionSummary,
  updateFoodEntry,
} from "../../utils/nutritionLogic";
import {
  calculateBMR,
  calculateBaselineExpenditure,
  calculateCalorieBalance,
  calculateProfileCalorieTarget,
  calculateTotalDailyExpenditure,
} from "../../utils/energyCalculations";
import { findWorkoutSessionByDate } from "../../utils/workoutLogic";
import { BodyProfileCard } from "./BodyProfileCard";
import { FoodEntryForm } from "./FoodEntryForm";
import { MealLog } from "./MealLog";
import { NutritionHistory } from "./NutritionHistory";
import { RecipePlan } from "./RecipePlan";
import { WeeklyOverview, type WeeklyOverviewDay } from "./WeeklyOverview";
import { WeightTracker } from "./WeightTracker";

interface NutritionDashboardProps {
  data: NutritionData;
  profile: UserBodyProfile;
  weightRecords: WeightRecord[];
  waterRecords: WaterRecord[];
  workoutData: WorkoutData;
  onDataChange: (data: NutritionData) => void;
  onProfileChange: (profile: UserBodyProfile) => void;
  onWeightRecordsChange: (records: WeightRecord[]) => void;
}

type NutritionView = "today" | "recipes" | "history" | "profile";

function formatEstimate(value: number | null) {
  return value === null ? "资料不完整" : `${Math.round(value).toLocaleString()} kcal`;
}

export function NutritionDashboard({
  data,
  profile,
  weightRecords,
  waterRecords,
  workoutData,
  onDataChange,
  onProfileChange,
  onWeightRecordsChange,
}: NutritionDashboardProps) {
  const [view, setView] = useState<NutritionView>("today");
  const today = getLocalDateKey();
  const todayEntries = getEntriesForDate(data, today);
  const todaySummary = getDailyNutritionSummary(data, today);
  const bmr = calculateBMR(profile);
  const baselineBurn = calculateBaselineExpenditure(profile);
  const todayWorkoutBurn = findWorkoutSessionByDate(workoutData, today)?.estimatedCaloriesBurned ?? 0;
  const totalBurn = calculateTotalDailyExpenditure(baselineBurn, todayWorkoutBurn);
  const balance = calculateCalorieBalance(todaySummary.totalCalories, totalBurn);
  const calorieTarget = calculateProfileCalorieTarget(totalBurn, profile);

  function getBurnForDate(date: string) {
    const workoutBurn = findWorkoutSessionByDate(workoutData, date)?.estimatedCaloriesBurned ?? 0;
    return calculateTotalDailyExpenditure(baselineBurn, workoutBurn);
  }

  const weeklyDays: WeeklyOverviewDay[] = getSevenDayNutritionSummary(data).map((day) => ({
      date: day.date,
      caloriesIn: day.totalCalories,
      estimatedBurn: Math.round(getBurnForDate(day.date) ?? 0),
      waterMl: waterRecords
        .filter((record) => record.date === day.date)
        .reduce((total, record) => total + record.amount, 0),
      workout: workoutData.sessions.some((session) =>
        session.date === day.date && workoutData.workoutExercises.some((entry) =>
          entry.workoutSessionId === session.id && workoutData.sets.some((set) => set.workoutExerciseId === entry.id),
        ),
      ),
    }));

  return (
    <div className="nutrition-dashboard tracker-view">
      <header className="nutrition-dashboard-header">
        <div>
          <p className="nutrition-eyebrow">NUTRITION</p>
          <h1>饮食与能量</h1>
          <p>快速记录每一餐，清楚理解今日能量状态。</p>
        </div>
        <span className="nutrition-date-chip">今天</span>
      </header>

      <div className="nutrition-view-switcher glass-surface" role="tablist" aria-label="营养页面">
        {([
          ["today", "今日"],
          ["recipes", "食谱"],
          ["history", "历史"],
          ["profile", "身体资料"],
        ] as const).map(([value, label]) => (
          <button key={value} role="tab" type="button" data-active={view === value} aria-selected={view === value} onClick={() => setView(value)}>{label}</button>
        ))}
      </div>

      {view === "today" && (
        <div className="nutrition-today-layout" role="tabpanel" aria-label="今日营养">
          <section className="energy-overview glass-surface" aria-labelledby="energy-overview-title">
            <div className="nutrition-section-heading">
              <div>
                <p className="nutrition-eyebrow">今日估算</p>
                <h2 id="energy-overview-title">能量概览</h2>
              </div>
              <span className="energy-estimate-badge">非医疗测量</span>
            </div>
            <dl className="energy-stat-grid">
              <div className="energy-stat-primary"><dt>已摄入</dt><dd>{todaySummary.totalCalories.toLocaleString()} <small>kcal</small></dd></div>
              <div><dt>估算 BMR</dt><dd>{formatEstimate(bmr)}</dd></div>
              <div><dt>日常基线消耗</dt><dd>{formatEstimate(baselineBurn)}</dd></div>
              <div><dt>训练消耗</dt><dd>{Math.round(todayWorkoutBurn).toLocaleString()} kcal</dd></div>
              <div><dt>估算总消耗</dt><dd>{formatEstimate(totalBurn)}</dd></div>
              <div data-balance={balance?.status}><dt>{balance?.status === "surplus" ? "估算盈余" : balance?.status === "balanced" ? "估算平衡" : "估算缺口"}</dt><dd>{balance ? `${Math.round(balance.amount).toLocaleString()} kcal` : "资料不完整"}</dd></div>
            </dl>
            <div className="energy-method-note">
              <p>总消耗 = 非训练日常基线 + 已记录训练消耗，训练不会重复计算。</p>
              <strong>每日摄入目标：{calorieTarget ? `${Math.round(calorieTarget.dailyIntakeTargetCalories).toLocaleString()} kcal` : "待完善"}</strong>
            </div>
          </section>

          <FoodEntryForm onAdd={(entry) => onDataChange(addFoodEntry(data, {
            id: crypto.randomUUID(),
            date: today,
            createdAt: new Date().toISOString(),
            ...entry,
          }))} />
          <MealLog
            entries={todayEntries}
            onUpdate={(id, patch) => onDataChange(updateFoodEntry(data, id, patch))}
            onDelete={(id) => onDataChange(deleteFoodEntry(data, id))}
          />
        </div>
      )}

      {view === "recipes" && <RecipePlan profile={profile} weightRecords={weightRecords} onOpenProfile={() => setView("profile")} />}

      {view === "history" && (
        <div className="nutrition-history-layout" role="tabpanel" aria-label="营养历史">
          {baselineBurn !== null ? (
            <WeeklyOverview days={weeklyDays} />
          ) : (
            <section className="nutrition-profile-required glass-surface">
              <strong>完善身体资料后显示一周能量概览</strong>
              <p>缺少资料时不会猜测 BMR 或每日消耗。</p>
              <button className="nutrition-primary-button nutrition-touch-target" type="button" onClick={() => setView("profile")}>去完善资料</button>
            </section>
          )}
          <NutritionHistory entries={data.entries} getBurnForDate={getBurnForDate} />
        </div>
      )}

      {view === "profile" && (
        <div className="nutrition-profile-layout" role="tabpanel" aria-label="身体资料与体重">
          <BodyProfileCard profile={profile} onSave={onProfileChange} />
          <WeightTracker
            records={weightRecords}
            onAdd={(date, weightKg) => onWeightRecordsChange([...weightRecords, {
              id: crypto.randomUUID(),
              date,
              weightKg,
              createdAt: new Date().toISOString(),
            }])}
            onDelete={(id) => onWeightRecordsChange(weightRecords.filter((record) => record.id !== id))}
          />
        </div>
      )}
    </div>
  );
}
