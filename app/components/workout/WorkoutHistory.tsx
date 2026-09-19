"use client";

import { useState } from "react";
import type {
  Exercise,
  MuscleGroupId,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from "../../types/workout";

export interface WorkoutHistoryProps {
  sessions: WorkoutSession[];
  exercises: Exercise[];
  workoutExercises: WorkoutExercise[];
  sets: WorkoutSet[];
  today?: string;
  defaultExpandedSessionId?: string;
}

const MUSCLE_GROUPS: ReadonlyArray<{ id: MuscleGroupId; label: string }> = [
  { id: "chest", label: "胸部" },
  { id: "back", label: "背部" },
  { id: "shoulders", label: "肩部" },
  { id: "biceps", label: "二头肌" },
  { id: "triceps", label: "三头肌" },
];

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatHistoryDate(dateKey: string) {
  const date = parseLocalDate(dateKey);
  if (Number.isNaN(date.getTime())) return dateKey;

  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatWeight(weight: number) {
  return weight.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

export function WorkoutHistory({
  sessions,
  exercises,
  workoutExercises,
  sets,
  today = getLocalDateKey(),
  defaultExpandedSessionId,
}: WorkoutHistoryProps) {
  const [expandedSessionIds, setExpandedSessionIds] = useState<string[]>(
    defaultExpandedSessionId ? [defaultExpandedSessionId] : [],
  );
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const historySessions = sessions
    .filter((session) => session.date !== today)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  function toggleSession(sessionId: string) {
    setExpandedSessionIds((current) =>
      current.includes(sessionId)
        ? current.filter((id) => id !== sessionId)
        : [...current, sessionId],
    );
  }

  return (
    <section
      className="workout-panel workout-glass-panel workout-history"
      aria-labelledby="workout-history-heading"
    >
      <header className="workout-section-heading">
        <div>
          <p className="workout-eyebrow">回顾</p>
          <h2 id="workout-history-heading">训练历史</h2>
        </div>
        <span className="workout-section-count">{historySessions.length} 天</span>
      </header>

      {historySessions.length > 0 ? (
        <ul className="workout-history-list">
          {historySessions.map((session) => {
            const sessionExercises = workoutExercises
              .filter((item) => item.workoutSessionId === session.id)
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            const sessionWorkoutExerciseIds = new Set(sessionExercises.map((item) => item.id));
            const sessionSetCount = sets.filter((set) =>
              sessionWorkoutExerciseIds.has(set.workoutExerciseId),
            ).length;
            const sessionSummary = [
              `${sessionExercises.length} 个动作`,
              `${sessionSetCount} 组`,
              session.durationMinutes !== undefined
                ? `${session.durationMinutes.toLocaleString("zh-CN")} 分钟`
                : null,
              session.estimatedCaloriesBurned !== undefined
                ? `约 ${session.estimatedCaloriesBurned.toLocaleString("zh-CN")} 千卡`
                : null,
            ].filter((detail): detail is string => detail !== null);
            const groups = MUSCLE_GROUPS.map((group) => ({
              ...group,
              items: sessionExercises
                .filter((item) => exerciseById.get(item.exerciseId)?.muscleGroupId === group.id)
                .map((item) => ({
                  workoutExercise: item,
                  exercise: exerciseById.get(item.exerciseId)!,
                  sets: sets
                    .filter((set) => set.workoutExerciseId === item.id)
                    .sort((a, b) => a.setNumber - b.setNumber),
                })),
            })).filter((group) => group.items.length > 0);
            const isExpanded = expandedSessionIds.includes(session.id);
            const detailsId = `workout-history-${session.id}`;

            return (
              <li className="workout-history-day" key={session.id}>
                <button
                  className="workout-history-toggle"
                  type="button"
                  onClick={() => toggleSession(session.id)}
                  aria-expanded={isExpanded}
                  aria-controls={detailsId}
                >
                  <span>
                    <strong>{formatHistoryDate(session.date)}</strong>
                    <small>{sessionSummary.join(" · ")}</small>
                  </span>
                  <span className="workout-history-chevron" aria-hidden="true">
                    {isExpanded ? "−" : "+"}
                  </span>
                </button>

                <div
                  className="workout-history-details"
                  id={detailsId}
                  hidden={!isExpanded}
                >
                  {groups.length > 0 ? (
                    <ul className="workout-history-groups">
                      {groups.map((group) => (
                        <li key={group.id} data-muscle-group={group.id}>
                          <h3>
                            <span className="workout-muscle-dot" aria-hidden="true" />
                            {group.label}
                          </h3>
                          <ul className="workout-history-exercises">
                            {group.items.map(({ workoutExercise, exercise, sets: exerciseSets }) => (
                              <li key={workoutExercise.id}>
                                <strong>{exercise.name}</strong>
                                {(workoutExercise.targetSets || workoutExercise.effort) && (
                                  <div className="workout-history-feedback">
                                    {workoutExercise.targetSets && <span>{exerciseSets.length} / {Math.max(exerciseSets.length, workoutExercise.targetSets)} 组</span>}
                                    {workoutExercise.effort && <span>{workoutExercise.effort === "easy" ? "轻松" : workoutExercise.effort === "normal" ? "正常" : "吃力"}</span>}
                                  </div>
                                )}
                                {workoutExercise.notes && <p className="workout-history-note">{workoutExercise.notes}</p>}
                                {exerciseSets.length > 0 ? (
                                  <ol aria-label={`${exercise.name} 的历史组数`}>
                                    {exerciseSets.map((set) => (
                                      <li key={set.id}>
                                        {formatWeight(set.weight)} kg{" "}
                                        <span aria-hidden="true">×</span> {set.reps} 次
                                      </li>
                                    ))}
                                  </ol>
                                ) : (
                                  <small className="workout-empty-inline">未记录组数</small>
                                )}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="workout-empty-inline">这一天没有可显示的训练记录。</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="workout-empty-state">
          <span aria-hidden="true">⌛</span>
          <p>还没有历史训练。</p>
          <small>完成今天的训练后，将可在这里回顾。</small>
        </div>
      )}
    </section>
  );
}
