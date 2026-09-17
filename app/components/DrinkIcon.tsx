import type { DrinkType } from "../types/water";

interface DrinkIconProps {
  type: DrinkType;
  className?: string;
}

export function DrinkIcon({ type, className }: DrinkIconProps) {
  const common = {
    className,
    width: 28,
    height: 28,
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  if (type === "coffee") {
    return <svg {...common}><path d="M5 10h18v10a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7V10Z" /><path d="M23 12h2a4 4 0 0 1 0 8h-2M9 5c0 2 2 2 2 4M16 5c0 2 2 2 2 4" /><path d="M4 29h23" /></svg>;
  }

  if (type === "milk") {
    return <svg {...common}><path d="M11 4h10l-1 5 3 4v15H9V13l3-4-1-5Z" /><path d="M12 9h8M9 15h14M13 21c1.3 1.4 4.7 1.4 6 0" /></svg>;
  }

  return <svg {...common}><path d="M16 3C12 9 7 14 7 20a9 9 0 0 0 18 0c0-6-5-11-9-17Z" /><path d="M11 21a5 5 0 0 0 5 5" /></svg>;
}
