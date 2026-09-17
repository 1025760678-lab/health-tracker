export type DrinkType = "water" | "milk" | "coffee";
export type CoffeeType =
  | "americano"
  | "latte"
  | "luckin-coconut-latte"
  | "luckin-gold-roast-americano"
  | "guming-fresh-milk-latte";

export const COFFEE_TYPE_NAMES: Record<CoffeeType, string> = {
  americano: "美式咖啡",
  latte: "拿铁咖啡",
  "luckin-coconut-latte": "瑞幸 · 生椰拿铁",
  "luckin-gold-roast-americano": "瑞幸 · 金烘美式",
  "guming-fresh-milk-latte": "古茗 · 鲜奶拿铁",
};

export interface DrinkEntry {
  amount: number;
  drinkType: DrinkType;
  coffeeType?: CoffeeType;
  calories?: number;
  /** Measured caffeine amount for this serving, when supplied by the user. */
  caffeineMg?: number;
}

export interface WaterRecord extends DrinkEntry {
  id: string;
  timestamp: string;
  date: string;
}
