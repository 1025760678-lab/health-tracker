"use client";

import { useId, useState, type FormEvent } from "react";
import {
  MEAL_LABELS,
  type FoodEntry,
  type MealType,
} from "../../types/nutrition";

type EditableFoodFields = Pick<
  FoodEntry,
  "mealType" | "foodName" | "quantity" | "calories"
>;

export interface MealLogProps {
  entries: FoodEntry[];
  onUpdate: (id: string, patch: Partial<EditableFoodFields>) => void;
  onDelete: (id: string) => void;
}

interface FoodEntryRowProps {
  entry: FoodEntry;
  onUpdate: MealLogProps["onUpdate"];
  onDelete: MealLogProps["onDelete"];
}

const mealTypes = Object.keys(MEAL_LABELS) as MealType[];

function formatEntryTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function FoodEntryRow({ entry, onUpdate, onDelete }: FoodEntryRowProps) {
  const nameId = useId();
  const quantityId = useId();
  const calorieId = useId();
  const mealId = useId();
  const [isEditing, setIsEditing] = useState(false);
  const [mealType, setMealType] = useState(entry.mealType);
  const [foodName, setFoodName] = useState(entry.foodName);
  const [quantity, setQuantity] = useState(entry.quantity ?? "");
  const [calories, setCalories] = useState(String(entry.calories));

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextCalories = Number(calories);
    if (!foodName.trim() || nextCalories <= 0) return;

    onUpdate(entry.id, {
      mealType,
      foodName: foodName.trim(),
      quantity: quantity.trim() || undefined,
      calories: Math.round(nextCalories),
    });
    setIsEditing(false);
  }

  function cancelEditing() {
    setMealType(entry.mealType);
    setFoodName(entry.foodName);
    setQuantity(entry.quantity ?? "");
    setCalories(String(entry.calories));
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <form className="meal-entry meal-entry-editing" onSubmit={handleSave}>
        <label className="nutrition-field" htmlFor={nameId}>
          <span>食物</span>
          <input
            id={nameId}
            className="nutrition-input"
            value={foodName}
            onChange={(event) => setFoodName(event.target.value)}
            required
          />
        </label>
        <label className="nutrition-field" htmlFor={quantityId}>
          <span>份量</span>
          <input
            id={quantityId}
            className="nutrition-input"
            value={quantity}
            placeholder="可选"
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
        <label className="nutrition-field" htmlFor={calorieId}>
          <span>热量（kcal）</span>
          <input
            id={calorieId}
            className="nutrition-input"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={calories}
            onChange={(event) => setCalories(event.target.value)}
            required
          />
        </label>
        <label className="nutrition-field" htmlFor={mealId}>
          <span>移动到</span>
          <select
            id={mealId}
            className="nutrition-select nutrition-touch-target"
            value={mealType}
            onChange={(event) => setMealType(event.target.value as MealType)}
          >
            {mealTypes.map((type) => (
              <option key={type} value={type}>{MEAL_LABELS[type]}</option>
            ))}
          </select>
        </label>
        <div className="meal-entry-edit-actions">
          <button
            type="button"
            className="nutrition-quiet-button nutrition-touch-target"
            onClick={cancelEditing}
          >
            取消
          </button>
          <button
            type="submit"
            className="nutrition-primary-button nutrition-touch-target"
            disabled={!foodName.trim() || Number(calories) <= 0}
          >
            保存
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className="meal-entry">
      <div className="meal-entry-main">
        <div>
          <strong>{entry.foodName}</strong>
          <p>
            {entry.quantity || "未填写份量"}
            {formatEntryTime(entry.createdAt) && (
              <time dateTime={entry.createdAt}> · {formatEntryTime(entry.createdAt)}</time>
            )}
          </p>
        </div>
        <span className="meal-entry-calories">{entry.calories} <small>kcal</small></span>
      </div>
      <div className="meal-entry-actions">
        <button
          type="button"
          className="nutrition-quiet-button nutrition-touch-target"
          aria-label={`编辑${entry.foodName}`}
          onClick={() => setIsEditing(true)}
        >
          编辑
        </button>
        <button
          type="button"
          className="nutrition-delete-button nutrition-touch-target"
          aria-label={`删除${entry.foodName}`}
          onClick={() => onDelete(entry.id)}
        >
          删除
        </button>
      </div>
    </article>
  );
}

export function MealLog({ entries, onUpdate, onDelete }: MealLogProps) {
  const totalCalories = entries.reduce((total, entry) => total + entry.calories, 0);

  return (
    <section className="meal-log glass-surface" aria-labelledby="meal-log-title">
      <div className="nutrition-section-heading meal-log-heading">
        <div>
          <p className="nutrition-eyebrow">今日饮食</p>
          <h2 id="meal-log-title">餐食记录</h2>
        </div>
        <div className="meal-log-total">
          <strong>{totalCalories}</strong>
          <span>kcal</span>
        </div>
      </div>

      <div className="meal-groups">
        {mealTypes.map((mealType) => {
          const mealEntries = entries.filter((entry) => entry.mealType === mealType);
          const mealCalories = mealEntries.reduce(
            (total, entry) => total + entry.calories,
            0,
          );

          return (
            <section className="meal-group" key={mealType} aria-labelledby={`meal-${mealType}`}>
              <div className="meal-group-heading">
                <h3 id={`meal-${mealType}`}>{MEAL_LABELS[mealType]}</h3>
                <span>{mealCalories} kcal</span>
              </div>
              {mealEntries.length === 0 ? (
                <p className="meal-group-empty">还没有记录</p>
              ) : (
                <div className="meal-entry-list">
                  {mealEntries.map((entry) => (
                    <FoodEntryRow
                      key={entry.id}
                      entry={entry}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
