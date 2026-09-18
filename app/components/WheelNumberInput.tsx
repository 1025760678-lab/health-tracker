"use client";

import { useEffect, useRef, type InputHTMLAttributes } from "react";

type WheelNumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "min" | "max" | "step"> & {
  value: string | number;
  onValueChange: (value: string) => void;
  min: number;
  max: number;
  step?: number;
  wheelLabel?: string;
  unit?: string;
};

export function WheelNumberInput({
  value, onValueChange, min, max, step = 1, wheelLabel, unit, className = "", inputMode, onBlur,
  ...inputProps
}: WheelNumberInputProps) {
  const touchStart = useRef<number | null>(null);
  const wheelRemainder = useRef(0);
  const wheelElement = useRef<HTMLSpanElement>(null);
  const decimals = (String(step).split(".")[1] ?? "").length;
  const count = Math.max(0, Math.floor((max - min) / step + 0.000001));
  const parsed = Number(value);
  const currentIndex = value === "" || !Number.isFinite(parsed)
    ? 0
    : Math.min(count, Math.max(0, Math.round((parsed - min) / step)));
  const at = (index: number) => (min + index * step).toFixed(decimals);

  function move(steps: number) {
    const nextIndex = Math.min(count, Math.max(0, currentIndex + steps));
    if (nextIndex !== currentIndex || value === "") onValueChange(at(nextIndex));
  }

  useEffect(() => {
    const element = wheelElement.current;
    if (!element) return;
    function handleWheel(event: globalThis.WheelEvent) {
      event.preventDefault();
      wheelRemainder.current += event.deltaY;
      const increments = Math.trunc(wheelRemainder.current / 35);
      if (increments !== 0) {
        const nextIndex = Math.min(count, Math.max(0, currentIndex + increments));
        if (nextIndex !== currentIndex || value === "") {
          onValueChange((min + nextIndex * step).toFixed(decimals));
        }
        wheelRemainder.current -= increments * 35;
      }
    }
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [count, currentIndex, decimals, min, onValueChange, step, value]);

  return (
    <span className="wheel-number-field">
      <input
        {...inputProps}
        className={className}
        aria-label={inputProps["aria-label"] ?? wheelLabel}
        type="text"
        inputMode={inputMode ?? (decimals ? "decimal" : "numeric")}
        pattern={decimals ? "[0-9]+([.][0-9]+)?" : "[0-9]+"}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (/^\d*(?:\.\d*)?$/.test(next)) onValueChange(next);
        }}
        onBlur={(event) => {
          const number = Number(event.target.value);
          if (event.target.value !== "" && Number.isFinite(number) && (number < min || number > max)) {
            onValueChange(String(Math.max(min, Math.min(max, number))));
          }
          onBlur?.(event);
        }}
      />
      <span
        ref={wheelElement}
        className="wheel-number-inline"
        role="spinbutton"
        tabIndex={0}
        aria-label={`${wheelLabel ?? inputProps["aria-label"] ?? "数值"}滚轮${unit ? `，${unit}` : ""}`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number(at(currentIndex))}
        aria-valuetext={`${at(currentIndex)} ${unit ?? ""}`}
        onClick={(event) => { event.preventDefault(); event.currentTarget.focus(); }}
        onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientY ?? null; }}
        onTouchEnd={(event) => {
          if (touchStart.current === null) return;
          const travel = touchStart.current - (event.changedTouches[0]?.clientY ?? touchStart.current);
          if (Math.abs(travel) > 8) move(Math.sign(travel) * Math.max(1, Math.round(Math.abs(travel) / 24)));
          touchStart.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); move(event.key === "ArrowDown" ? 1 : -1);
          }
          if (event.key === "PageDown" || event.key === "PageUp") {
            event.preventDefault(); move(event.key === "PageDown" ? 10 : -10);
          }
          if (event.key === "Home") { event.preventDefault(); onValueChange(at(0)); }
          if (event.key === "End") { event.preventDefault(); onValueChange(at(count)); }
        }}
      >
        <span className="wheel-number-neighbor" onClick={(event) => { event.preventDefault(); move(-1); }} aria-hidden="true">{currentIndex > 0 ? at(currentIndex - 1) : "·"}</span>
        <span className="wheel-number-current" aria-hidden="true">{value === "" ? "—" : at(currentIndex)}</span>
        <span className="wheel-number-neighbor" onClick={(event) => { event.preventDefault(); move(1); }} aria-hidden="true">{currentIndex < count ? at(currentIndex + 1) : "·"}</span>
      </span>
    </span>
  );
}
