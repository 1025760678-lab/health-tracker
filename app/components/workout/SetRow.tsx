"use client";

import { useId, useState } from "react";
import { WheelNumberInput } from "../WheelNumberInput";
import type { WorkoutSet } from "../../types/workout";

interface SetRowProps {
  set: WorkoutSet;
  onChange: (weight: number, reps: number) => void;
  onDelete: () => void;
}

export function SetRow({ set, onChange, onDelete }: SetRowProps) {
  const weightId = useId();
  const repsId = useId();
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

      <label className="set-input-group" htmlFor={weightId}>
        <span>重量</span>
        <span className="set-input-shell">
          <WheelNumberInput
            id={weightId}
            inputMode="decimal"
            min={0}
            max={1000}
            step={0.5}
            wheelLabel={`第 ${set.setNumber} 组重量`}
            unit="kg"
            value={weightDraft}
            onValueChange={updateWeight}
            onBlur={() => setWeightDraft(String(set.weight))}
            aria-label={`第 ${set.setNumber} 组重量，千克`}
          />
          <small>kg</small>
        </span>
      </label>

      <label className="set-input-group" htmlFor={repsId}>
        <span>次数</span>
        <span className="set-input-shell">
          <WheelNumberInput
            id={repsId}
            inputMode="numeric"
            min={1}
            max={1000}
            wheelLabel={`第 ${set.setNumber} 组次数`}
            unit="次"
            value={repsDraft}
            onValueChange={updateReps}
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
