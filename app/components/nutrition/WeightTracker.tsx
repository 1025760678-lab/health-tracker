"use client";

import { useId, useState, type CSSProperties, type FormEvent } from "react";
import type { WeightRecord } from "../../types/profile";

export interface WeightTrackerProps {
  records: WeightRecord[];
  onAdd: (date: string, weightKg: number) => void;
  onDelete: (id: string) => void;
}

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWeightDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export function WeightTracker({ records, onAdd, onDelete }: WeightTrackerProps) {
  const dateId = useId();
  const weightId = useId();
  const [date, setDate] = useState(getLocalDate);
  const [weight, setWeight] = useState("");
  const orderedRecords = [...records].sort((first, second) =>
    first.date.localeCompare(second.date),
  );
  const trendRecords = orderedRecords.slice(-12);
  const weights = trendRecords.map((record) => record.weightKg);
  const minimum = weights.length ? Math.min(...weights) : 0;
  const maximum = weights.length ? Math.max(...weights) : 0;
  const range = maximum - minimum;
  const latestRecord = orderedRecords.at(-1);
  const firstTrendRecord = trendRecords[0];
  const trendDelta = latestRecord && firstTrendRecord
    ? latestRecord.weightKg - firstTrendRecord.weightKg
    : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericWeight = Number(weight);
    if (!date || numericWeight <= 0) return;
    onAdd(date, numericWeight);
    setWeight("");
  }

  return (
    <section className="weight-tracker glass-surface" aria-labelledby="weight-tracker-title">
      <div className="nutrition-section-heading weight-heading">
        <div>
          <p className="nutrition-eyebrow">可选记录</p>
          <h2 id="weight-tracker-title">体重趋势</h2>
        </div>
        {latestRecord && (
          <div className="current-weight">
            <strong>{latestRecord.weightKg}</strong>
            <span>kg</span>
          </div>
        )}
      </div>

      {trendRecords.length > 0 ? (
        <div className="weight-trend" role="img" aria-label={`最近体重趋势，从 ${firstTrendRecord.weightKg} 千克到 ${latestRecord?.weightKg ?? firstTrendRecord.weightKg} 千克`}>
          <div className="weight-trend-scale" aria-hidden="true">
            <span>{maximum.toFixed(1)}</span>
            <span>{minimum.toFixed(1)}</span>
          </div>
          <div className="weight-trend-plot" aria-hidden="true">
            <i className="weight-trend-guide" />
            {trendRecords.map((record, index) => {
              const left = trendRecords.length === 1
                ? 50
                : (index / (trendRecords.length - 1)) * 100;
              const top = range === 0
                ? 50
                : ((maximum - record.weightKg) / range) * 76 + 12;
              return (
                <span
                  className="weight-trend-point"
                  key={record.id}
                  style={{ left: `${left}%`, top: `${top}%` } as CSSProperties}
                  title={`${formatWeightDate(record.date)}：${record.weightKg} kg`}
                />
              );
            })}
          </div>
          {trendDelta !== null && (
            <p className="weight-trend-delta" data-direction={trendDelta > 0 ? "up" : trendDelta < 0 ? "down" : "steady"}>
              这段时间 {trendDelta === 0 ? "保持不变" : `${trendDelta > 0 ? "增加" : "减少"} ${Math.abs(trendDelta).toFixed(1)} kg`}
            </p>
          )}
        </div>
      ) : (
        <p className="nutrition-empty-state">添加一次体重，开始观察长期趋势。</p>
      )}

      <form className="weight-entry-form" onSubmit={handleSubmit}>
        <label className="nutrition-field" htmlFor={dateId}>
          <span>日期</span>
          <input
            id={dateId}
            className="nutrition-input nutrition-touch-target"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </label>
        <label className="nutrition-field" htmlFor={weightId}>
          <span>体重</span>
          <span className="nutrition-number-input">
            <input
              id={weightId}
              className="nutrition-input"
              type="number"
              inputMode="decimal"
              min="20"
              max="500"
              step="0.1"
              value={weight}
              placeholder="0.0"
              onChange={(event) => setWeight(event.target.value)}
              required
            />
            <small>kg</small>
          </span>
        </label>
        <button
          className="nutrition-primary-button nutrition-touch-target"
          type="submit"
          disabled={!date || Number(weight) <= 0}
        >
          添加记录
        </button>
      </form>

      {orderedRecords.length > 0 && (
        <div className="weight-record-list" aria-label="体重记录列表">
          {[...orderedRecords].reverse().map((record) => (
            <article className="weight-record" key={record.id}>
              <div>
                <time dateTime={record.date}>{formatWeightDate(record.date)}</time>
                <strong>{record.weightKg} <small>kg</small></strong>
              </div>
              <button
                type="button"
                className="nutrition-delete-button nutrition-touch-target"
                aria-label={`删除 ${formatWeightDate(record.date)} 的体重记录`}
                onClick={() => onDelete(record.id)}
              >
                删除
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
