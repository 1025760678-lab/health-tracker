import type { WaterRecord } from "../types/water";
import type { ReminderSettings } from "../types/reminder";

const RECORDS_KEY = "water-tracker-records";
const GOAL_KEY = "water-tracker-daily-goal";
const REMINDER_KEY = "water-tracker-reminder-settings";

type WaterStorage = Pick<Storage, "getItem" | "setItem">;

function resolveStorage(storage?: WaterStorage | null): WaterStorage | null {
  if (storage !== undefined) return storage;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const DEFAULT_DAILY_GOAL = 2000;
export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  intervalMinutes: 60,
  startTime: "08:00",
  endTime: "22:00",
};

export function loadWaterRecords(storage?: WaterStorage | null): WaterRecord[] {
  const target = resolveStorage(storage);
  if (!target) return [];
  try {
    const savedRecords = target.getItem(RECORDS_KEY);
    return savedRecords ? (JSON.parse(savedRecords) as WaterRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveWaterRecords(records: WaterRecord[], storage?: WaterStorage | null) {
  const target = resolveStorage(storage);
  if (!target) return false;
  try {
    target.setItem(RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

export function loadDailyGoal(storage?: WaterStorage | null): number {
  const target = resolveStorage(storage);
  if (!target) return DEFAULT_DAILY_GOAL;
  const savedGoal = Number(target.getItem(GOAL_KEY));
  return Number.isFinite(savedGoal) && savedGoal > 0 ? savedGoal : DEFAULT_DAILY_GOAL;
}

export function saveDailyGoal(goal: number, storage?: WaterStorage | null) {
  const target = resolveStorage(storage);
  if (!target) return false;
  try {
    target.setItem(GOAL_KEY, String(goal));
    return true;
  } catch {
    return false;
  }
}

export function loadReminderSettings(storage?: WaterStorage | null): ReminderSettings {
  const target = resolveStorage(storage);
  if (!target) return DEFAULT_REMINDER_SETTINGS;
  try {
    const savedSettings = target.getItem(REMINDER_KEY);
    return savedSettings
      ? { ...DEFAULT_REMINDER_SETTINGS, ...(JSON.parse(savedSettings) as Partial<ReminderSettings>) }
      : DEFAULT_REMINDER_SETTINGS;
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export function saveReminderSettings(settings: ReminderSettings, storage?: WaterStorage | null) {
  const target = resolveStorage(storage);
  if (!target) return false;
  try {
    target.setItem(REMINDER_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
