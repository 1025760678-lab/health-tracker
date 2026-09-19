"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { WheelNumberInput } from "../WheelNumberInput";
import { WheelTimeInput } from "../WheelTimeInput";
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
import { RestTimer } from "./RestTimer";
import { TodaysWorkout } from "./TodaysWorkout";
import { WorkoutHistory } from "./WorkoutHistory";
import { WorkoutSessionControl } from "./WorkoutSessionControl";
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
  const startId = useId();
  const durationId = useId();
  const caloriesId = useId();
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
          <label htmlFor={startId}>
            <span>开始时间</span>
            <WheelTimeInput id={startId} value={startTime} onValueChange={setStartTime} label="训练开始时间" />
          </label>
          <label htmlFor={durationId}>
            <span>时长</span>
            <span className="session-input-with-unit">
              <WheelNumberInput id={durationId} inputMode="numeric" min={1} max={1440} placeholder="60" value={duration} onValueChange={setDuration} wheelLabel="训练时长" unit="分钟" />
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
          <label htmlFor={caloriesId}>
            <span>手动覆盖</span>
            <span className="session-input-with-unit">
              <WheelNumberInput id={caloriesId} inputMode="numeric" min={0} max={5000} placeholder="可选" value={manualCalories} onValueChange={setManualCalories} wheelLabel="手动消耗" unit="千卡" />
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
  const [restDuration, setRestDuration] = useState(60);
  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const [restPausedRemaining, setRestPausedRemaining] = useState<number | null>(null);
  const [restNow, setRestNow] = useState(() => Date.now());
  const [restFinished, setRestFinished] = useState(false);
  const [workoutStartedAt, setWorkoutStartedAt] = useState<number | null>(null);
  const [workoutPausedAt, setWorkoutPausedAt] = useState<number | null>(null);
  const [workoutPausedMs, setWorkoutPausedMs] = useState(0);
  const [workoutNow, setWorkoutNow] = useState(() => Date.now());
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
  const restRemaining = restEndAt === null ? 0 : Math.max(0, Math.ceil((restEndAt - restNow) / 1000));
  const displayedRestRemaining = restPausedRemaining ?? restRemaining;
  const workoutElapsedSeconds = workoutStartedAt === null ? 0 : Math.max(0, Math.floor(((workoutPausedAt ?? workoutNow) - workoutStartedAt - workoutPausedMs) / 1000));

  useEffect(() => {
    try {
      const storedDuration = Number(window.localStorage.getItem("workoutTracker_restDuration"));
      if ([45, 60, 90, 120].includes(storedDuration)) {
        // Restore the user's timer preference after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRestDuration(storedDuration);
      }
      const saved = JSON.parse(window.localStorage.getItem("workoutTracker_restTimer") ?? "null") as { date?: string; endAt?: number } | null;
      if (saved?.date === today && typeof saved.endAt === "number" && saved.endAt > Date.now()) {
        setRestEndAt(saved.endAt);
      }
      const activeWorkout = JSON.parse(window.localStorage.getItem("workoutTracker_activeSession") ?? "null") as { date?: string; startedAt?: number; pausedAt?: number | null; pausedMs?: number } | null;
      if (activeWorkout?.date === today && typeof activeWorkout.startedAt === "number") {
        setWorkoutStartedAt(activeWorkout.startedAt);
        setWorkoutPausedAt(typeof activeWorkout.pausedAt === "number" ? activeWorkout.pausedAt : null);
        setWorkoutPausedMs(typeof activeWorkout.pausedMs === "number" ? activeWorkout.pausedMs : 0);
      }
    } catch { /* Storage may be unavailable in private browsing. */ }
  }, [today]);

  useEffect(() => {
    if (restEndAt === null) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setRestNow(now);
      if (now >= restEndAt) {
        setRestEndAt(null);
        setRestFinished(true);
        try { window.localStorage.removeItem("workoutTracker_restTimer"); } catch { /* optional persistence */ }
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [restEndAt]);

  useEffect(() => {
    if (workoutStartedAt === null || workoutPausedAt !== null) return;
    const timer = window.setInterval(() => setWorkoutNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [workoutStartedAt, workoutPausedAt]);

  function persistWorkoutTimer(startedAt: number, pausedAt: number | null, pausedMs: number) {
    try { window.localStorage.setItem("workoutTracker_activeSession", JSON.stringify({ date: today, startedAt, pausedAt, pausedMs })); } catch { /* optional persistence */ }
  }

  function activateWorkoutTimer() {
    if (workoutStartedAt !== null) return;
    const startedAt = Date.now();
    setWorkoutStartedAt(startedAt);
    setWorkoutPausedAt(null);
    setWorkoutPausedMs(0);
    setWorkoutNow(startedAt);
    persistWorkoutTimer(startedAt, null, 0);
  }

  function startWorkout() {
    activateWorkoutTimer();
    const ensured = ensureTodaySession(data);
    commit(ensured.data);
  }

  function pauseWorkout() {
    if (workoutStartedAt === null || workoutPausedAt !== null) return;
    const pausedAt = Date.now();
    setWorkoutPausedAt(pausedAt);
    persistWorkoutTimer(workoutStartedAt, pausedAt, workoutPausedMs);
  }

  function resumeWorkout() {
    if (workoutStartedAt === null || workoutPausedAt === null) return;
    const pausedMs = workoutPausedMs + Date.now() - workoutPausedAt;
    setWorkoutPausedMs(pausedMs);
    setWorkoutPausedAt(null);
    setWorkoutNow(Date.now());
    persistWorkoutTimer(workoutStartedAt, null, pausedMs);
  }

  function finishWorkout() {
    if (workoutStartedAt === null) return;
    saveSession({ durationMinutes: Math.max(1, Math.round(workoutElapsedSeconds / 60)) });
    setWorkoutStartedAt(null);
    setWorkoutPausedAt(null);
    setWorkoutPausedMs(0);
    stopRest();
    try { window.localStorage.removeItem("workoutTracker_activeSession"); } catch { /* optional persistence */ }
  }

  function startRest(seconds = restDuration) {
    const endAt = Date.now() + seconds * 1000;
    setRestEndAt(endAt);
    setRestNow(Date.now());
    setRestFinished(false);
    setRestPausedRemaining(null);
    try { window.localStorage.setItem("workoutTracker_restTimer", JSON.stringify({ date: today, endAt })); } catch { /* optional persistence */ }
  }

  function stopRest() {
    setRestEndAt(null);
    setRestFinished(false);
    setRestPausedRemaining(null);
    try { window.localStorage.removeItem("workoutTracker_restTimer"); } catch { /* optional persistence */ }
  }

  function pauseRest() {
    if (restEndAt === null) return;
    const remaining = Math.max(1, Math.ceil((restEndAt - Date.now()) / 1000));
    setRestPausedRemaining(remaining);
    setRestEndAt(null);
    try { window.localStorage.removeItem("workoutTracker_restTimer"); } catch { /* optional persistence */ }
  }

  function resumeRest() {
    if (restPausedRemaining === null) return;
    startRest(restPausedRemaining);
  }

  function addRestTime() {
    if (restPausedRemaining !== null) {
      setRestPausedRemaining(restPausedRemaining + 15);
      return;
    }
    startRest(restRemaining + 15);
  }

  function chooseRestDuration(seconds: number) {
    setRestDuration(seconds);
    try { window.localStorage.setItem("workoutTracker_restDuration", String(seconds)); } catch { /* optional persistence */ }
  }

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
    activateWorkoutTimer();
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
    const targetSets = workoutExercise.targetSets ?? Math.max(4, previousSets.length);
    if (setCount + 1 < targetSets) startRest();
    else stopRest();
  }

  function updateWorkoutPlan(patch: { targetSets?: number; effort?: "easy" | "normal" | "hard"; notes?: string }) {
    if (!selectedExercise) return;
    const ensured = ensureTodaySession(data);
    const entry = ensured.data.workoutExercises.find(
      (item) => item.workoutSessionId === ensured.session.id && item.exerciseId === selectedExercise.id,
    );
    if (entry) {
      commit({ ...ensured.data, workoutExercises: ensured.data.workoutExercises.map((item) =>
        item.id === entry.id ? { ...item, ...patch } : item,
      ) });
      return;
    }
    commit({ ...ensured.data, workoutExercises: [...ensured.data.workoutExercises, {
      id: crypto.randomUUID(), workoutSessionId: ensured.session.id, exerciseId: selectedExercise.id,
      createdAt: new Date().toISOString(), ...patch,
    }] });
  }

  function updateSet(setId: string, weight: number, reps: number) {
    commit({ ...data, sets: data.sets.map((set) => set.id === setId ? { ...set, weight, reps } : set) });
  }

  function removeSet(setId: string) {
    const target = data.sets.find((set) => set.id === setId);
    if (!target) return;
    let nextData = deleteWorkoutSet(data, setId);
    const entry = nextData.workoutExercises.find((item) => item.id === target.workoutExerciseId);
    if (!nextData.sets.some((set) => set.workoutExerciseId === target.workoutExerciseId) &&
      !entry?.targetSets && !entry?.effort && !entry?.notes) {
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
                workoutExercise={selectedWorkoutExercise}
                currentSets={currentSets}
                previousSets={previousSets}
                personalBest={personalBest?.bestEstimatedSet}
                onAddSet={addSet}
                onUpdateSet={updateSet}
                onDeleteSet={removeSet}
                onUpdatePlan={updateWorkoutPlan}
                sessionControl={<WorkoutSessionControl exerciseName={selectedExercise.name} elapsedSeconds={workoutElapsedSeconds}
                  status={workoutStartedAt === null ? "idle" : workoutPausedAt === null ? "running" : "paused"}
                  completedSets={currentSets.length} targetSets={Math.max(currentSets.length, selectedWorkoutExercise?.targetSets ?? Math.max(4, previousSets.length))}
                  volume={currentSets.reduce((total, set) => total + set.weight * set.reps, 0)} onStart={startWorkout}
                  onPause={pauseWorkout} onResume={resumeWorkout} onFinish={finishWorkout} />}
                restTimer={<RestTimer duration={restDuration} remaining={displayedRestRemaining} active={restEndAt !== null}
                  paused={restPausedRemaining !== null}
                  finished={restFinished} onDurationChange={chooseRestDuration} onStart={() => startRest()}
                  onStop={stopRest} onPause={pauseRest} onResume={resumeRest} onAddTime={addRestTime} />}
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
