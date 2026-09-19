import type {
  Exercise,
  MuscleGroupId,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from "../../types/workout";

export interface TodaysWorkoutProps {
  session: WorkoutSession | null;
  exercises: Exercise[];
  workoutExercises: WorkoutExercise[];
  sets: WorkoutSet[];
  onExerciseSelect?: (exerciseId: string) => void;
}

const MUSCLE_GROUPS: ReadonlyArray<{ id: MuscleGroupId; label: string }> = [
  { id: "chest", label: "胸部" },
  { id: "back", label: "背部" },
  { id: "shoulders", label: "肩部" },
  { id: "biceps", label: "二头肌" },
  { id: "triceps", label: "三头肌" },
];

function formatWeight(weight: number) {
  return weight.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

export function TodaysWorkout({
  session,
  exercises,
  workoutExercises,
  sets,
  onExerciseSelect,
}: TodaysWorkoutProps) {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const todayExercises = session
    ? workoutExercises
        .filter((item) => item.workoutSessionId === session.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : [];

  const groups = MUSCLE_GROUPS.map((group) => ({
    ...group,
    items: todayExercises
      .filter((item) => exerciseById.get(item.exerciseId)?.muscleGroupId === group.id)
      .map((item) => ({
        workoutExercise: item,
        exercise: exerciseById.get(item.exerciseId)!,
        sets: sets
          .filter((set) => set.workoutExerciseId === item.id)
          .sort((a, b) => a.setNumber - b.setNumber),
      })),
  })).filter((group) => group.items.length > 0);

  return (
    <section
      className="workout-panel workout-glass-panel todays-workout"
      aria-labelledby="todays-workout-heading"
    >
      <header className="workout-section-heading">
        <div>
          <p className="workout-eyebrow">实时记录</p>
          <h2 id="todays-workout-heading">今日训练</h2>
        </div>
        <span className="workout-section-count">
          {todayExercises.length} 个动作
        </span>
      </header>

      {groups.length > 0 ? (
        <ul className="today-workout-groups" aria-label="今日已训练的肌群">
          {groups.map((group) => (
            <li className="today-workout-group" key={group.id} data-muscle-group={group.id}>
              <h3>
                <span className="workout-muscle-dot" aria-hidden="true" />
                {group.label}
              </h3>
              <ul className="today-workout-exercises">
                {group.items.map(({ workoutExercise, exercise, sets: exerciseSets }) => (
                  <li className="today-workout-exercise" key={workoutExercise.id}>
                    {onExerciseSelect ? (
                      <button
                        className="today-workout-exercise-button"
                        type="button"
                        onClick={() => onExerciseSelect(exercise.id)}
                        aria-label={`查看 ${exercise.name} 的训练记录`}
                      >
                        <strong>{exercise.name}</strong>
                        <span aria-hidden="true">›</span>
                      </button>
                    ) : (
                      <strong className="today-workout-exercise-name">{exercise.name}</strong>
                    )}

                    <div className="today-workout-visual">
                      <span>{exerciseSets.length} / {Math.max(exerciseSets.length, workoutExercise.targetSets ?? 4)} 组完成</span>
                      <span>{exerciseSets.reduce((total, set) => total + set.weight * set.reps, 0).toLocaleString("zh-CN", { maximumFractionDigits: 1 })} kg 容量</span>
                      {workoutExercise.effort && <span>{workoutExercise.effort === "easy" ? "轻松" : workoutExercise.effort === "normal" ? "正常" : "吃力"}</span>}
                    </div>
                    <div className="today-workout-dots" aria-hidden="true">
                      {Array.from({ length: Math.max(exerciseSets.length, workoutExercise.targetSets ?? 4) }, (_, index) => <i key={index} data-done={index < exerciseSets.length} />)}
                    </div>

                    {exerciseSets.length > 0 ? (
                      <ol className="today-workout-sets" aria-label={`${exercise.name} 的组数`}>
                        {exerciseSets.map((set) => (
                          <li key={set.id}>
                            <span>第 {set.setNumber} 组</span>
                            <strong>
                              {formatWeight(set.weight)} kg <span aria-hidden="true">×</span>{" "}
                              {set.reps} 次
                            </strong>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="workout-empty-inline">尚未记录组数</p>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <div className="workout-empty-state">
          <span aria-hidden="true">◌</span>
          <p>今天还没有训练记录。</p>
          <small>选择肌群和动作，开始记录第一组。</small>
        </div>
      )}
    </section>
  );
}
