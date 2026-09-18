"use client";

import { useEffect, useRef } from "react";

interface WheelTimeInputProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  className?: string;
}

function TimeColumn({ name, value, max, onChange }: { name: string; value: number; max: number; onChange: (value: number) => void }) {
  const touchStart = useRef<number | null>(null);
  const wheelRemainder = useRef(0);
  const wheelElement = useRef<HTMLSpanElement>(null);
  const at = (offset: number) => (value + offset + max + 1) % (max + 1);
  const display = (offset: number) => String(at(offset)).padStart(2, "0");

  function move(amount: number) {
    if (amount !== 0) onChange(at(amount));
  }

  useEffect(() => {
    const element = wheelElement.current;
    if (!element) return;
    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      wheelRemainder.current += event.deltaY;
      const increments = Math.trunc(wheelRemainder.current / 35);
      if (increments !== 0) {
        onChange((((value + increments) % (max + 1)) + max + 1) % (max + 1));
        wheelRemainder.current -= increments * 35;
      }
    }
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [max, onChange, value]);

  return (
    <span
      ref={wheelElement}
      className="wheel-time-column"
      role="spinbutton"
      tabIndex={0}
      aria-label={name}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={display(0)}
      onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientY ?? null; }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const travel = touchStart.current - (event.changedTouches[0]?.clientY ?? touchStart.current);
        if (Math.abs(travel) > 8) move(Math.sign(travel) * Math.max(1, Math.round(Math.abs(travel) / 24)));
        touchStart.current = null;
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault(); move(event.key === "ArrowDown" ? 1 : -1);
        }
        if (event.key === "Home") { event.preventDefault(); onChange(0); }
        if (event.key === "End") { event.preventDefault(); onChange(max); }
      }}
      onClick={(event) => { event.preventDefault(); event.currentTarget.focus(); }}
    >
      <span className="wheel-time-neighbor" onClick={(event) => { event.preventDefault(); move(-1); }} aria-hidden="true">{display(-1)}</span>
      <strong className="wheel-time-current" aria-hidden="true">{display(0)}</strong>
      <span className="wheel-time-neighbor" onClick={(event) => { event.preventDefault(); move(1); }} aria-hidden="true">{display(1)}</span>
    </span>
  );
}

export function WheelTimeInput({ id, value, onValueChange, label, className = "" }: WheelTimeInputProps) {
  const [hour, minute] = value.split(":").map(Number);
  const hours = Number.isInteger(hour) && hour >= 0 && hour < 24 ? hour : 0;
  const minutes = Number.isInteger(minute) && minute >= 0 && minute < 60 ? minute : 0;
  const format = (number: number) => String(number).padStart(2, "0");

  return (
    <span className={`wheel-time-field ${className}`} role="group" aria-label={label}>
      <input id={id} className="sr-only" type="text" readOnly value={value} tabIndex={-1} aria-hidden="true" />
      <TimeColumn name={`${label}，小时`} value={hours} max={23} onChange={(next) => onValueChange(`${format(next)}:${format(minutes)}`)} />
      <span className="wheel-time-colon" aria-hidden="true">:</span>
      <TimeColumn name={`${label}，分钟`} value={minutes} max={59} onChange={(next) => onValueChange(`${format(hours)}:${format(next)}`)} />
    </span>
  );
}
