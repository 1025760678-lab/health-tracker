"use client";

interface WorkoutSessionControlProps {
  exerciseName: string;
  elapsedSeconds: number;
  status: "idle" | "running" | "paused";
  completedSets: number;
  targetSets: number;
  volume: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function WorkoutSessionControl({
  exerciseName,
  elapsedSeconds,
  status,
  completedSets,
  targetSets,
  volume,
  onStart,
  onPause,
  onResume,
  onFinish,
}: WorkoutSessionControlProps) {
  const progress = Math.min(100, completedSets / Math.max(1, targetSets) * 100);

  return (
    <section className="fitness-session-control" data-status={status} aria-label="训练计时">
      <div className="fitness-session-topline">
        <span className="fitness-workout-icon" aria-hidden="true">◆</span>
        <div>
          <span>传统力量训练</span>
          <strong>{exerciseName}</strong>
        </div>
        <span className="fitness-activity-rings" aria-hidden="true"><i /><i /><i /></span>
      </div>

      {status === "idle" ? (
        <div className="fitness-session-idle">
          <div>
            <strong>{completedSets}<small> / {targetSets}</small></strong>
            <span>今日完成组数</span>
          </div>
          <button type="button" className="fitness-start-button" onClick={onStart} aria-label="开始训练">
            <span aria-hidden="true">▶</span>
          </button>
        </div>
      ) : (
        <>
          <div className="fitness-live-metrics">
            <div className="fitness-time-metric">
              <strong>{formatDuration(elapsedSeconds)}</strong>
              <span>{status === "paused" ? "训练已暂停" : "训练持续时间"}</span>
            </div>
            <div><strong>{completedSets}</strong><span>已完成组数</span></div>
            <div><strong>{volume.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}</strong><span>训练容量 kg</span></div>
          </div>
          <div className="fitness-session-actions">
            <button type="button" className="fitness-pause-button" onClick={status === "paused" ? onResume : onPause}>
              <span aria-hidden="true">{status === "paused" ? "▶" : "Ⅱ"}</span>
              {status === "paused" ? "继续" : "暂停"}
            </button>
            <button type="button" className="fitness-finish-button" onClick={onFinish}>
              <span aria-hidden="true">■</span>结束
            </button>
          </div>
        </>
      )}

      <div className="fitness-session-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
    </section>
  );
}
