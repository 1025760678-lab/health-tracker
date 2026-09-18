"use client";

import { FormEvent, useId, useState } from "react";
import { WheelNumberInput } from "../WheelNumberInput";

interface AddSetFormProps {
  defaultWeight?: number;
  onAdd: (weight: number, reps: number) => void;
}

export function AddSetForm({ defaultWeight, onAdd }: AddSetFormProps) {
  const weightId = useId();
  const repsId = useId();
  const [weight, setWeight] = useState(
    defaultWeight === undefined ? "" : String(defaultWeight),
  );
  const [reps, setReps] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const weightValue = Number(weight);
    const repsValue = Number(reps);
    if (
      weight === "" ||
      !Number.isFinite(weightValue) ||
      weightValue < 0 ||
      reps === "" ||
      !Number.isInteger(repsValue) ||
      repsValue <= 0
    ) {
      setMessage("请输入有效的重量和次数");
      return;
    }

    onAdd(weightValue, repsValue);
    setWeight(String(weightValue));
    setReps("");
    setMessage("");
  }

  return (
    <form className="add-set-form" onSubmit={handleSubmit}>
      <div className="add-set-fields">
        <label className="add-set-field" htmlFor={weightId}>
          <span>重量</span>
          <span className="add-set-input-shell">
            <WheelNumberInput
              id={weightId}
              inputMode="decimal"
              min={0}
              max={1000}
              step={0.5}
              wheelLabel="新一组重量"
              unit="kg"
              placeholder="0"
              value={weight}
              onValueChange={(value) => {
                setWeight(value);
                setMessage("");
              }}
              aria-label="新一组重量，千克"
            />
            <small>kg</small>
          </span>
        </label>

        <span className="add-set-multiply" aria-hidden="true">
          ×
        </span>

        <label className="add-set-field" htmlFor={repsId}>
          <span>次数</span>
          <span className="add-set-input-shell">
            <WheelNumberInput
              id={repsId}
              inputMode="numeric"
              min={1}
              max={1000}
              wheelLabel="新一组次数"
              unit="次"
              placeholder="0"
              value={reps}
              onValueChange={(value) => {
                setReps(value);
                setMessage("");
              }}
              aria-label="新一组重复次数"
            />
            <small>次</small>
          </span>
        </label>
      </div>

      <p className="add-set-message" role="status">
        {message}
      </p>

      <button className="add-set-button" type="submit">
        <span aria-hidden="true">＋</span>
        添加一组
      </button>
    </form>
  );
}
