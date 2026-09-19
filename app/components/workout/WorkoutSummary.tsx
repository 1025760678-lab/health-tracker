import type {
  Exercise,
  MuscleGroupId,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from "../../types/workout";

export interface WorkoutSummaryProps {
  session: WorkoutSession | null;
  exercises: Exercise[];
  workoutExercises: WorkoutExercise[];
  sets: WorkoutSet[];
}

const MUSCLE_GROUPS: ReadonlyArray<{ id: MuscleGroupId; label: string }> = [
  { id: "chest", label: "胸部" },
  { id: "back", label: "背部" },
  { id: "shoulders", label: "肩部" },
  { id: "biceps", label: "二头肌" },
  { id: "triceps", label: "三头肌" },
];

function formatNumber(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString("zh-CN", { maximumFractionDigits });
}

export function WorkoutSummary({
  session,
  exercises,
  workoutExercises,
  sets,
}: WorkoutSummaryProps) {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const sessionExercises = session
    ? workoutExercises.filter((item) => item.workoutSessionId === session.id)
    : [];
  const sessionExerciseIds = new Set(sessionExercises.map((item) => item.id));
  const sessionSets = sets.filter((set) => sessionExerciseIds.has(set.workoutExerciseId));

  const totalExercises = new Set(sessionExercises.map((item) => item.exerciseId)).size;
  const totalReps = sessionSets.reduce((sum, set) => sum + set.reps, 0);
  const totalVolume = sessionSets.reduce(
    (sum, set) => sum + set.weight * set.reps,
    0,
  );
  const plannedSets = sessionExercises.reduce((total, item) => {
    const completed = sessionSets.filter((set) => set.workoutExerciseId === item.id).length;
    return total + Math.max(completed, item.targetSets ?? 4);
  }, 0);
  const sessionDetails = session
    ? [
        session.startTime ? `${session.startTime} 开始` : null,
        session.durationMinutes !== undefined
          ? `${formatNumber(session.durationMinutes)} 分钟`
          : null,
        session.estimatedCaloriesBurned !== undefined
          ? `约 ${formatNumber(session.estimatedCaloriesBurned)} 千卡`
          : null,
      ].filter((detail): detail is string => detail !== null)
    : [];

  const groupTotals = MUSCLE_GROUPS.map((group) => {
    const groupExercises = sessionExercises.filter(
      (item) => exerciseById.get(item.exerciseId)?.muscleGroupId === group.id,
    );
    const workoutExerciseIds = new Set(groupExercises.map((item) => item.id));

    return {
      ...group,
      exerciseCount: new Set(groupExercises.map((item) => item.exerciseId)).size,
      setCount: sessionSets.filter((set) => workoutExerciseIds.has(set.workoutExerciseId)).length,
    };
  }).filter((group) => group.exerciseCount > 0 || group.setCount > 0);

  return (
    <section
      className="workout-panel workout-glass-panel workout-summary"
      aria-labelledby="workout-summary-heading"
    >
      <header className="workout-section-heading">
        <div>
          <p className="workout-eyebrow">今日数据</p>
          <h2 id="workout-summary-heading">训练概览</h2>
        </div>
        <span className="workout-summary-status" aria-label={session ? "今日已开始训练" : "今日尚未训练"}>
          {session ? "进行中" : "待开始"}
        </span>
      </header>

      {sessionDetails.length > 0 ? (
        <ul className="workout-session-metrics" aria-label="今日训练时间与消耗">
          {sessionDetails.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}

      <dl className="workout-summary-totals">
        <div className="workout-summary-stat workout-summary-stat-primary">
          <dt>动作</dt>
          <dd>{formatNumber(totalExercises)}</dd>
        </div>
        <div className="workout-summary-stat">
          <dt>总组数</dt>
          <dd>{formatNumber(sessionSets.length)}</dd>
        </div>
        <div className="workout-summary-stat">
          <dt>总次数</dt>
          <dd>{formatNumber(totalReps)}</dd>
        </div>
        <div className="workout-summary-stat">
          <dt>总容量</dt>
          <dd>
            {formatNumber(totalVolume, 1)} <small>kg</small>
          </dd>
        </div>
      </dl>

      {plannedSets > 0 && (
        <div className="workout-overall-progress">
          <div><strong>今日组数进度</strong><span>{sessionSets.length} / {plannedSets} 组</span></div>
          <div className="workout-overall-track" role="progressbar" aria-label="今日训练组数进度" aria-valuemin={0} aria-valuemax={plannedSets} aria-valuenow={sessionSets.length}>
            <span style={{ width: `${Math.min(100, sessionSets.length / plannedSets * 100)}%` }} />
          </div>
        </div>
      )}

      {groupTotals.length > 0 ? (
        <ul className="workout-summary-groups" aria-label="各肌群训练统计">
          {groupTotals.map((group) => (
            <li className="workout-summary-group" key={group.id} data-muscle-group={group.id}>
              <span className="workout-muscle-dot" aria-hidden="true" />
              <strong>{group.label}</strong>
              <span>{group.exerciseCount} 个动作</span>
              <span>{group.setCount} 组</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="workout-empty-copy">记录第一组后，这里会显示今日训练统计。</p>
      )}
    </section>
  );
}
