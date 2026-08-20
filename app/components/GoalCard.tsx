"use client";

import { FormEvent, useState } from "react";

interface GoalCardProps {
  goal: number;
  onSave: (goal: number) => void;
}

export function GoalCard({ goal, onSave }: GoalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftGoal, setDraftGoal] = useState(String(goal));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextGoal = Number(draftGoal);
    if (!Number.isInteger(nextGoal) || nextGoal < 250 || nextGoal > 10000) return;
    onSave(nextGoal);
    setIsEditing(false);
  }

  return (
    <section className="settings-section goal-section" aria-labelledby="goal-heading">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="icon-tile" aria-hidden="true">◎</span>
          <div>
          <p className="eyebrow">每日目标</p>
            <h2 id="goal-heading" className="mt-1 text-2xl font-bold text-slate-900">
              {goal.toLocaleString()} <span className="text-sm font-semibold text-slate-400">ml</span>
            </h2>
          </div>
        </div>
        <button className="text-button" type="button" onClick={() => setIsEditing((value) => !value)}>
          {isEditing ? "取消" : "修改"}
        </button>
      </div>

      {isEditing && (
        <form className="mt-5 flex gap-3 border-t border-slate-100 pt-5" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="daily-goal">每日饮水目标（毫升）</label>
          <input
            id="daily-goal"
            className="input-field min-w-0 flex-1"
            type="number"
            min="250"
            max="10000"
            step="50"
            value={draftGoal}
            onChange={(event) => setDraftGoal(event.target.value)}
          />
          <button className="primary-button" type="submit">保存</button>
        </form>
      )}
    </section>
  );
}
