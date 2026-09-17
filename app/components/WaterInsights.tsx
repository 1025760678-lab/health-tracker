"use client";

import { useState } from "react";
import type { WaterRecord } from "../types/water";
import { DrinkIcon } from "./DrinkIcon";

interface WaterInsightsProps {
  records: WaterRecord[];
  today: string;
  goal: number;
}

const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function dateAtNoon(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftDate(key: string, days: number) {
  const date = dateAtNoon(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function mondayOf(key: string) {
  const day = dateAtNoon(key).getDay();
  return shiftDate(key, -((day + 6) % 7));
}

function formatRange(start: string, end: string) {
  const first = dateAtNoon(start);
  const last = dateAtNoon(end);
  if (first.getFullYear() === last.getFullYear() && first.getMonth() === last.getMonth()) {
    return `${first.getFullYear()}年${first.getMonth() + 1}月${first.getDate()}日–${last.getDate()}日`;
  }
  return `${first.getMonth() + 1}月${first.getDate()}日–${last.getMonth() + 1}月${last.getDate()}日`;
}

function totalForDate(records: WaterRecord[], key: string) {
  return records.reduce((sum, record) => sum + (record.date === key ? record.amount : 0), 0);
}

export function TodayWaterInsights({ records, today }: Pick<WaterInsightsProps, "records" | "today">) {
  const todaysRecords = records.filter((record) => record.date === today);
  const coffeeRecords = todaysRecords.filter((record) => (record.drinkType ?? "water") === "coffee");
  const caffeineTotal = coffeeRecords.reduce((sum, record) => sum + (record.caffeineMg ?? 0), 0);
  const missingCaffeine = coffeeRecords.filter((record) => record.caffeineMg === undefined).length;
  const hourly = Array.from({ length: 24 }, (_, hour) => {
    const value = todaysRecords.reduce((sum, record) => {
      const date = new Date(record.timestamp);
      return !Number.isNaN(date.getTime()) && date.getHours() === hour ? sum + record.amount : sum;
    }, 0);
    return { hour, value };
  });
  const maxHourly = Math.max(500, ...hourly.map((item) => item.value));
  const caffeineHourly = Array.from({ length: 24 }, (_, hour) => coffeeRecords.reduce((sum, record) => {
    const date = new Date(record.timestamp);
    return !Number.isNaN(date.getTime()) && date.getHours() === hour ? sum + (record.caffeineMg ?? 0) : sum;
  }, 0));
  const maxCaffeine = Math.max(100, ...caffeineHourly);

  return (
    <div className="water-insight-stack">
      <section className="water-dark-card water-hourly-card" aria-labelledby="water-hourly-title">
        <div className="water-card-heading"><div><span className="water-kicker">TODAY / 24 HOURS</span><h2 id="water-hourly-title">饮水时间分布</h2></div><strong>{todaysRecords.length} 次</strong></div>
        <div className="water-hourly-chart" role="img" aria-label={`今日每小时饮水量：${hourly.filter((item) => item.value > 0).map((item) => `${item.hour}点 ${item.value}毫升`).join("，") || "暂无记录"}`}>
          {hourly.map((item) => <span key={item.hour} className="water-hourly-bar" data-filled={item.value > 0} style={{ height: `${Math.max(4, (item.value / maxHourly) * 100)}%` }} />)}
        </div>
        <div className="water-hourly-axis"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
      </section>

      <section className="water-dark-card water-caffeine-card" aria-labelledby="water-caffeine-title">
        <div className="water-card-heading"><div><span className="water-kicker">CAFFEINE</span><h2 id="water-caffeine-title">咖啡因追踪</h2></div><span className="water-caffeine-icon"><DrinkIcon type="coffee" /></span></div>
        <div className="water-caffeine-total"><strong>{caffeineTotal.toLocaleString()}</strong><span>mg 已记录</span></div>
        <div className="water-caffeine-chart" role="img" aria-label={`今日各小时已记录咖啡因：${caffeineHourly.map((value, hour) => value > 0 ? `${hour}点 ${value}毫克` : "").filter(Boolean).join("，") || "暂无数据"}`}>
          {caffeineHourly.map((value, hour) => <span key={hour} data-filled={value > 0} style={{ height: `${Math.max(4, (value / maxCaffeine) * 100)}%` }} />)}
        </div>
        <div className="water-hourly-axis"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
        <p className="water-caffeine-note">{missingCaffeine > 0 ? `${missingCaffeine} 条咖啡记录未填写咖啡因，当前总量不包含它们。可在下方记录中补充。` : coffeeRecords.length > 0 ? "按你填写的每杯咖啡因量累计。" : "添加咖啡时填写包装上的咖啡因含量，即可查看当天累计。"}</p>
      </section>
    </div>
  );
}

export function WaterTrend({ records, today, goal }: WaterInsightsProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const currentMonday = mondayOf(today);
  const selectedMonday = shiftDate(currentMonday, weekOffset * 7);
  const dates = Array.from({ length: 7 }, (_, index) => shiftDate(selectedMonday, index));
  const dayTotals = dates.map((key) => totalForDate(records, key));
  const comparisonDays = weekOffset === 0 ? ((dateAtNoon(today).getDay() + 6) % 7) + 1 : 7;
  const comparableTotal = dayTotals.slice(0, comparisonDays).reduce((sum, value) => sum + value, 0);
  const previousDates = Array.from({ length: comparisonDays }, (_, index) => shiftDate(selectedMonday, index - 7));
  const previousTotal = previousDates.reduce((sum, key) => sum + totalForDate(records, key), 0);
  const difference = comparableTotal - previousTotal;
  const allSelectedRecords = records.filter((record) => record.date >= dates[0] && record.date <= dates[6]);
  const cups = allSelectedRecords.length;
  const goalDays = dayTotals.filter((value) => value >= goal).length;
  const caffeineValues = allSelectedRecords.filter((record) => record.caffeineMg !== undefined);
  const caffeineTotal = caffeineValues.reduce((sum, record) => sum + (record.caffeineMg ?? 0), 0);
  const chartMax = Math.max(goal, ...dayTotals, 1);
  const average = Math.round(comparableTotal / comparisonDays);
  const previousAverage = Math.round(previousTotal / comparisonDays);

  return (
    <div className="water-trend-layout">
      <div className="water-trend-range">
        <button type="button" onClick={() => setWeekOffset((value) => value - 1)} aria-label="上一周">‹</button>
        <strong>{formatRange(dates[0], dates[6])}</strong>
        <button type="button" onClick={() => setWeekOffset((value) => Math.min(0, value + 1))} disabled={weekOffset === 0} aria-label="下一周">›</button>
      </div>

      <section className="water-dark-card water-trend-chart-card" aria-labelledby="water-trend-title">
        <div className="water-card-heading"><div><span className="water-kicker">WEEKLY HYDRATION</span><h2 id="water-trend-title">平均每天</h2></div><strong>{average.toLocaleString()} <small>ml</small></strong></div>
        <div className="water-trend-chart" role="img" aria-label={dates.map((key, index) => `${weekdays[index]} ${dayTotals[index]}毫升`).join("，")}>
          <div className="water-goal-line" style={{ bottom: `${(goal / chartMax) * 100}%` }}><span>目标 {goal.toLocaleString()} ml</span></div>
          {dayTotals.map((value, index) => <div className="water-trend-day" key={dates[index]}><div className="water-trend-bar-area"><span data-met={value >= goal} style={{ height: `${value > 0 ? Math.max(5, (value / chartMax) * 100) : 2}%` }} /></div><small>{weekdays[index].slice(1)}</small></div>)}
        </div>
      </section>

      <div className="water-trend-stats">
        <article className="water-dark-card"><span className="water-stat-symbol water-stat-blue">◉</span><strong>{comparableTotal.toLocaleString()} <small>ml</small></strong><p>{weekOffset === 0 ? "本周截至今天" : "本周总量"}</p></article>
        <article className="water-dark-card"><span className={`water-stat-symbol ${difference >= 0 ? "water-stat-blue" : "water-stat-red"}`}>{difference >= 0 ? "↗" : "↘"}</span><strong>{difference >= 0 ? "+" : "−"}{Math.abs(difference).toLocaleString()} <small>ml</small></strong><p>对比上周同期</p></article>
        <article className="water-dark-card"><span className="water-stat-symbol water-stat-blue"><DrinkIcon type="water" /></span><strong>{cups > 0 ? Math.round(allSelectedRecords.reduce((sum, record) => sum + record.amount, 0) / cups).toLocaleString() : 0} <small>ml</small></strong><p>平均每杯</p></article>
        <article className="water-dark-card"><span className="water-stat-symbol water-stat-violet">✓</span><strong>{goalDays} <small>天</small></strong><p>达到饮水目标</p></article>
        <article className="water-dark-card"><span className="water-stat-symbol water-stat-coffee"><DrinkIcon type="coffee" /></span><strong>{Math.round(caffeineTotal / comparisonDays)} <small>mg</small></strong><p>平均每日已记录咖啡因</p></article>
        <article className="water-dark-card"><span className="water-stat-symbol water-stat-blue">≈</span><strong>{previousAverage.toLocaleString()} <small>ml</small></strong><p>上周同期日均</p></article>
      </div>
      <p className="water-trend-footnote">本周仅与上周相同天数对比；未填写咖啡因的咖啡记录不计入咖啡因统计。</p>
    </div>
  );
}
