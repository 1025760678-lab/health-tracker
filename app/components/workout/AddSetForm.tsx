"use client";

import { FormEvent, useState } from "react";

interface AddSetFormProps {
  defaultWeight?: number;
  onAdd: (weight: number, reps: number) => void;
}

export function AddSetForm({ defaultWeight, onAdd }: AddSetFormProps) {
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
        <label className="add-set-field">
          <span>重量</span>
          <span className="add-set-input-shell">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              placeholder="0"
              value={weight}
              onChange={(event) => {
                setWeight(event.target.value);
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

        <label className="add-set-field">
          <span>次数</span>
          <span className="add-set-input-shell">
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              placeholder="0"
              value={reps}
              onChange={(event) => {
                setReps(event.target.value);
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
