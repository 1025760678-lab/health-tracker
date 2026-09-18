"use client";

import { useState } from "react";
import { WheelNumberInput } from "../WheelNumberInput";
import type { BaselineActivityLevel, BiologicalSex, UserBodyProfile, WeightRecord } from "../../types/profile";
import {
  getRecipeStages,
  type RecipeGoal,
  type RecipePace,
  type RecipeScenario,
  type WeeklyTrainingDays,
} from "../../utils/recipeCalculations";

interface RecipeFood {
  name: string;
  serving: string;
  carbs: number;
  protein: number;
  fat: number;
}

interface RecipeMeal {
  key: string;
  icon: string;
  name: string;
  time: string;
  foods: RecipeFood[];
}

const baseRecipeMeals: RecipeMeal[] = [
  {
    key: "breakfast",
    icon: "☀️",
    name: "早餐",
    time: "07:00–09:00",
    foods: [
      { name: "燕麦", serving: "60 g", carbs: 40, protein: 8, fat: 4 },
      { name: "全蛋", serving: "2 个", carbs: 1, protein: 12, fat: 10 },
      { name: "无糖酸奶", serving: "150 g", carbs: 6, protein: 15, fat: 3 },
      { name: "蓝莓", serving: "80 g", carbs: 10, protein: 1, fat: 0 },
    ],
  },
  {
    key: "lunch",
    icon: "🌤️",
    name: "午餐",
    time: "11:30–13:30",
    foods: [
      { name: "米饭", serving: "150 g", carbs: 52, protein: 4, fat: 1 },
      { name: "香煎鸡胸", serving: "180 g", carbs: 0, protein: 55, fat: 6 },
      { name: "西兰花", serving: "200 g", carbs: 14, protein: 6, fat: 1 },
      { name: "橄榄油", serving: "10 g", carbs: 0, protein: 0, fat: 10 },
    ],
  },
  {
    key: "dinner",
    icon: "🌙",
    name: "晚餐",
    time: "17:30–19:30",
    foods: [
      { name: "烤红薯", serving: "200 g", carbs: 40, protein: 4, fat: 0 },
      { name: "烤三文鱼", serving: "150 g", carbs: 0, protein: 33, fat: 18 },
      { name: "时蔬沙拉", serving: "200 g", carbs: 12, protein: 5, fat: 1 },
      { name: "牛油果", serving: "50 g", carbs: 4, protein: 1, fat: 7 },
    ],
  },
];

type ProteinSource = "chicken" | "shrimp" | "fish" | "beef";

const proteinSources: Record<ProteinSource, RecipeFood> = {
  chicken: { name: "香煎鸡胸", serving: "180 g", carbs: 0, protein: 55, fat: 6 },
  shrimp: { name: "清蒸虾仁", serving: "220 g", carbs: 0, protein: 44, fat: 2 },
  fish: { name: "清蒸巴沙鱼", serving: "220 g", carbs: 0, protein: 40, fat: 4 },
  beef: { name: "瘦牛肉", serving: "180 g", carbs: 0, protein: 45, fat: 12 },
};

const activityOptions: { value: BaselineActivityLevel; label: string }[] = [
  { value: "sedentary", label: "久坐" },
  { value: "light", label: "轻度活动" },
  { value: "moderate", label: "中度活动" },
  { value: "very", label: "高度活动" },
  { value: "extra", label: "非常活跃" },
];

const goalOptions: { value: RecipeGoal; label: string; hint: string }[] = [
  { value: "cut", label: "减脂", hint: "低于维持热量" },
  { value: "maintain", label: "维持", hint: "接近维持热量" },
  { value: "gain", label: "增肌", hint: "高于维持热量" },
];

const paceOptions: { value: RecipePace; label: string }[] = [
  { value: "gentle", label: "温和" },
  { value: "standard", label: "标准" },
  { value: "focused", label: "积极" },
];

function getMealTotals(meal: RecipeMeal) {
  return meal.foods.reduce(
    (totals, food) => ({
      carbs: totals.carbs + food.carbs,
      protein: totals.protein + food.protein,
      fat: totals.fat + food.fat,
    }),
    { carbs: 0, protein: 0, fat: 0 },
  );
}

function scaleFood(food: RecipeFood, factor: number): RecipeFood {
  const match = /^(\d+(?:\.\d+)?)\s*(g|个)$/.exec(food.serving);
  if (!match) return food;
  const original = Number(match[1]);
  const amount = match[2] === "个"
    ? Math.max(1, Math.round(original * factor))
    : Math.max(5, Math.round(original * factor / 5) * 5);
  const actualFactor = amount / original;
  return {
    ...food,
    serving: `${amount} ${match[2]}`,
    carbs: Math.round(food.carbs * actualFactor),
    protein: Math.round(food.protein * actualFactor),
    fat: Math.round(food.fat * actualFactor),
  };
}

function mealPlanFor(source: ProteinSource, targetCalories: number | null) {
  const meals = baseRecipeMeals.map((meal) => ({
    ...meal,
    foods: meal.key === "lunch"
      ? meal.foods.map((food) => food.name === "香煎鸡胸" ? proteinSources[source] : food)
      : meal.foods,
  }));
  const originalTotals = meals.reduce((total, meal) => {
    const macros = getMealTotals(meal);
    return total + macros.carbs * 4 + macros.protein * 4 + macros.fat * 9;
  }, 0);
  const factor = targetCalories === null ? 1 : targetCalories / originalTotals;
  return meals.map((meal) => ({ ...meal, foods: meal.foods.map((food) => scaleFood(food, factor)) }));
}

function latestWeight(records: WeightRecord[], profile: UserBodyProfile) {
  const latest = [...records].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
  return latest?.weightKg ?? profile.currentWeightKg;
}

interface RecipePlanProps {
  profile: UserBodyProfile;
  weightRecords: WeightRecord[];
  onOpenProfile: () => void;
}

export function RecipePlan({ profile, weightRecords, onOpenProfile }: RecipePlanProps) {
  const [weight, setWeight] = useState(String(latestWeight(weightRecords, profile) ?? ""));
  const [targetWeight, setTargetWeight] = useState("");
  const [age, setAge] = useState(String(profile.age ?? ""));
  const [height, setHeight] = useState(String(profile.heightCm ?? ""));
  const [sex, setSex] = useState<BiologicalSex | "">(profile.biologicalSex ?? "");
  const [activity, setActivity] = useState<BaselineActivityLevel | "">(profile.baselineActivityLevel ?? "");
  const [trainingDays, setTrainingDays] = useState<WeeklyTrainingDays>(0);
  const [goal, setGoal] = useState<RecipeGoal>(
    profile.calorieGoalType === "deficit" ? "cut" : profile.calorieGoalType === "surplus" ? "gain" : "maintain",
  );
  const [pace, setPace] = useState<RecipePace>("standard");
  const [selectedStage, setSelectedStage] = useState(0);
  const [proteinSource, setProteinSource] = useState<ProteinSource>("chicken");

  const scenario: RecipeScenario = {
    weightKg: Number(weight),
    age: Number(age),
    heightCm: Number(height),
    biologicalSex: sex as BiologicalSex,
    activityLevel: activity as BaselineActivityLevel,
    trainingDays,
    goal,
    pace,
  };
  const goalWeight = targetWeight === "" ? null : Number(targetWeight);
  const hasInvalidTarget = goal !== "maintain" && goalWeight !== null && (
    !Number.isFinite(goalWeight) ||
    goalWeight < 25 || goalWeight > 300 ||
    (goal === "cut" && goalWeight >= scenario.weightKg) ||
    (goal === "gain" && goalWeight <= scenario.weightKg)
  );
  const stages = getRecipeStages(scenario, goalWeight);
  const activeStage = stages[Math.min(selectedStage, stages.length - 1)] ?? null;
  const recipeMeals = mealPlanFor(proteinSource, activeStage?.intakeCalories ?? null);
  const dayTotals = recipeMeals.reduce((totals, meal) => {
    const macros = getMealTotals(meal);
    return {
      carbs: totals.carbs + macros.carbs,
      protein: totals.protein + macros.protein,
      fat: totals.fat + macros.fat,
    };
  }, { carbs: 0, protein: 0, fat: 0 });
  const estimatedCalories = dayTotals.carbs * 4 + dayTotals.protein * 4 + dayTotals.fat * 9;

  return (
    <div className="recipe-layout" role="tabpanel" aria-label="食谱">
      <section className="recipe-planner glass-surface" aria-labelledby="recipe-planner-title">
        <div className="nutrition-section-heading">
          <div><p className="nutrition-eyebrow">PERSONAL PLAN</p><h2 id="recipe-planner-title">按体重规划食谱</h2></div>
          <button className="recipe-link-button" type="button" onClick={onOpenProfile}>查看身体资料</button>
        </div>

        <fieldset className="recipe-option-group">
          <legend>目标</legend>
          <div className="recipe-option-row">
            {goalOptions.map((option) => (
              <button key={option.value} type="button" className="recipe-choice" data-active={goal === option.value}
                aria-pressed={goal === option.value} onClick={() => { setGoal(option.value); setSelectedStage(0); }}>
                <strong>{option.label}</strong><small>{option.hint}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="recipe-input-grid">
          <label className="nutrition-field" htmlFor="recipe-current-weight"><span>当前体重</span><span className="nutrition-number-input">
            <WheelNumberInput id="recipe-current-weight" className="nutrition-input" inputMode="decimal" min={25} max={300} step={0.1} value={weight} wheelLabel="当前体重" unit="kg"
              onValueChange={(value) => { setWeight(value); setSelectedStage(0); }} /><small>kg</small>
          </span></label>
          {goal !== "maintain" && (
            <label className="nutrition-field" htmlFor="recipe-target-weight"><span>目标体重（可选）</span><span className="nutrition-number-input">
              <WheelNumberInput id="recipe-target-weight" className="nutrition-input" inputMode="decimal" min={25} max={300} step={0.1} wheelLabel="目标体重" unit="kg"
                value={targetWeight} placeholder={goal === "cut" ? "低于当前体重" : "高于当前体重"}
                aria-invalid={hasInvalidTarget} onValueChange={(value) => { setTargetWeight(value); setSelectedStage(0); }} /><small>kg</small>
            </span></label>
          )}
          <label className="nutrition-field" htmlFor="recipe-age"><span>年龄</span><span className="nutrition-number-input">
            <WheelNumberInput id="recipe-age" className="nutrition-input" inputMode="numeric" min={18} max={100} value={age} wheelLabel="年龄" unit="岁"
              onValueChange={setAge} /><small>岁</small>
          </span></label>
          <label className="nutrition-field" htmlFor="recipe-height"><span>身高</span><span className="nutrition-number-input">
            <WheelNumberInput id="recipe-height" className="nutrition-input" inputMode="decimal" min={100} max={250} step={0.1} value={height} wheelLabel="身高" unit="cm"
              onValueChange={setHeight} /><small>cm</small>
          </span></label>
          <label className="nutrition-field"><span>日常活动（不含训练）</span>
            <select className="nutrition-select" value={activity} onChange={(event) => setActivity(event.target.value as BaselineActivityLevel)}>
              <option value="">请选择</option>
              {activityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <fieldset className="recipe-sex-options"><legend>公式使用的生理性别</legend>
            <div className="recipe-inline-choices">
              {(["male", "female"] as const).map((value) => (
                <button key={value} type="button" className="recipe-small-choice" data-active={sex === value}
                  aria-pressed={sex === value} onClick={() => setSex(value)}>{value === "male" ? "男性公式" : "女性公式"}</button>
              ))}
            </div>
          </fieldset>
        </div>
        {hasInvalidTarget && <p className="recipe-validation" role="alert">目标体重需{goal === "cut" ? "低于" : "高于"}当前体重，并在 25–300 kg 之间。</p>}

        <div className="recipe-preference-grid">
          <fieldset className="recipe-option-group"><legend>每周力量训练</legend>
            <div className="recipe-inline-choices">
              {([0, 2, 4, 6] as WeeklyTrainingDays[]).map((days) => (
                <button key={days} type="button" className="recipe-small-choice" data-active={trainingDays === days}
                  aria-pressed={trainingDays === days} onClick={() => setTrainingDays(days)}>{days === 0 ? "未安排" : days + " 天"}</button>
              ))}
            </div>
          </fieldset>
          {goal !== "maintain" && <fieldset className="recipe-option-group"><legend>{goal === "cut" ? "减脂" : "增肌"}节奏</legend>
            <div className="recipe-inline-choices">
              {paceOptions.map((option) => (
                <button key={option.value} type="button" className="recipe-small-choice" data-active={pace === option.value}
                  aria-pressed={pace === option.value} onClick={() => setPace(option.value)}>{option.label}</button>
              ))}
            </div>
            <small className="recipe-option-hint">{goal === "cut" ? "对应约 10%、15%、20% 热量缺口" : "对应约 5%、10%、15% 热量盈余"}</small>
          </fieldset>}
        </div>
        <p className="recipe-planner-note">从身体资料和最近体重记录带入初始值；此处修改只用于模拟，不会覆盖你的记录。训练按每次 45 分钟中等强度估算周均消耗，不叠加已记录训练。</p>
      </section>

      <section className="recipe-stage-section glass-surface" aria-labelledby="recipe-stage-title">
        <div className="nutrition-section-heading"><div><p className="nutrition-eyebrow">ENERGY TARGET</p><h2 id="recipe-stage-title">不同体重的热量需求</h2></div></div>
        {activeStage ? (
          <>
            <div className="recipe-stage-options">
              {stages.map((stage, index) => (
                <button key={index} type="button" className="recipe-stage-choice" data-active={activeStage === stage}
                  aria-pressed={activeStage === stage} onClick={() => setSelectedStage(index)}>
                  <span>{stages.length === 1 ? "当前体重" : ["起始", "过渡", "目标"][index]}</span>
                  <strong>{Number(stage.weightKg.toFixed(1))} kg</strong>
                  <small>{stage.intakeCalories.toLocaleString()} kcal/天</small>
                </button>
              ))}
            </div>
            <div className="recipe-target-metrics">
              <div><span>估算维持</span><strong>{activeStage.maintenanceCalories.toLocaleString()}</strong><small>kcal/天</small></div>
              <div className="recipe-target-highlight"><span>{goal === "cut" ? "减脂" : goal === "gain" ? "增肌" : "维持"}摄入目标</span><strong>{activeStage.intakeCalories.toLocaleString()}</strong><small>kcal/天</small></div>
              <div><span>碳水 / 蛋白 / 脂肪</span><strong>{activeStage.carbsG} / {activeStage.proteinG} / {activeStage.fatG}</strong><small>g/天</small></div>
            </div>
            <p className="recipe-stage-note">与维持热量相比 {activeStage.adjustmentCalories >= 0 ? "+" : "−"}{Math.abs(activeStage.adjustmentCalories)} kcal/天。{stages.length > 1 ? "各体重节点仅用于比较摄入需求，不代表达到该体重的时间预测。" : "填写方向正确的目标体重后，可对比起始、过渡和目标三个节点。"}</p>
            {activeStage.intakeCalories < 1500 && <p className="recipe-validation" role="note">估算摄入偏低；请勿仅凭此数值长期安排饮食，必要时咨询专业营养人员。</p>}
          </>
        ) : <div className="recipe-empty-estimate">填写 18 岁以上的年龄、身高、体重、公式性别与活动量后，显示个人估算和阶段对比。</div>}
        <details className="recipe-method">
          <summary>查看计算逻辑</summary>
          <p>静息能量采用 Mifflin–St Jeor 公式；日常活动系数与假设训练的周均消耗相加，得到估算维持热量。减脂按维持热量减去 10%／15%／20%，增肌增加 5%／10%／15%。蛋白质目标按体重约 1.6–1.8 g/kg 估算，其余分配给脂肪与碳水。</p>
          <p>体重变化会影响能量需求，因此每个节点重新计算；这不是固定周期的体重预测。参考：<a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noreferrer">静息能量公式原研究</a> · <a href="https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner" target="_blank" rel="noreferrer">NIDDK 体重规划说明</a>。</p>
        </details>
      </section>
      <section className="recipe-summary glass-surface" aria-labelledby="recipe-plan-title">
        <div className="nutrition-section-heading recipe-summary-heading">
          <div>
            <p className="nutrition-eyebrow">DAILY RECIPE</p>
            <h2 id="recipe-plan-title">高蛋白一日食谱</h2>
          </div>
          <span className="recipe-plan-badge">{activeStage ? "按所选体重调整份量" : "原有示例份量"}</span>
        </div>

        <div className="recipe-daily-metrics" aria-label="每日营养估算">
          <div className="recipe-calorie-metric">
            <span>这份食谱约</span>
            <strong>{estimatedCalories.toLocaleString()}</strong>
            <small>kcal</small>
          </div>
          <div><span>碳水</span><strong>{dayTotals.carbs}</strong><small>g</small></div>
          <div><span>蛋白质</span><strong>{dayTotals.protein}</strong><small>g</small></div>
          <div><span>脂肪</span><strong>{dayTotals.fat}</strong><small>g</small></div>
        </div>

        <p className="recipe-summary-note">
          {activeStage
            ? "以原有食谱为基础，按当前选择的热量目标等比例调整份量；食材取整会产生少量偏差。上方营养素是规划目标，下方是这份食谱的估算值。"
            : "原有食谱保持不变。完善上方资料后可按体重、目标和阶段调整参考份量。"}
        </p>
      </section>

      <section className="recipe-meals-section" aria-labelledby="recipe-meals-title">
        <div className="recipe-section-title">
          <div>
            <p className="nutrition-eyebrow">MEAL PLAN</p>
            <h2 id="recipe-meals-title">三餐食物分配</h2>
          </div>
          <p>营养素数值为估算</p>
        </div>

        <fieldset className="recipe-protein-picker glass-surface">
          <legend>午餐蛋白来源</legend>
          <div className="recipe-inline-choices">
            {(Object.keys(proteinSources) as ProteinSource[]).map((source) => (
              <button key={source} className="recipe-small-choice" type="button" data-active={proteinSource === source}
                aria-pressed={proteinSource === source} onClick={() => setProteinSource(source)}>
                {source === "chicken" ? "鸡胸" : source === "shrimp" ? "虾仁" : source === "fish" ? "鱼肉" : "瘦牛肉"}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="recipe-meal-grid">
          {recipeMeals.map((meal) => {
            const totals = getMealTotals(meal);
            return (
              <article className="recipe-meal-card glass-surface" key={meal.key}>
                <header className="recipe-meal-heading">
                  <span className="recipe-meal-icon" aria-hidden="true">{meal.icon}</span>
                  <div>
                    <h3>{meal.name}</h3>
                    <p>{meal.time}</p>
                  </div>
                </header>

                <div className="recipe-table-wrap">
                  <table className="recipe-table">
                    <thead>
                      <tr>
                        <th scope="col">食物</th>
                        <th scope="col">份量</th>
                        <th scope="col">碳水</th>
                        <th scope="col">蛋白</th>
                        <th scope="col">脂肪</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meal.foods.map((food) => (
                        <tr key={food.name}>
                          <th scope="row">{food.name}</th>
                          <td>{food.serving}</td>
                          <td>{food.carbs || "—"}</td>
                          <td>{food.protein || "—"}</td>
                          <td>{food.fat || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th scope="row" colSpan={2}>小计</th>
                        <td>{totals.carbs}</td>
                        <td>{totals.protein}</td>
                        <td>{totals.fat}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="recipe-cooking-note glass-surface" aria-label="烹饪建议">
        <span aria-hidden="true">⌘</span>
        <div>
          <strong>烹饪建议</strong>
          <p>优先清蒸、烘烤或少油煎；食材营养值和烹调损耗因品牌、做法而异。份量只是参考，结合饥饿感、训练表现与体重趋势调整。</p>
        </div>
      </aside>

      <p className="recipe-disclaimer">基于 Mifflin–St Jeor 静息能量公式的简化估算，仅适用于成年人的一般参考；实际消耗和体重变化会随时间改变，不替代专业营养或医疗建议。</p>
    </div>
  );
}
