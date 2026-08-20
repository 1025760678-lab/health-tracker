"use client";

import { useId, useState, type FormEvent } from "react";
import {
  MEAL_LABELS,
  type FoodEntry,
  type MealType,
} from "../../types/nutrition";

export interface FoodEntryFormProps {
  onAdd: (
    entry: Pick<FoodEntry, "mealType" | "foodName" | "quantity" | "calories">,
  ) => void;
}

const mealTypes = Object.keys(MEAL_LABELS) as MealType[];
const caloriePresets = [100, 300, 500] as const;

export function FoodEntryForm({ onAdd }: FoodEntryFormProps) {
  const foodNameId = useId();
  const quantityId = useId();
  const caloriesId = useId();
  const suggestionsId = useId();
  const [mealType, setMealType] = useState<MealType>(mealTypes[0]);
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [calories, setCalories] = useState("");

  const numericCalories = Number(calories);
  const canAdd = foodName.trim().length > 0 && numericCalories > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAdd) return;

    const normalizedQuantity = quantity.trim();
    onAdd({
      mealType,
      foodName: foodName.trim(),
      ...(normalizedQuantity ? { quantity: normalizedQuantity } : {}),
      calories: Math.round(numericCalories),
    });

    setFoodName("");
    setQuantity("");
    setCalories("");
  }

  return (
    <section className="nutrition-entry glass-surface" aria-labelledby="food-entry-title">
      <div className="nutrition-section-heading">
        <div>
          <p className="nutrition-eyebrow">快速记录</p>
          <h2 id="food-entry-title">添加食物</h2>
        </div>
        <span className="nutrition-heading-icon" aria-hidden="true">＋</span>
      </div>

      <form className="food-entry-form" onSubmit={handleSubmit}>
        <fieldset className="food-meal-picker">
          <legend>选择餐别</legend>
          <div className="food-meal-options">
            {mealTypes.map((type) => (
              <button
                key={type}
                type="button"
                className="food-meal-option nutrition-touch-target"
                data-active={mealType === type}
                aria-pressed={mealType === type}
                onClick={() => setMealType(type)}
              >
                {MEAL_LABELS[type]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="food-entry-fields">
          <label className="nutrition-field food-name-field" htmlFor={foodNameId}>
            <span>食物名称</span>
            <input
              id={foodNameId}
              className="nutrition-input"
              value={foodName}
              list={suggestionsId}
              autoComplete="off"
              placeholder="例如：鸡胸肉"
              onChange={(event) => setFoodName(event.target.value)}
              required
            />
          </label>
          <datalist id={suggestionsId}>
            <option value="鸡蛋" />
            <option value="鸡胸肉" />
            <option value="米饭" />
            <option value="牛奶" />
            <option value="水果" />
          </datalist>

          <label className="nutrition-field" htmlFor={quantityId}>
            <span>份量（可选）</span>
            <input
              id={quantityId}
              className="nutrition-input"
              value={quantity}
              placeholder="例如：200 g"
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>

          <label className="nutrition-field calories-field" htmlFor={caloriesId}>
            <span>热量</span>
            <span className="nutrition-number-input">
              <input
                id={caloriesId}
                className="nutrition-input"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={calories}
                placeholder="0"
                onChange={(event) => setCalories(event.target.value)}
                required
              />
              <small>kcal</small>
            </span>
          </label>
        </div>

        <div className="calorie-presets" aria-label="快速选择热量">
          {caloriePresets.map((value) => (
            <button
              key={value}
              type="button"
              className="calorie-preset nutrition-touch-target"
              onClick={() => setCalories(String(value))}
            >
              {value} kcal
            </button>
          ))}
        </div>

        <button
          className="nutrition-primary-button nutrition-touch-target"
          type="submit"
          disabled={!canAdd}
        >
          添加到{MEAL_LABELS[mealType]}
        </button>
      </form>
    </section>
  );
}
