"use client";

import { useState } from "react";
import type { WorkoutSet } from "../../types/workout";

interface SetRowProps {
  set: WorkoutSet;
  onChange: (weight: number, reps: number) => void;
  onDelete: () => void;
}

export function SetRow({ set, onChange, onDelete }: SetRowProps) {
  const [weightDraft, setWeightDraft] = useState(String(set.weight));
  const [repsDraft, setRepsDraft] = useState(String(set.reps));

  function updateWeight(value: string) {
    setWeightDraft(value);
    const weight = Number(value);
    if (value !== "" && Number.isFinite(weight) && weight >= 0) {
      onChange(weight, set.reps);
    }
  }

  function updateReps(value: string) {
    setRepsDraft(value);
    const reps = Number(value);
    if (value !== "" && Number.isInteger(reps) && reps > 0) {
      onChange(set.weight, reps);
    }
  }

  return (
    <div className="workout-set-row">
      <div className="set-number" aria-label={`第 ${set.setNumber} 组`}>
        <small>SET</small>
        <strong>{set.setNumber}</strong>
      </div>

      <label className="set-input-group">
        <span>重量</span>
        <span className="set-input-shell">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={weightDraft}
            onChange={(event) => updateWeight(event.target.value)}
            onBlur={() => setWeightDraft(String(set.weight))}
            aria-label={`第 ${set.setNumber} 组重量，千克`}
          />
          <small>kg</small>
        </span>
      </label>

      <label className="set-input-group">
        <span>次数</span>
        <span className="set-input-shell">
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={repsDraft}
            onChange={(event) => updateReps(event.target.value)}
            onBlur={() => setRepsDraft(String(set.reps))}
            aria-label={`第 ${set.setNumber} 组重复次数`}
          />
          <small>次</small>
        </span>
      </label>

      <button
        className="set-delete-button"
        type="button"
        onClick={onDelete}
        aria-label={`删除第 ${set.setNumber} 组`}
      >
        ×
      </button>
    </div>
  );
}
