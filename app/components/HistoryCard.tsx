import type { WaterRecord } from "../types/water";
import { COFFEE_TYPE_NAMES } from "../types/water";

interface HistoryCardProps {
  records: WaterRecord[];
  onDelete: (id: string) => void;
}

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(timestamp));
}

function getDrinkDetails(record: WaterRecord) {
  const drinkType = record.drinkType ?? "water";
  if (drinkType === "milk") return { label: "牛奶", icon: "◒", tone: "milk" };
  if (drinkType === "coffee") {
    return {
      label: record.coffeeType ? COFFEE_TYPE_NAMES[record.coffeeType] : "美式咖啡",
      icon: "◉",
      tone: "coffee",
    };
  }
  return { label: "水", icon: "●", tone: "water" };
}

export function HistoryCard({ records, onDelete }: HistoryCardProps) {
  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <section className="history-surface glass-surface" aria-labelledby="history-heading">
      <div className="section-heading items-end">
        <div>
          <p className="eyebrow">今天</p>
          <h2 id="history-heading" className="mt-1 text-xl font-bold text-slate-900">饮品记录</h2>
        </div>
        <span className="text-xs font-semibold text-slate-400">共 {records.length} 条</span>
      </div>

      {sortedRecords.length === 0 ? (
        <div className="empty-state">
          <span className="text-3xl text-sky-300" aria-hidden="true">◉</span>
          <p className="mt-3 font-semibold text-slate-600">今天还没有饮品记录</p>
          <p className="mt-1 text-sm text-slate-400">添加第一杯饮品，开始今天的记录吧。</p>
        </div>
      ) : (
        <ul className="history-list">
          {sortedRecords.map((record) => {
            const drink = getDrinkDetails(record);
            return (
              <li className="history-row group" key={record.id}>
                <span className="history-dot" data-tone={drink.tone} aria-hidden="true">{drink.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="font-bold text-slate-800">{record.amount.toLocaleString()} ml</p>
                    <span className="text-xs font-bold text-slate-500">{drink.label}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-400">
                    {formatTime(record.timestamp)}
                    {record.drinkType === "coffee" && record.calories !== undefined ? ` · ${record.calories} 千卡` : ""}
                  </p>
                </div>
                <button className="delete-button" type="button" onClick={() => onDelete(record.id)} aria-label={`删除 ${formatTime(record.timestamp)} 的 ${record.amount} ml ${drink.label}记录`}>×</button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
