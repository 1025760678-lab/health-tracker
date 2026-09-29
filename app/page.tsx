"use client";

import { useEffect, useMemo, useState } from "react";
import { AddDrinkCard } from "./components/AddDrinkCard";
import { GoalCard } from "./components/GoalCard";
import { HistoryCard } from "./components/HistoryCard";
import { NutritionDashboard } from "./components/nutrition/NutritionDashboard";
import { ProgressCard } from "./components/ProgressCard";
import { ReminderCard } from "./components/ReminderCard";
import { TodayWaterInsights, WaterTrend } from "./components/WaterInsights";
import { TodayDashboard, type HealthSection, type TodayNavigationTarget } from "./components/today/TodayDashboard";
import { WorkoutDashboard } from "./components/workout/WorkoutDashboard";
import type { NutritionData } from "./types/nutrition";
import type { UserBodyProfile, WeightRecord } from "./types/profile";
import type { DrinkEntry, WaterRecord } from "./types/water";
import type { WorkoutData } from "./types/workout";
import {
  createInitialNutritionData,
  loadNutritionData,
  saveNutritionData,
} from "./utils/nutritionStorage";
import {
  DEFAULT_BODY_PROFILE,
  loadBodyProfile,
  loadWeightRecords,
  saveBodyProfile,
  saveWeightRecords,
} from "./utils/profileStorage";
import {
  DEFAULT_DAILY_GOAL,
  loadDailyGoal,
  loadWaterRecords,
  saveDailyGoal,
  saveWaterRecords,
} from "./utils/storage";
import {
  createInitialWorkoutData,
  loadWorkoutData,
  saveWorkoutData,
} from "./utils/workoutStorage";

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Home() {
  const [activeTracker, setActiveTracker] = useState<HealthSection>("today");
  const [nutritionInitialView, setNutritionInitialView] = useState<"today" | "profile">("today");
  const [waterView, setWaterView] = useState<"today" | "trend">("today");
  const [records, setRecords] = useState<WaterRecord[]>([]);
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_GOAL);
  const [workoutData, setWorkoutData] = useState<WorkoutData>(createInitialWorkoutData);
  const [nutritionData, setNutritionData] = useState<NutritionData>(createInitialNutritionData);
  const [bodyProfile, setBodyProfile] = useState<UserBodyProfile>({ ...DEFAULT_BODY_PROFILE });
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  const [isReady, setIsReady] = useState(false);
  const today = getLocalDate();

  useEffect(() => {
    // All persisted trackers are browser-only; hydrate them after the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecords(loadWaterRecords());
    setDailyGoal(loadDailyGoal());
    setWorkoutData(loadWorkoutData());
    setNutritionData(loadNutritionData());
    setBodyProfile(loadBodyProfile());
    setWeightRecords(loadWeightRecords());
    setIsReady(true);
  }, []);

  const todaysRecords = useMemo(
    () => records.filter((record) => record.date === today),
    [records, today],
  );
  const totalToday = useMemo(
    () => todaysRecords.reduce((total, record) => total + record.amount, 0),
    [todaysRecords],
  );
  const drinkBreakdown = useMemo(
    () => todaysRecords.reduce(
      (totals, record) => {
        const drinkType = record.drinkType ?? "water";
        totals[drinkType] += record.amount;
        return totals;
      },
      { water: 0, milk: 0, coffee: 0 },
    ),
    [todaysRecords],
  );

  function addDrink(entry: DrinkEntry) {
    const timestamp = new Date();
    const newRecord: WaterRecord = {
      id: crypto.randomUUID(),
      ...entry,
      timestamp: timestamp.toISOString(),
      date: getLocalDate(timestamp),
    };
    const updatedRecords = [...records, newRecord];
    setRecords(updatedRecords);
    saveWaterRecords(updatedRecords);
  }

  function deleteRecord(id: string) {
    const updatedRecords = records.filter((record) => record.id !== id);
    setRecords(updatedRecords);
    saveWaterRecords(updatedRecords);
  }

  function updateRecordCaffeine(id: string, caffeineMg: number) {
    const updatedRecords = records.map((record) => record.id === id ? { ...record, caffeineMg } : record);
    setRecords(updatedRecords);
    saveWaterRecords(updatedRecords);
  }

  function updateGoal(goal: number) {
    setDailyGoal(goal);
    saveDailyGoal(goal);
  }

  function updateWorkoutData(data: WorkoutData) {
    setWorkoutData(data);
    saveWorkoutData(data);
  }

  function updateNutritionData(data: NutritionData) {
    setNutritionData(data);
    saveNutritionData(data);
  }

  function updateBodyProfile(profile: UserBodyProfile) {
    const savedProfile = saveBodyProfile(profile);
    setBodyProfile(savedProfile);
  }

  function updateWeightRecords(nextRecords: WeightRecord[]) {
    const savedRecords = saveWeightRecords(nextRecords);
    setWeightRecords(savedRecords);
  }

  function navigateFromToday(section: Exclude<HealthSection, "today">, target?: TodayNavigationTarget) {
    if (section === "nutrition") setNutritionInitialView(target ?? "today");
    setActiveTracker(section);
  }

  return (
    <main className="app-canvas">
      <div className="ambient-light ambient-light-one" aria-hidden="true" />
      <div className="ambient-light ambient-light-two" aria-hidden="true" />
      <div className="app-shell">
        {activeTracker === "today" && (
          <TodayDashboard
            waterRecords={records}
            waterGoal={dailyGoal}
            workoutData={workoutData}
            nutritionData={nutritionData}
            profile={bodyProfile}
            weightRecords={weightRecords}
            onNavigate={navigateFromToday}
            onQuickAddWater={() => addDrink({ amount: 250, drinkType: "water" })}
          />
        )}

        {activeTracker === "water" && (
          <div className="water-dashboard tracker-view" role="tabpanel" aria-label="饮水记录">
            <div className="water-dashboard-header">
              <div><p className="water-kicker">HYDRATION</p><h1>{waterView === "today" ? "今天" : "饮水趋势"}</h1></div>
              <span>{new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date())}</span>
            </div>
            <div className="water-view-switcher" role="tablist" aria-label="饮水页面">
              <button type="button" role="tab" aria-selected={waterView === "today"} data-active={waterView === "today"} onClick={() => setWaterView("today")}>今天</button>
              <button type="button" role="tab" aria-selected={waterView === "trend"} data-active={waterView === "trend"} onClick={() => setWaterView("trend")}>趋势</button>
            </div>
            {waterView === "today" ? (
              <div className="dashboard-grid water-today-grid" role="tabpanel" aria-label="今日饮水">
                <div className="primary-column" id="today">
                  <ProgressCard
                    total={isReady ? totalToday : 0}
                    goal={isReady ? dailyGoal : DEFAULT_DAILY_GOAL}
                    breakdown={isReady ? drinkBreakdown : { water: 0, milk: 0, coffee: 0 }}
                  />
                  <TodayWaterInsights records={records} today={today} />
                </div>

                <div className="history-column" id="history">
                  <AddDrinkCard onAdd={addDrink} />
                  <HistoryCard records={todaysRecords} onDelete={deleteRecord} onUpdateCaffeine={updateRecordCaffeine} />
                  <aside className="settings-surface glass-surface" id="settings" aria-label="设置">
                    <GoalCard key={dailyGoal} goal={dailyGoal} onSave={updateGoal} />
                    <ReminderCard />
                  </aside>
                </div>
              </div>
            ) : <div role="tabpanel" aria-label="饮水趋势"><WaterTrend records={records} today={today} goal={dailyGoal} /></div>}
          </div>
        )}

        {activeTracker === "workout" && (
          <WorkoutDashboard data={workoutData} bodyWeightKg={bodyProfile.currentWeightKg} onChange={updateWorkoutData} />
        )}

        {activeTracker === "nutrition" && (
          <NutritionDashboard
            data={nutritionData}
            profile={bodyProfile}
            weightRecords={weightRecords}
            waterRecords={records}
            workoutData={workoutData}
            initialView={nutritionInitialView}
            onDataChange={updateNutritionData}
            onProfileChange={updateBodyProfile}
            onWeightRecordsChange={updateWeightRecords}
          />
        )}

        <p className="privacy-note">数据只属于你，并保存在当前设备中。</p>
      </div>

      <nav className="bottom-nav app-main-nav glass-surface" aria-label="主要导航">
        {([
          ["today", "◉", "今天"],
          ["water", "●", "饮水"],
          ["workout", "◆", "训练"],
          ["nutrition", "◒", "饮食"],
        ] as const).map(([section, icon, label]) => (
          <button key={section} type="button" data-active={activeTracker === section} aria-current={activeTracker === section ? "page" : undefined} onClick={() => {
            if (section === "nutrition") setNutritionInitialView("today");
            setActiveTracker(section);
          }}>
            <span aria-hidden="true">{icon}</span><small>{label}</small>
          </button>
        ))}
      </nav>
    </main>
  );
}
