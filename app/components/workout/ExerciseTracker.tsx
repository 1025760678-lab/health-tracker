"use client";

import type { Exercise, WorkoutSet } from "../../types/workout";
import { AddSetForm } from "./AddSetForm";
import { SetRow } from "./SetRow";

interface ExerciseTrackerProps {
  exercise: Exercise;
  currentSets: WorkoutSet[];
  previousSets: WorkoutSet[];
  personalBest?: Pick<WorkoutSet, "weight" | "reps"> | null;
  onAddSet: (weight: number, reps: number) => void;
  onUpdateSet: (setId: string, weight: number, reps: number) => void;
  onDeleteSet: (setId: string) => void;
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
  currentSets,
  previousSets,
  personalBest,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
}: ExerciseTrackerProps) {
  const orderedCurrentSets = [...currentSets].sort(
    (first, second) => first.setNumber - second.setNumber,
  );
  const orderedPreviousSets = [...previousSets].sort(
    (first, second) => first.setNumber - second.setNumber,
  );
  const defaultWeight =
    orderedCurrentSets.at(-1)?.weight ?? orderedPreviousSets.at(0)?.weight;

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

      <div className="exercise-reference-grid">
        <div className="exercise-reference-stat">
          <span>上次训练</span>
          <strong>
            {orderedPreviousSets.length > 0
              ? `${orderedPreviousSets.length} 组`
              : "暂无"}
          </strong>
        </div>
        <div className="exercise-reference-stat">
          <span>个人最佳</span>
          <strong>
            {personalBest
              ? `${personalBest.weight} kg × ${personalBest.reps}`
              : "—"}
          </strong>
        </div>
        <div className="exercise-reference-stat exercise-reference-stat-today">
          <span>今天</span>
          <strong>{orderedCurrentSets.length} 组</strong>
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

      <div className="current-set-section">
        <div className="current-set-heading">
          <h3>今天的组数</h3>
          <span>{orderedCurrentSets.length} 组</span>
        </div>

        {orderedCurrentSets.length === 0 ? (
          <p className="current-set-empty">输入重量和次数，开始今天的第一组。</p>
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
    </section>
  );
}
