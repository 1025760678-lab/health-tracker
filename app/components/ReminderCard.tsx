"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReminderSettings } from "../types/reminder";
import {
  DEFAULT_REMINDER_SETTINGS,
  loadReminderSettings,
  saveReminderSettings,
} from "../utils/storage";

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function getNextReminderTime(settings: ReminderSettings) {
  const now = new Date();
  const candidate = new Date(
    settings.nextReminderAt && settings.nextReminderAt > now.getTime()
      ? settings.nextReminderAt
      : now.getTime() + settings.intervalMinutes * 60_000,
  );
  const startMinutes = timeToMinutes(settings.startTime);
  const endMinutes = timeToMinutes(settings.endTime);
  const candidateMinutes = candidate.getHours() * 60 + candidate.getMinutes();

  if (candidateMinutes < startMinutes) {
    candidate.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  } else if (candidateMinutes >= endMinutes) {
    candidate.setDate(candidate.getDate() + 1);
    candidate.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  }

  return candidate.getTime();
}

function showReminder() {
  new Notification("该补充水分啦", {
    body: "喝一杯喜欢的饮品，保持今天的好状态。",
    icon: "/favicon.svg",
    tag: "hydration-reminder",
  });
}

export function ReminderCard() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [draftInterval, setDraftInterval] = useState("60");
  const [draftStart, setDraftStart] = useState("08:00");
  const [draftEnd, setDraftEnd] = useState("22:00");
  const [message, setMessage] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const savedSettings = loadReminderSettings();
    // Hydrate browser-only settings after the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(savedSettings);
    setDraftInterval(String(savedSettings.intervalMinutes));
    setDraftStart(savedSettings.startTime);
    setDraftEnd(savedSettings.endTime);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || !settings.enabled || !("Notification" in window) || Notification.permission !== "granted") return;

    const reminderTime = getNextReminderTime(settings);
    const timer = window.setTimeout(() => {
      showReminder();
      const updatedSettings = {
        ...settings,
        nextReminderAt: Date.now() + settings.intervalMinutes * 60_000,
      };
      setSettings(updatedSettings);
      saveReminderSettings(updatedSettings);
    }, Math.max(reminderTime - Date.now(), 1_000));

    return () => window.clearTimeout(timer);
  }, [isReady, settings]);

  const nextReminder = useMemo(() => {
    if (!settings.enabled) return "";
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(getNextReminderTime(settings)));
  }, [settings]);

  async function toggleReminder() {
    if (settings.enabled) {
      const updatedSettings = { ...settings, enabled: false, nextReminderAt: undefined };
      setSettings(updatedSettings);
      saveReminderSettings(updatedSettings);
      setMessage("提醒已关闭");
      return;
    }

    if (!("Notification" in window)) {
      setMessage("当前浏览器不支持通知提醒");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setMessage("需要允许浏览器通知才能开启提醒");
      return;
    }

    const updatedSettings = {
      ...settings,
      enabled: true,
      nextReminderAt: Date.now() + settings.intervalMinutes * 60_000,
    };
    setSettings(updatedSettings);
    saveReminderSettings(updatedSettings);
    setMessage("提醒已开启");
  }

  function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const intervalMinutes = Number(draftInterval);
    if (timeToMinutes(draftStart) >= timeToMinutes(draftEnd)) {
      setMessage("结束时间需要晚于开始时间");
      return;
    }

    const updatedSettings = {
      ...settings,
      intervalMinutes,
      startTime: draftStart,
      endTime: draftEnd,
      nextReminderAt: settings.enabled ? Date.now() + intervalMinutes * 60_000 : undefined,
    };
    setSettings(updatedSettings);
    saveReminderSettings(updatedSettings);
    setMessage("提醒设置已保存");
  }

  function testReminder() {
    if ("Notification" in window && Notification.permission === "granted") {
      showReminder();
      setMessage("测试通知已发送");
    }
  }

  return (
    <section className="settings-section reminder-section" aria-labelledby="reminder-heading">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="icon-tile reminder-icon" aria-hidden="true">◔</span>
          <div>
            <p className="eyebrow">饮水提醒</p>
            <h2 id="reminder-heading" className="mt-1 text-lg font-bold text-slate-900">
              {settings.enabled ? `下次 ${nextReminder}` : "定时提醒补水"}
            </h2>
          </div>
        </div>
        <button
          className="toggle-button"
          data-active={settings.enabled}
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label={settings.enabled ? "关闭饮水提醒" : "开启饮水提醒"}
          onClick={toggleReminder}
        >
          <span />
        </button>
      </div>

      <form className="mt-5 border-t border-slate-100 pt-5" onSubmit={saveSchedule}>
        <label className="text-xs font-bold text-slate-500" htmlFor="reminder-interval">提醒间隔</label>
        <select
          id="reminder-interval"
          className="input-field mt-2"
          value={draftInterval}
          onChange={(event) => setDraftInterval(event.target.value)}
        >
          <option value="30">每 30 分钟</option>
          <option value="60">每 1 小时</option>
          <option value="90">每 1.5 小时</option>
          <option value="120">每 2 小时</option>
        </select>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-500">
            开始时间
            <input className="input-field mt-2" type="time" value={draftStart} onChange={(event) => setDraftStart(event.target.value)} />
          </label>
          <label className="text-xs font-bold text-slate-500">
            结束时间
            <input className="input-field mt-2" type="time" value={draftEnd} onChange={(event) => setDraftEnd(event.target.value)} />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="primary-button flex-1" type="submit">保存设置</button>
          {settings.enabled && (
            <button className="secondary-button" type="button" onClick={testReminder}>测试提醒</button>
          )}
        </div>
      </form>

      <p className="mt-3 min-h-5 text-sm font-medium text-sky-600" role="status">{message}</p>
      <p className="text-xs leading-5 text-slate-400">提醒依赖浏览器通知，请保持此页面或浏览器处于打开状态。</p>
    </section>
  );
}
