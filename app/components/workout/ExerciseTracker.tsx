"use client";

import type { ReactNode } from "react";
import type { Exercise, WorkoutExercise, WorkoutSet } from "../../types/workout";
import { AddSetForm } from "./AddSetForm";
import { SetRow } from "./SetRow";

interface ExerciseTrackerProps {
  exercise: Exercise;
  workoutExercise?: WorkoutExercise;
  currentSets: WorkoutSet[];
  previousSets: WorkoutSet[];
  personalBest?: Pick<WorkoutSet, "weight" | "reps"> | null;
  onAddSet: (weight: number, reps: number) => void;
  onUpdateSet: (setId: string, weight: number, reps: number) => void;
  onDeleteSet: (setId: string) => void;
  onUpdatePlan: (patch: { targetSets?: number; effort?: "easy" | "normal" | "hard"; notes?: string }) => void;
  sessionControl: ReactNode;
  restTimer: ReactNode;
}

const muscleGroupNames: Record<Exercise["muscleGroupId"], string> = {
  chest: "胸",
  back: "背",
  shoulders: "肩",
  biceps: "二头肌",
  triceps: "三头肌",
};

export function ExerciseTracker({
  exercise,
  workoutExercise,
  currentSets,
  previousSets,
  personalBest,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onUpdatePlan,
  sessionControl,
  restTimer,
}: ExerciseTrackerProps) {
  const orderedCurrentSets = [...currentSets].sort(
    (first, second) => first.setNumber - second.setNumber,
  );
  const orderedPreviousSets = [...previousSets].sort(
    (first, second) => first.setNumber - second.setNumber,
  );
  const defaultWeight =
    orderedCurrentSets.at(-1)?.weight ?? orderedPreviousSets.at(0)?.weight;
  const targetSets = Math.max(orderedCurrentSets.length, workoutExercise?.targetSets ?? Math.max(4, orderedPreviousSets.length));
  const currentVolume = orderedCurrentSets.reduce((total, set) => total + set.weight * set.reps, 0);
  const previousVolume = orderedPreviousSets.reduce((total, set) => total + set.weight * set.reps, 0);
  const progress = Math.min(100, Math.round(orderedCurrentSets.length / targetSets * 100));

  return (
    <section
      className="exercise-tracker"
      aria-labelledby={`exercise-tracker-${exercise.id}`}
    >
      <div className="exercise-tracker-heading">
        <div>
          <p className="workout-eyebrow">
            {muscleGroupNames[exercise.muscleGroupId]} · 今日训练
          </p>
          <h2 id={`exercise-tracker-${exercise.id}`}>{exercise.name}</h2>
        </div>
        {personalBest && (
          <span className="personal-best-badge" aria-label="个人最佳">
            <span aria-hidden="true">◆</span> PB
          </span>
        )}
      </div>

      {sessionControl}

      <div className="exercise-visual-progress">
        <div className="exercise-progress-heading">
          <div><span>动作进度</span><strong>{orderedCurrentSets.length}<small> / {targetSets} 组</small></strong></div>
          <span className="exercise-progress-percent">{progress}%</span>
        </div>
        <div className="exercise-progress-track" role="progressbar" aria-label={`${exercise.name}完成组数`} aria-valuenow={orderedCurrentSets.length} aria-valuemin={0} aria-valuemax={targetSets}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="exercise-progress-dots" aria-label={`已完成 ${orderedCurrentSets.length} 组，目标 ${targetSets} 组`}>
          {Array.from({ length: targetSets }, (_, index) => <span key={index} data-done={index < orderedCurrentSets.length} aria-hidden="true">{index < orderedCurrentSets.length ? "✓" : index + 1}</span>)}
        </div>
        <div className="exercise-volume-compare">
          <div><span>今日容量</span><strong>{currentVolume.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}<small> kg</small></strong></div>
          <div><span>上次容量</span><strong>{orderedPreviousSets.length ? previousVolume.toLocaleString("zh-CN", { maximumFractionDigits: 1 }) : "—"}<small>{orderedPreviousSets.length ? " kg" : ""}</small></strong></div>
          <div><span>个人最佳</span><strong>{personalBest ? `${personalBest.weight} kg × ${personalBest.reps}` : "—"}</strong></div>
        </div>
      </div>

      <div className="exercise-plan-settings">
        <span>目标组数</span>
        <div className="exercise-target-options">
          {[3, 4, 5, 6, 8].map((count) => <button key={count} type="button" data-active={targetSets === count} disabled={count < orderedCurrentSets.length}
            aria-pressed={targetSets === count} onClick={() => onUpdatePlan({ targetSets: count })}>{count} 组</button>)}
        </div>
      </div>

      {orderedPreviousSets.length > 0 && (
        <details className="previous-workout-reference">
          <summary>
            <span>查看上次训练</span>
            <small>用于对比</small>
          </summary>
          <div className="previous-set-list">
            {orderedPreviousSets.map((set) => (
              <div className="previous-set" key={set.id}>
                <span>第 {set.setNumber} 组</span>
                <strong>
                  {set.weight} kg × {set.reps}
                </strong>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="current-set-section">
        <div className="current-set-heading">
          <h3>每组记录</h3>
          <span>已完成 {orderedCurrentSets.length} 组</span>
        </div>

        {orderedCurrentSets.length === 0 ? (
          <p className="current-set-empty">输入重量和次数，完成今天的第一组。</p>
        ) : (
          <div className="current-set-list">
            {orderedCurrentSets.map((set) => (
              <SetRow
                key={set.id}
                set={set}
                onChange={(weight, reps) => onUpdateSet(set.id, weight, reps)}
                onDelete={() => onDeleteSet(set.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="quick-set-entry">
        <div className="quick-set-heading">
          <div>
            <p className="workout-eyebrow">快速记录</p>
            <h3>下一组</h3>
          </div>
          {defaultWeight !== undefined && (
            <small>已带入上一组重量</small>
          )}
        </div>
        <AddSetForm
          key={`${exercise.id}:${defaultWeight ?? ""}`}
          defaultWeight={defaultWeight}
          onAdd={onAddSet}
        />
      </div>

      {restTimer}

      <div className="exercise-session-feedback">
        <fieldset>
          <legend>这次动作感觉如何？</legend>
          <div className="exercise-effort-options">
            {(["easy", "normal", "hard"] as const).map((level) => (
              <button key={level} type="button" data-active={workoutExercise?.effort === level}
                aria-pressed={workoutExercise?.effort === level} onClick={() => onUpdatePlan({ effort: level })}>
                <span aria-hidden="true">●</span>
                {level === "easy" ? "轻松" : level === "normal" ? "正常" : "吃力"}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="exercise-notes-field">
          <span>动作备注</span>
          <textarea rows={2} maxLength={240} placeholder="记录动作感受、下次想调整的重量……" value={workoutExercise?.notes ?? ""}
            onChange={(event) => onUpdatePlan({ notes: event.target.value })} />
        </label>
      </div>
    </section>
  );
}
