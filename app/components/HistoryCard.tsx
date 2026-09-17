import type { WaterRecord } from "../types/water";
import { COFFEE_TYPE_NAMES } from "../types/water";
import { DrinkIcon } from "./DrinkIcon";
import { useState, type FormEvent } from "react";

interface HistoryCardProps {
  records: WaterRecord[];
  onDelete: (id: string) => void;
  onUpdateCaffeine: (id: string, caffeineMg: number) => void;
}

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(timestamp));
}

function getDrinkDetails(record: WaterRecord) {
  const drinkType = record.drinkType ?? "water";
  if (drinkType === "milk") return { label: "牛奶", tone: "milk" };
  if (drinkType === "coffee") {
    return {
      label: record.coffeeType ? COFFEE_TYPE_NAMES[record.coffeeType] : "美式咖啡",
      tone: "coffee",
    };
  }
  return { label: "水", tone: "water" };
}

export function HistoryCard({ records, onDelete, onUpdateCaffeine }: HistoryCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftCaffeine, setDraftCaffeine] = useState("");
  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  function saveCaffeine(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const value = Number(draftCaffeine);
    if (draftCaffeine === "" || !Number.isInteger(value) || value < 0 || value > 2000) return;
    onUpdateCaffeine(id, value);
    setEditingId(null);
  }

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
          <span className="water-empty-icon"><DrinkIcon type="water" /></span>
          <p className="mt-3 font-semibold text-slate-600">今天还没有饮品记录</p>
          <p className="mt-1 text-sm text-slate-400">添加第一杯饮品，开始今天的记录吧。</p>
        </div>
      ) : (
        <ul className="history-list">
          {sortedRecords.map((record) => {
            const drink = getDrinkDetails(record);
            return (
              <li className="history-row group" key={record.id}>
                <span className="history-dot" data-tone={drink.tone}><DrinkIcon type={record.drinkType ?? "water"} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="water-record-name">{drink.label}</p>
                    <span className="water-record-amount">{record.amount.toLocaleString()} ml</span>
                  </div>
                  <p className="water-record-meta">
                    {formatTime(record.timestamp)}
                    {record.drinkType === "coffee" && record.calories !== undefined ? ` · ${record.calories} 千卡` : ""}
                    {record.drinkType === "coffee" ? ` · ${record.caffeineMg === undefined ? "咖啡因待补充" : `${record.caffeineMg} mg 咖啡因`}` : ""}
                  </p>
                  {editingId === record.id && (
                    <form className="water-caffeine-edit" onSubmit={(event) => saveCaffeine(event, record.id)}>
                      <label htmlFor={`caffeine-${record.id}`}>咖啡因 mg</label>
                      <input id={`caffeine-${record.id}`} type="number" inputMode="numeric" min="0" max="2000" step="1" value={draftCaffeine} onChange={(event) => setDraftCaffeine(event.target.value)} autoFocus />
                      <button type="submit">保存</button>
                      <button type="button" onClick={() => setEditingId(null)}>取消</button>
                    </form>
                  )}
                </div>
                {record.drinkType === "coffee" && editingId !== record.id && (
                  <button className="water-record-edit" type="button" onClick={() => { setEditingId(record.id); setDraftCaffeine(record.caffeineMg === undefined ? "" : String(record.caffeineMg)); }} aria-label={`填写${drink.label}的咖啡因`}>编辑</button>
                )}
                <button className="delete-button" type="button" onClick={() => onDelete(record.id)} aria-label={`删除 ${formatTime(record.timestamp)} 的 ${record.amount} ml ${drink.label}记录`}>×</button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
