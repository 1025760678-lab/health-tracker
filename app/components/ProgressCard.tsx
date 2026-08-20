import type { CSSProperties } from "react";

interface ProgressCardProps {
  total: number;
  goal: number;
  breakdown: {
    water: number;
    milk: number;
    coffee: number;
  };
}

const drinkLegend = [
  { key: "water", label: "水", className: "water" },
  { key: "milk", label: "牛奶", className: "milk" },
  { key: "coffee", label: "咖啡", className: "coffee" },
] as const;

export function ProgressCard({ total, goal, breakdown }: ProgressCardProps) {
  const percent = Math.min(Math.round((total / goal) * 100), 100);
  const remaining = Math.max(goal - total, 0);
  const filledPercent = Math.min(total / goal, 1) * 100;

  function getSegmentWidth(amount: number) {
    return total > 0 ? (amount / total) * filledPercent : 0;
  }

  return (
    <section className="hero-surface glass-surface" aria-labelledby="today-heading">
      <div className="hero-heading">
        <div>
          <p className="eyebrow">今日饮品摄入</p>
          <h2 id="today-heading">今日进度</h2>
        </div>
        <span className="goal-caption">目标 {goal.toLocaleString()} ml</span>
      </div>

      <div className="progress-stage">
        <div
          className="liquid-progress-ring"
          style={{ "--progress": `${percent}%` } as CSSProperties}
          role="progressbar"
          aria-label={`已完成每日目标的 ${percent}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="progress-ring-inner">
            <strong>{total.toLocaleString()}</strong>
            <span>ml</span>
            <small>of {goal.toLocaleString()} ml</small>
          </div>
        </div>
        <div className="progress-copy">
          <strong>{percent}%</strong>
          <span>今日目标</span>
          <p>{remaining > 0 ? `再喝 ${remaining.toLocaleString()} ml 就完成了` : "太棒了，今天的目标已完成"}</p>
        </div>
      </div>

      <div className="breakdown-area">
        <div
          className="drink-progress"
          role="progressbar"
          aria-label={`今日总进度：水 ${breakdown.water} ml，牛奶 ${breakdown.milk} ml，咖啡 ${breakdown.coffee} ml`}
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuenow={Math.min(total, goal)}
        >
          {drinkLegend.map((drink) => (
            <div
              className="drink-progress-segment"
              data-drink={drink.className}
              key={drink.key}
              style={{ width: `${getSegmentWidth(breakdown[drink.key])}%` }}
            />
          ))}
        </div>

        <div className="drink-total-grid">
          {drinkLegend.map((drink) => (
            <div className="drink-total" data-drink={drink.className} key={drink.key}>
              <span className="drink-color-dot" aria-hidden="true" />
              <div>
                <p>{drink.label}</p>
                <strong>{breakdown[drink.key].toLocaleString()} <small>ml</small></strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
