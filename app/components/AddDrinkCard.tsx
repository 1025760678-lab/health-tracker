"use client";

import { FormEvent, useState } from "react";
import type { CoffeeType, DrinkEntry, DrinkType } from "../types/water";
import { COFFEE_TYPE_NAMES } from "../types/water";

interface AddDrinkCardProps {
  onAdd: (entry: DrinkEntry) => void;
}

const drinkOptions: Array<{ type: DrinkType; label: string; icon: string }> = [
  { type: "water", label: "水", icon: "●" },
  { type: "milk", label: "牛奶", icon: "◒" },
  { type: "coffee", label: "咖啡", icon: "◉" },
];

const drinkNames: Record<DrinkType, string> = {
  water: "水",
  milk: "牛奶",
  coffee: "咖啡",
};

const coffeeOptions: Array<{ type: CoffeeType; brand: string }> = [
  { type: "americano", brand: "经典" },
  { type: "latte", brand: "经典" },
  { type: "luckin-coconut-latte", brand: "瑞幸" },
  { type: "luckin-gold-roast-americano", brand: "瑞幸" },
  { type: "guming-fresh-milk-latte", brand: "古茗" },
];

export function AddDrinkCard({ onAdd }: AddDrinkCardProps) {
  const [drinkType, setDrinkType] = useState<DrinkType>("water");
  const [coffeeType, setCoffeeType] = useState<CoffeeType>("americano");
  const [customAmount, setCustomAmount] = useState("");
  const [calories, setCalories] = useState("");
  const [message, setMessage] = useState("");

  function addAmount(amount: number) {
    const calorieValue = calories === "" ? undefined : Number(calories);
    if (drinkType === "coffee" && calorieValue !== undefined && (!Number.isInteger(calorieValue) || calorieValue < 0 || calorieValue > 2000)) {
      setMessage("请输入 0 到 2,000 之间的咖啡热量");
      return;
    }

    onAdd({
      amount,
      drinkType,
      coffeeType: drinkType === "coffee" ? coffeeType : undefined,
      calories: drinkType === "coffee" ? calorieValue : undefined,
    });
    setMessage(`已添加 ${amount} ml ${drinkNames[drinkType]}`);
    window.setTimeout(() => setMessage(""), 1800);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(customAmount);
    if (!Number.isInteger(amount) || amount <= 0 || amount > 10000) {
      setMessage("请输入 1 到 10,000 之间的饮品容量");
      return;
    }
    addAmount(amount);
    setCustomAmount("");
  }

  return (
    <section className="action-surface glass-surface" aria-labelledby="add-drink-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">快速记录</p>
          <h2 id="add-drink-heading" className="mt-1 text-xl font-bold text-slate-900">添加饮品</h2>
        </div>
        <span className="icon-tile" aria-hidden="true">＋</span>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-bold text-slate-500">选择饮品</legend>
        <div className="drink-selector">
          {drinkOptions.map((option) => (
            <button
              className="drink-option"
              data-active={drinkType === option.type}
              key={option.type}
              type="button"
              onClick={() => setDrinkType(option.type)}
              aria-pressed={drinkType === option.type}
            >
              <span aria-hidden="true">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {drinkType === "coffee" && (
        <div className="coffee-settings">
          <fieldset>
            <legend className="mb-2 text-xs font-bold text-amber-800">咖啡种类</legend>
            <div className="grid grid-cols-2 gap-2">
              {coffeeOptions.map((option) => (
                <button
                  className="coffee-option"
                  data-active={coffeeType === option.type}
                  key={option.type}
                  type="button"
                  onClick={() => setCoffeeType(option.type)}
                  aria-pressed={coffeeType === option.type}
                >
                  <span className="block text-[0.65rem] font-semibold opacity-70">{option.brand}</span>
                  <span className="mt-0.5 block">{COFFEE_TYPE_NAMES[option.type].replace(`${option.brand} · `, "")}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mt-4 block text-xs font-bold text-amber-800" htmlFor="coffee-calories">热量</label>
          <div className="relative mt-2">
            <input
              id="coffee-calories"
              className="input-field border-amber-200 bg-white pr-16 focus:border-amber-400"
              type="number"
              inputMode="numeric"
              min="0"
              max="2000"
              step="1"
              placeholder="输入热量"
              value={calories}
              onChange={(event) => setCalories(event.target.value)}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-amber-700">千卡</span>
          </div>
        </div>
      )}

      <div className="quick-add-grid">
        <button className="quick-button quick-button-primary" type="button" onClick={() => addAmount(250)}>
          <span className="text-2xl" aria-hidden="true">◒</span><span><strong>+250</strong> ml</span>
        </button>
        <button className="quick-button" type="button" onClick={() => addAmount(500)}>
          <span className="text-2xl" aria-hidden="true">●</span><span><strong>+500</strong> ml</span>
        </button>
      </div>

      <form className="mt-4 flex gap-3" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="custom-amount">自定义饮品容量（毫升）</label>
        <div className="relative min-w-0 flex-1">
          <input
            id="custom-amount"
            className="input-field pr-12"
            type="number"
            inputMode="numeric"
            min="1"
            max="10000"
            step="1"
            placeholder="自定义容量"
            value={customAmount}
            onChange={(event) => setCustomAmount(event.target.value)}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">ml</span>
        </div>
        <button className="primary-button" type="submit">添加</button>
      </form>
      <p className="mt-3 min-h-5 text-sm font-medium text-sky-600" role="status">{message}</p>
    </section>
  );
}
