import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useYear } from "@/lib/year-context";
import { Slider } from "@/components/ui/slider";

function formatCrore(rupees: number) {
  const crore = rupees / 10_000_000;
  return crore >= 1 ? `₹${crore.toFixed(2)} Cr` : `₹${(rupees / 100_000).toFixed(2)} L`;
}

export function YearExposureBar() {
  const { year, setYear } = useYear();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["vulnerability-map"],
    queryFn: api.vulnerabilityMap,
    staleTime: 60_000,
  });

  const redExposure = (data ?? [])
    .filter((n) => (n.active_engineers ?? []).filter((e) => e.retirement_year >= year).length === 0)
    .reduce((sum, n) => sum + n.downtime_cost, 0);

  return (
    <div className="flex items-center gap-6 px-4 py-2 border-b border-border bg-sidebar/60 backdrop-blur">
      <div className="flex items-center gap-3 min-w-[18rem] flex-1 max-w-2xl">
        <span className="section-label whitespace-nowrap">Simulation Year</span>
        <Slider
          min={2026}
          max={2036}
          step={1}
          value={[year]}
          onValueChange={(v) => setYear(v[0] ?? 2026)}
          className="flex-1"
          aria-label="Simulation Year Slider"
        />
        <span
          key={year}
          className="font-counter text-primary text-lg tabular-nums w-14 text-right rounded-full px-1 animate-scrub-pulse"
        >
          {year}
        </span>
      </div>
      <div className="flex flex-col items-end leading-none">
        <span className="section-label">Exposure Loss</span>
        {isLoading ? (
          <span className="text-muted-foreground text-sm">…</span>
        ) : isError ? (
          <span className="text-destructive text-xs uppercase">backend offline</span>
        ) : (
          <span className="rupee-counter text-2xl">{formatCrore(redExposure)}</span>
        )}
      </div>
    </div>
  );
}
