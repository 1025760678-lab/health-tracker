import type { CSSProperties } from "react";

export interface WeeklyOverviewDay {
  date: string;
  caloriesIn: number;
  estimatedBurn: number;
  waterMl: number;
  workout: boolean;
}

export interface WeeklyOverviewProps {
  days: WeeklyOverviewDay[];
}

function formatWeekday(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(parsed);
}

function formatShortDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(parsed);
}

export function WeeklyOverview({ days }: WeeklyOverviewProps) {
  const visibleDays = days.slice(-7);
  const scaleMax = Math.max(
    1,
    ...visibleDays.flatMap((day) => [day.caloriesIn, day.estimatedBurn]),
  );

  return (
    <section className="weekly-overview glass-surface" aria-labelledby="weekly-overview-title">
      <div className="nutrition-section-heading">
        <div>
          <p className="nutrition-eyebrow">最近 7 天</p>
          <h2 id="weekly-overview-title">一周概览</h2>
        </div>
        <div className="weekly-legend" aria-label="图例">
          <span data-series="intake">摄入</span>
          <span data-series="burn">消耗</span>
        </div>
      </div>

      {visibleDays.length === 0 ? (
        <p className="nutrition-empty-state">开始记录后，这里会出现一周趋势。</p>
      ) : (
        <div className="weekly-day-list">
          {visibleDays.map((day) => {
            const balance = day.caloriesIn - day.estimatedBurn;
            const intakeWidth = `${Math.max(0, (day.caloriesIn / scaleMax) * 100)}%`;
            const burnWidth = `${Math.max(0, (day.estimatedBurn / scaleMax) * 100)}%`;
            const style = {
              "--intake-width": intakeWidth,
              "--burn-width": burnWidth,
            } as CSSProperties;

            return (
              <article
                className="weekly-day"
                key={day.date}
                style={style}
                aria-label={`${formatWeekday(day.date)}，摄入 ${day.caloriesIn} 千卡，估算消耗 ${day.estimatedBurn} 千卡`}
              >
                <time className="weekly-day-label" dateTime={day.date}>
                  <strong>{formatWeekday(day.date)}</strong>
                  <small>{formatShortDate(day.date)}</small>
                </time>
                <div className="weekly-bars" aria-hidden="true">
                  <span className="weekly-bar-track"><i data-series="intake" /></span>
                  <span className="weekly-bar-track"><i data-series="burn" /></span>
                </div>
                <div className="weekly-day-values">
                  <strong>{day.caloriesIn} / {day.estimatedBurn}</strong>
                  <span data-balance={balance > 0 ? "surplus" : "deficit"}>
                    {balance > 0 ? "+" : "−"}{Math.abs(Math.round(balance))}
                  </span>
                </div>
                <div className="weekly-day-meta">
                  <span aria-label={`饮水 ${day.waterMl} 毫升`}>水 {day.waterMl} ml</span>
                  <span data-workout={day.workout}>
                    {day.workout ? "● 已训练" : "○ 休息"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
