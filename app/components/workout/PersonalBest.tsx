import type {
  Exercise,
  WorkoutExercise,
  WorkoutSet,
} from "../../types/workout";

export interface PersonalBestProps {
  exercise: Exercise | null;
  workoutExercises: WorkoutExercise[];
  sets: WorkoutSet[];
}

function formatWeight(weight: number) {
  return weight.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}

function estimateOneRepMax(set: WorkoutSet) {
  return set.weight * (1 + set.reps / 30);
}

export function PersonalBest({
  exercise,
  workoutExercises,
  sets,
}: PersonalBestProps) {
  const matchingWorkoutExerciseIds = new Set(
    workoutExercises
      .filter((item) => item.exerciseId === exercise?.id)
      .map((item) => item.id),
  );
  const validSets = sets.filter(
    (set) =>
      matchingWorkoutExerciseIds.has(set.workoutExerciseId) &&
      Number.isFinite(set.weight) &&
      Number.isFinite(set.reps) &&
      set.weight >= 0 &&
      set.reps > 0,
  );

  const heaviestSet = validSets.reduce<WorkoutSet | null>((best, set) => {
    if (!best || set.weight > best.weight) return set;
    if (set.weight === best.weight && set.reps > best.reps) return set;
    return best;
  }, null);

  const bestEstimatedSet = validSets.reduce<WorkoutSet | null>((best, set) => {
    if (!best || estimateOneRepMax(set) > estimateOneRepMax(best)) return set;
    return best;
  }, null);

  return (
    <section
      className="workout-panel workout-glass-panel personal-best"
      aria-labelledby="personal-best-heading"
    >
      <header className="workout-section-heading">
        <div>
          <p className="workout-eyebrow">个人纪录</p>
          <h2 id="personal-best-heading">最佳表现</h2>
        </div>
        <span className="personal-best-trophy" aria-hidden="true">◇</span>
      </header>

      {exercise && heaviestSet && bestEstimatedSet ? (
        <>
          <p className="personal-best-exercise">{exercise.name}</p>
          <dl className="personal-best-grid">
            <div className="personal-best-card personal-best-card-weight">
              <dt>
                <span aria-hidden="true">↑</span>
                最重重量
              </dt>
              <dd>
                <strong>
                  {formatWeight(heaviestSet.weight)} <small>kg</small>
                </strong>
                <span>对应组：{formatWeight(heaviestSet.weight)} kg × {heaviestSet.reps} 次</span>
              </dd>
            </div>
            <div className="personal-best-card personal-best-card-estimate">
              <dt>
                <span aria-hidden="true">◆</span>
                最佳估算表现
              </dt>
              <dd>
                <strong>
                  {formatWeight(estimateOneRepMax(bestEstimatedSet))} <small>kg e1RM</small>
                </strong>
                <span>
                  最佳组：{formatWeight(bestEstimatedSet.weight)} kg ×{" "}
                  {bestEstimatedSet.reps} 次
                </span>
              </dd>
            </div>
          </dl>
          <small className="personal-best-note">
            估算最大重量基于已记录的重量和次数计算，仅作为训练参考。
          </small>
        </>
      ) : (
        <div className="workout-empty-state">
          <span aria-hidden="true">◇</span>
          <p>{exercise ? "还没有可计算的训练组。" : "请先选择一个动作。"}</p>
          <small>完成第一组后，这里会自动显示你的个人最佳。</small>
        </div>
      )}
    </section>
  );
}
