export interface ReminderSettings {
  enabled: boolean;
  intervalMinutes: number;
  startTime: string;
  endTime: string;
  nextReminderAt?: number;
}
