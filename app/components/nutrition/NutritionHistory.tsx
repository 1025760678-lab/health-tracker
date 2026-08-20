import {
  MEAL_LABELS,
  type FoodEntry,
  type MealType,
} from "../../types/nutrition";

export interface NutritionHistoryProps {
  entries: FoodEntry[];
  getBurnForDate?: (date: string) => number | null;
}

const mealTypes = Object.keys(MEAL_LABELS) as MealType[];

function formatHistoryDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parsed);
}

export function NutritionHistory({
  entries,
  getBurnForDate,
}: NutritionHistoryProps) {
  const entriesByDate = entries.reduce<Record<string, FoodEntry[]>>(
    (grouped, entry) => {
      (grouped[entry.date] ??= []).push(entry);
      return grouped;
    },
    {},
  );
  const dates = Object.keys(entriesByDate).sort((first, second) =>
    second.localeCompare(first),
  );

  return (
    <section className="nutrition-history glass-surface" aria-labelledby="nutrition-history-title">
      <div className="nutrition-section-heading">
        <div>
          <p className="nutrition-eyebrow">往日回顾</p>
          <h2 id="nutrition-history-title">饮食历史</h2>
        </div>
        <span className="nutrition-history-count">{dates.length} 天</span>
      </div>

      {dates.length === 0 ? (
        <p className="nutrition-empty-state">完成第一条饮食记录后，历史会显示在这里。</p>
      ) : (
        <div className="nutrition-history-list">
          {dates.map((date, index) => {
            const dayEntries = entriesByDate[date];
            const total = dayEntries.reduce((sum, entry) => sum + entry.calories, 0);
            const estimatedBurn = getBurnForDate?.(date) ?? null;
            const balance = estimatedBurn === null ? null : total - estimatedBurn;

            return (
              <details className="nutrition-history-day" key={date} open={index === 0}>
                <summary className="nutrition-history-summary nutrition-touch-target">
                  <span>
                    <strong>{formatHistoryDate(date)}</strong>
                    <small>{dayEntries.length} 项食物</small>
                  </span>
                  <span className="nutrition-history-total">{total} kcal</span>
                </summary>

                <div className="nutrition-history-detail">
                  <div className="nutrition-history-meals">
                    {mealTypes.map((mealType) => {
                      const mealEntries = dayEntries.filter(
                        (entry) => entry.mealType === mealType,
                      );
                      if (mealEntries.length === 0) return null;
                      const mealTotal = mealEntries.reduce(
                        (sum, entry) => sum + entry.calories,
                        0,
                      );
                      return (
                        <div className="nutrition-history-meal" key={mealType}>
                          <div>
                            <strong>{MEAL_LABELS[mealType]}</strong>
                            <small>{mealEntries.map((entry) => entry.foodName).join("、")}</small>
                          </div>
                          <span>{mealTotal} kcal</span>
                        </div>
                      );
                    })}
                  </div>

                  <dl className="nutrition-history-energy">
                    <div>
                      <dt>总摄入</dt>
                      <dd>{total} kcal</dd>
                    </div>
                    <div>
                      <dt>估算消耗</dt>
                      <dd>{estimatedBurn === null ? "资料不足" : `${Math.round(estimatedBurn)} kcal`}</dd>
                    </div>
                    {balance !== null && (
                      <div className="nutrition-history-balance" data-balance={balance > 0 ? "surplus" : "deficit"}>
                        <dt>估算{balance > 0 ? "盈余" : "缺口"}</dt>
                        <dd>{Math.abs(Math.round(balance))} kcal</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
