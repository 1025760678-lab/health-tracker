"use client";

import { useId, useState, type FormEvent } from "react";
import type {
  BaselineActivityLevel,
  BiologicalSex,
  CalorieGoalType,
  UserBodyProfile,
} from "../../types/profile";

export interface BodyProfileCardProps {
  profile: UserBodyProfile;
  onSave: (profile: UserBodyProfile) => void;
}

const sexLabels: Record<BiologicalSex, string> = {
  male: "男性公式",
  female: "女性公式",
};

const activityLabels: Record<BaselineActivityLevel, string> = {
  sedentary: "久坐（很少走动）",
  light: "轻度活动",
  moderate: "中度活动",
  very: "高度活动",
  extra: "非常活跃",
};

const goalLabels: Record<CalorieGoalType, string> = {
  maintenance: "维持",
  deficit: "热量缺口",
  surplus: "热量盈余",
  custom: "自定义摄入",
};

type NumericProfileField = "age" | "heightCm" | "currentWeightKg" | "calorieGoalValue";

function BodyProfileEditor({ profile, onSave }: BodyProfileCardProps) {
  const ageId = useId();
  const heightId = useId();
  const weightId = useId();
  const activityId = useId();
  const goalValueId = useId();
  const [draft, setDraft] = useState<UserBodyProfile>({ ...profile });

  function updateNumber(field: NumericProfileField, value: string) {
    const parsed = value === "" ? undefined : Number(value);
    setDraft((current) => ({ ...current, [field]: parsed }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({ ...draft, updatedAt: new Date().toISOString() });
  }

  const goalValueLabel = draft.calorieGoalType === "custom"
    ? "每日摄入目标"
    : draft.calorieGoalType === "surplus"
      ? "目标盈余"
      : "目标缺口";

  return (
    <form className="body-profile-form" onSubmit={handleSubmit}>
      <fieldset className="profile-choice-group">
        <legend>用于选择 BMR 公式的生理性别</legend>
        <div className="profile-segmented-options">
          {(Object.keys(sexLabels) as BiologicalSex[]).map((sex) => (
            <button
              key={sex}
              type="button"
              className="profile-choice nutrition-touch-target"
              data-active={draft.biologicalSex === sex}
              aria-pressed={draft.biologicalSex === sex}
              onClick={() => setDraft((current) => ({ ...current, biologicalSex: sex }))}
            >
              {sexLabels[sex]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="body-profile-measurements">
        <label className="nutrition-field" htmlFor={ageId}>
          <span>年龄</span>
          <span className="nutrition-number-input">
            <input
              id={ageId}
              className="nutrition-input"
              type="number"
              inputMode="numeric"
              min="13"
              max="120"
              step="1"
              value={draft.age ?? ""}
              placeholder="岁"
              onChange={(event) => updateNumber("age", event.target.value)}
            />
            <small>岁</small>
          </span>
        </label>
        <label className="nutrition-field" htmlFor={heightId}>
          <span>身高</span>
          <span className="nutrition-number-input">
            <input
              id={heightId}
              className="nutrition-input"
              type="number"
              inputMode="decimal"
              min="80"
              max="250"
              step="0.1"
              value={draft.heightCm ?? ""}
              placeholder="0"
              onChange={(event) => updateNumber("heightCm", event.target.value)}
            />
            <small>cm</small>
          </span>
        </label>
        <label className="nutrition-field" htmlFor={weightId}>
          <span>当前体重</span>
          <span className="nutrition-number-input">
            <input
              id={weightId}
              className="nutrition-input"
              type="number"
              inputMode="decimal"
              min="20"
              max="500"
              step="0.1"
              value={draft.currentWeightKg ?? ""}
              placeholder="0"
              onChange={(event) => updateNumber("currentWeightKg", event.target.value)}
            />
            <small>kg</small>
          </span>
        </label>
      </div>

      <label className="nutrition-field profile-activity-field" htmlFor={activityId}>
        <span>非训练日常活动等级</span>
        <select
          id={activityId}
          className="nutrition-select nutrition-touch-target"
          value={draft.baselineActivityLevel ?? ""}
          onChange={(event) => setDraft((current) => ({
            ...current,
            baselineActivityLevel: event.target.value
              ? event.target.value as BaselineActivityLevel
              : undefined,
          }))}
        >
          <option value="">请选择</option>
          {(Object.keys(activityLabels) as BaselineActivityLevel[]).map((level) => (
            <option key={level} value={level}>{activityLabels[level]}</option>
          ))}
        </select>
        <small>这里只描述不含已记录训练的日常活动，避免重复计算。</small>
      </label>

      <fieldset className="profile-choice-group profile-goal-group">
        <legend>每日热量目标</legend>
        <div className="profile-goal-options">
          {(Object.keys(goalLabels) as CalorieGoalType[]).map((goal) => (
            <button
              key={goal}
              type="button"
              className="profile-choice nutrition-touch-target"
              data-active={draft.calorieGoalType === goal}
              aria-pressed={draft.calorieGoalType === goal}
              onClick={() => setDraft((current) => ({
                ...current,
                calorieGoalType: goal,
                calorieGoalValue: goal === "maintenance" ? undefined : current.calorieGoalValue,
              }))}
            >
              {goalLabels[goal]}
            </button>
          ))}
        </div>
      </fieldset>

      {draft.calorieGoalType !== "maintenance" && (
        <label className="nutrition-field profile-goal-value" htmlFor={goalValueId}>
          <span>{goalValueLabel}</span>
          <span className="nutrition-number-input">
            <input
              id={goalValueId}
              className="nutrition-input"
              type="number"
              inputMode="numeric"
              min="0"
              step="10"
              value={draft.calorieGoalValue ?? ""}
              placeholder={draft.calorieGoalType === "custom" ? "例如 2000" : "例如 300"}
              onChange={(event) => updateNumber("calorieGoalValue", event.target.value)}
            />
            <small>kcal</small>
          </span>
        </label>
      )}

      <div className="profile-estimate-note" role="note">
        <strong>关于能量估算</strong>
        <p>
          BMR 与日常消耗来自公式估算，并非医疗测量。已记录的训练消耗会单独加入，
          不包含在上方活动等级内。
        </p>
      </div>

      <button className="nutrition-primary-button nutrition-touch-target" type="submit">
        保存身体资料
      </button>
    </form>
  );
}

export function BodyProfileCard(props: BodyProfileCardProps) {
  return (
    <section className="body-profile-card glass-surface" aria-labelledby="body-profile-title">
      <div className="nutrition-section-heading">
        <div>
          <p className="nutrition-eyebrow">能量设置</p>
          <h2 id="body-profile-title">身体资料</h2>
        </div>
        <span className="profile-card-icon" aria-hidden="true">◎</span>
      </div>
      <BodyProfileEditor key={props.profile.updatedAt} {...props} />
    </section>
  );
}
