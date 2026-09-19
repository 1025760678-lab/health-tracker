"use client";

import type { CSSProperties } from "react";

interface RestTimerProps {
  duration: number;
  remaining: number;
  active: boolean;
  paused: boolean;
  finished: boolean;
  onDurationChange: (seconds: number) => void;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onAddTime: () => void;
}

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function RestTimer({ duration, remaining, active, paused, finished, onDurationChange, onStart, onStop, onPause, onResume, onAddTime }: RestTimerProps) {
  const progress = active || paused ? Math.min(100, Math.max(0, remaining / duration * 100)) : 0;
  const ringStyle = { "--rest-progress": `${progress}%` } as CSSProperties;

  return (
    <section className="workout-rest-timer" data-active={active || paused} aria-labelledby="workout-rest-title">
      <div className="workout-rest-copy">
        <p className="workout-eyebrow">REST TIMER</p>
        <h3 id="workout-rest-title">组间休息</h3>
        <p role="status">{active ? "休息中，准备下一组" : paused ? "休息计时已暂停" : finished ? "休息完成，可以开始下一组" : "完成一组后自动开始"}</p>
        <div className="workout-rest-presets" aria-label="选择休息时长">
          {[45, 60, 90, 120].map((seconds) => (
            <button key={seconds} type="button" data-active={duration === seconds} aria-pressed={duration === seconds}
              onClick={() => onDurationChange(seconds)}>{seconds % 60 ? `${seconds} 秒` : `${seconds / 60} 分钟`}</button>
          ))}
        </div>
      </div>
      <div className="workout-rest-controls">
        <div className="workout-rest-ring" style={ringStyle} role="timer" aria-label={`剩余休息时间 ${formatTime(active || paused ? remaining : finished ? 0 : duration)}`}>
          <span><strong>{formatTime(active || paused ? remaining : finished ? 0 : duration)}</strong><small>{active ? "剩余" : paused ? "已暂停" : finished ? "完成" : "待开始"}</small></span>
        </div>
        <div className="workout-rest-actions">
          {active || paused ? (
            <>
              <button type="button" className="rest-primary-action" onClick={paused ? onResume : onPause}>{paused ? "▶ 继续" : "Ⅱ 暂停"}</button>
              <button type="button" onClick={onAddTime}>+15 秒</button>
              <button type="button" onClick={onStop}>跳过</button>
            </>
          ) : <button className="rest-primary-action" type="button" onClick={onStart}>▶ 开始休息</button>}
        </div>
      </div>
    </section>
  );
}
