"use client";

import { FormEvent, useMemo, useState } from "react";
import type {
  Exercise,
  MuscleGroupId,
  WorkoutData,
  WorkoutSession,
} from "../../types/workout";
import { estimateWorkoutCalories } from "../../utils/energyCalculations";
import {
  deleteExerciseCascade,
  deleteWorkoutExerciseCascade,
  deleteWorkoutSet,
  ensureWorkoutSession,
  findWorkoutSessionByDate,
  getLocalDateKey,
  getPersonalBest,
  getPreviousWorkoutPerformance,
} from "../../utils/workoutLogic";
import { ExerciseList } from "./ExerciseList";
import { ExerciseTracker } from "./ExerciseTracker";
import { MuscleGroupSelector } from "./MuscleGroupSelector";
import { PersonalBest } from "./PersonalBest";
import { TodaysWorkout } from "./TodaysWorkout";
import { WorkoutHistory } from "./WorkoutHistory";
import { WorkoutSummary } from "./WorkoutSummary";

interface WorkoutDashboardProps {
  data: WorkoutData;
  bodyWeightKg?: number;
  onChange: (data: WorkoutData) => void;
}

type WorkoutView = "today" | "history";

interface SessionEditorProps {
  session: WorkoutSession | null;
  bodyWeightKg?: number;
  onSave: (details: Partial<WorkoutSession>) => void;
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function SessionEditor({ session, bodyWeightKg, onSave }: SessionEditorProps) {
  const [startTime, setStartTime] = useState(session?.startTime ?? getCurrentTime());
  const [duration, setDuration] = useState(session?.durationMinutes?.toString() ?? "");
  const [intensity, setIntensity] = useState<"light" | "moderate" | "vigorous">(
    session?.intensity ?? "moderate",
  );
  const [manualCalories, setManualCalories] = useState(
    session?.calorieEstimateMethod === "manual"
      ? session.estimatedCaloriesBurned?.toString() ?? ""
      : "",
  );
  const [notes, setNotes] = useState(session?.notes ?? "");
  const [message, setMessage] = useState("");

  const durationValue = duration === "" ? undefined : Number(duration);
  const automaticEstimate = estimateWorkoutCalories(
    bodyWeightKg,
    durationValue,
    intensity,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      durationValue !== undefined &&
      (!Number.isFinite(durationValue) || durationValue <= 0 || durationValue > 1440)
    ) {
      setMessage("训练时长需要在 1–1,440 分钟之间");
      return;
    }

    const manualValue = manualCalories === "" ? undefined : Number(manualCalories);
    if (
      manualValue !== undefined &&
      (!Number.isFinite(manualValue) || manualValue < 0 || manualValue > 5000)
    ) {
      setMessage("手动消耗需要在 0–5,000 千卡之间");
      return;
    }

    const useManual = manualValue !== undefined;
    onSave({
      startTime,
      durationMinutes: durationValue,
      intensity,
      estimatedCaloriesBurned: useManual
        ? Math.round(manualValue)
        : automaticEstimate ?? undefined,
      calorieEstimateMethod: useManual
        ? "manual"
        : automaticEstimate !== null
          ? "met"
          : undefined,
      notes: notes.trim() || undefined,
    });
    setMessage("训练信息已保存");
  }

  return (
    <section className="workout-session-editor workout-glass-panel" aria-labelledby="session-editor-heading">
      <div className="workout-section-heading">
        <div>
          <p className="workout-eyebrow">训练信息</p>
          <h2 id="session-editor-heading">时间与消耗</h2>
        </div>
        <span className="workout-estimate-chip">仅为估算</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="workout-session-fields">
          <label>
            <span>开始时间</span>
            <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </label>
          <label>
            <span>时长</span>
            <span className="session-input-with-unit">
              <input type="number" inputMode="numeric" min="1" max="1440" placeholder="60" value={duration} onChange={(event) => setDuration(event.target.value)} />
              <small>分钟</small>
            </span>
          </label>
        </div>

        <fieldset className="workout-intensity-selector">
          <legend>训练强度</legend>
          {([
            ["light", "轻度"],
            ["moderate", "中等"],
            ["vigorous", "高强度"],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" data-active={intensity === value} aria-pressed={intensity === value} onClick={() => setIntensity(value)}>{label}</button>
          ))}
        </fieldset>

        <div className="workout-calorie-estimate">
          <div>
            <span>MET 估算消耗</span>
            <strong>{automaticEstimate === null ? "资料不完整" : `约 ${automaticEstimate.toLocaleString()} 千卡`}</strong>
            <small>{bodyWeightKg ? `按当前体重 ${bodyWeightKg} kg、时长和强度估算` : "请先在身体档案中填写体重"}</small>
          </div>
          <label>
            <span>手动覆盖</span>
            <span className="session-input-with-unit">
              <input type="number" inputMode="numeric" min="0" max="5000" placeholder="可选" value={manualCalories} onChange={(event) => setManualCalories(event.target.value)} />
              <small>千卡</small>
            </span>
          </label>
        </div>

        <label className="workout-notes-field">
          <span>训练备注</span>
          <textarea rows={2} maxLength={240} placeholder="今天的状态、动作感受……" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <button className="workout-save-session" type="submit">保存训练信息</button>
        <p className="workout-form-message" role="status">{message}</p>
      </form>
    </section>
  );
}

export function WorkoutDashboard({ data, bodyWeightKg, onChange }: WorkoutDashboardProps) {
  const [view, setView] = useState<WorkoutView>("today");
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroupId>("chest");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const today = getLocalDateKey();
  const todaySession = findWorkoutSessionByDate(data, today) ?? null;

  const groupExercises = useMemo(
    () => data.exercises.filter((exercise) => exercise.muscleGroupId === selectedGroup),
    [data.exercises, selectedGroup],
  );

  const effectiveSelectedExerciseId = groupExercises.some(
    (exercise) => exercise.id === selectedExerciseId,
  )
    ? selectedExerciseId
    : groupExercises[0]?.id ?? null;
  const selectedExercise = data.exercises.find(
    (exercise) => exercise.id === effectiveSelectedExerciseId,
  ) ?? null;
  const selectedWorkoutExercise = todaySession && selectedExercise
    ? data.workoutExercises.find(
        (entry) => entry.workoutSessionId === todaySession.id && entry.exerciseId === selectedExercise.id,
      )
    : undefined;
  const currentSets = selectedWorkoutExercise
    ? data.sets.filter((set) => set.workoutExerciseId === selectedWorkoutExercise.id)
    : [];
  const previousSets = selectedExercise
    ? getPreviousWorkoutPerformance(data, selectedExercise.id, today)?.sets ?? []
    : [];
  const personalBest = selectedExercise ? getPersonalBest(data, selectedExercise.id) : null;

  function commit(nextData: WorkoutData) {
    onChange(nextData);
  }

  function ensureTodaySession(source: WorkoutData) {
    return ensureWorkoutSession(source, today, {
      createdAt: new Date().toISOString(),
      startTime: getCurrentTime(),
    });
  }

  function addExercise(name: string) {
    const exercise: Exercise = {
      id: crypto.randomUUID(),
      name,
      muscleGroupId: selectedGroup,
      createdAt: new Date().toISOString(),
    };
    commit({ ...data, exercises: [...data.exercises, exercise] });
    setSelectedExerciseId(exercise.id);
  }

  function renameExercise(exerciseId: string, name: string) {
    commit({
      ...data,
      exercises: data.exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, name } : exercise,
      ),
    });
  }

  function removeExercise(exerciseId: string) {
    const next = deleteExerciseCascade(data, exerciseId);
    commit(next);
    setSelectedExerciseId(next.exercises.find((exercise) => exercise.muscleGroupId === selectedGroup)?.id ?? null);
  }

  function addSet(weight: number, reps: number) {
    if (!selectedExercise) return;
    const ensured = ensureTodaySession(data);
    let workoutExercise = ensured.data.workoutExercises.find(
      (entry) => entry.workoutSessionId === ensured.session.id && entry.exerciseId === selectedExercise.id,
    );
    let nextData = ensured.data;
    if (!workoutExercise) {
      workoutExercise = {
        id: crypto.randomUUID(),
        workoutSessionId: ensured.session.id,
        exerciseId: selectedExercise.id,
        createdAt: new Date().toISOString(),
      };
      nextData = { ...nextData, workoutExercises: [...nextData.workoutExercises, workoutExercise] };
    }
    const setCount = nextData.sets.filter((set) => set.workoutExerciseId === workoutExercise.id).length;
    commit({
      ...nextData,
      sets: [...nextData.sets, {
        id: crypto.randomUUID(),
        workoutExerciseId: workoutExercise.id,
        setNumber: setCount + 1,
        weight,
        reps,
        createdAt: new Date().toISOString(),
      }],
    });
  }

  function updateSet(setId: string, weight: number, reps: number) {
    commit({ ...data, sets: data.sets.map((set) => set.id === setId ? { ...set, weight, reps } : set) });
  }

  function removeSet(setId: string) {
    const target = data.sets.find((set) => set.id === setId);
    if (!target) return;
    let nextData = deleteWorkoutSet(data, setId);
    if (!nextData.sets.some((set) => set.workoutExerciseId === target.workoutExerciseId)) {
      nextData = deleteWorkoutExerciseCascade(nextData, target.workoutExerciseId);
    }
    commit(nextData);
  }

  function saveSession(details: Partial<WorkoutSession>) {
    const ensured = ensureTodaySession(data);
    commit({
      ...ensured.data,
      sessions: ensured.data.sessions.map((session) =>
        session.id === ensured.session.id ? { ...session, ...details } : session,
      ),
    });
  }

  return (
    <div className="workout-dashboard tracker-view">
      <header className="workout-dashboard-header">
        <div>
          <p className="workout-eyebrow">STRENGTH</p>
          <h1>力量训练</h1>
          <p>记录每一组，也看见每一次进步。</p>
        </div>
        <span className="workout-date-chip">今天</span>
      </header>

      <div className="workout-view-switcher glass-surface" role="tablist" aria-label="训练页面">
        <button role="tab" type="button" data-active={view === "today"} aria-selected={view === "today"} onClick={() => setView("today")}>今日</button>
        <button role="tab" type="button" data-active={view === "history"} aria-selected={view === "history"} onClick={() => setView("history")}>历史</button>
      </div>

      {view === "today" ? (
        <div className="workout-today-layout" role="tabpanel" aria-label="今日训练">
          <WorkoutSummary session={todaySession} exercises={data.exercises} workoutExercises={data.workoutExercises} sets={data.sets} />
          <SessionEditor
            key={`${todaySession?.id ?? "new"}:${todaySession?.createdAt ?? ""}`}
            session={todaySession}
            bodyWeightKg={bodyWeightKg}
            onSave={saveSession}
          />
          <MuscleGroupSelector selectedGroup={selectedGroup} onSelect={setSelectedGroup} />
          <div className="workout-recording-grid">
            <ExerciseList exercises={groupExercises} selectedExerciseId={effectiveSelectedExerciseId} onSelect={setSelectedExerciseId} onAdd={addExercise} onRename={renameExercise} onDelete={removeExercise} />
            {selectedExercise ? (
              <ExerciseTracker
                exercise={selectedExercise}
                currentSets={currentSets}
                previousSets={previousSets}
                personalBest={personalBest?.bestEstimatedSet}
                onAddSet={addSet}
                onUpdateSet={updateSet}
                onDeleteSet={removeSet}
              />
            ) : (
              <div className="workout-empty-state workout-glass-panel"><span aria-hidden="true">◇</span><p>请先添加一个训练动作。</p></div>
            )}
          </div>
          <TodaysWorkout session={todaySession} exercises={data.exercises} workoutExercises={data.workoutExercises} sets={data.sets} onExerciseSelect={(exerciseId) => {
            const exercise = data.exercises.find((item) => item.id === exerciseId);
            if (exercise) setSelectedGroup(exercise.muscleGroupId);
            setSelectedExerciseId(exerciseId);
          }} />
          <PersonalBest exercise={selectedExercise} workoutExercises={data.workoutExercises} sets={data.sets} />
        </div>
      ) : (
        <div role="tabpanel" aria-label="训练历史">
          <WorkoutHistory sessions={data.sessions} exercises={data.exercises} workoutExercises={data.workoutExercises} sets={data.sets} today={today} />
        </div>
      )}
    </div>
  );
}
