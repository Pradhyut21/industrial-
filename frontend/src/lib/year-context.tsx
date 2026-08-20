import { createContext, useContext, useState, type ReactNode } from "react";

interface YearCtx {
  year: number;
  setYear: (y: number) => void;
}

const Ctx = createContext<YearCtx | null>(null);

export function YearProvider({ children }: { children: ReactNode }) {
  const [year, setYearState] = useState(2026);
  const setYear = (y: number) => {
    setYearState(y);
  };
  return <Ctx.Provider value={{ year, setYear }}>{children}</Ctx.Provider>;
}

export function useYear() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useYear must be used within YearProvider");
  return v;
}

export function colorForNode(activeOwnerCount: number): "green" | "yellow" | "red" {
  if (activeOwnerCount >= 2) return "green";
  if (activeOwnerCount >= 1) return "yellow";
  return "red";
}
