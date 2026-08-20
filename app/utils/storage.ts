import type { WaterRecord } from "../types/water";
import type { ReminderSettings } from "../types/reminder";

const RECORDS_KEY = "water-tracker-records";
const GOAL_KEY = "water-tracker-daily-goal";
const REMINDER_KEY = "water-tracker-reminder-settings";

export const DEFAULT_DAILY_GOAL = 2000;
export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  intervalMinutes: 60,
  startTime: "08:00",
  endTime: "22:00",
};

export function loadWaterRecords(): WaterRecord[] {
  try {
    const savedRecords = localStorage.getItem(RECORDS_KEY);
    return savedRecords ? (JSON.parse(savedRecords) as WaterRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveWaterRecords(records: WaterRecord[]) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function loadDailyGoal(): number {
  const savedGoal = Number(localStorage.getItem(GOAL_KEY));
  return Number.isFinite(savedGoal) && savedGoal > 0 ? savedGoal : DEFAULT_DAILY_GOAL;
}

export function saveDailyGoal(goal: number) {
  localStorage.setItem(GOAL_KEY, String(goal));
}

export function loadReminderSettings(): ReminderSettings {
  try {
    const savedSettings = localStorage.getItem(REMINDER_KEY);
    return savedSettings
      ? { ...DEFAULT_REMINDER_SETTINGS, ...(JSON.parse(savedSettings) as Partial<ReminderSettings>) }
      : DEFAULT_REMINDER_SETTINGS;
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export function saveReminderSettings(settings: ReminderSettings) {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(settings));
}
