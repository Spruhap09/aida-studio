import type { Pattern } from "@/lib/types";

export function PaletteLegend({ pattern }: { pattern: Pattern }) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-card">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Legend & shopping list</h2>
          <p className="text-sm text-ink/60">
            {pattern.width}×{pattern.height} on {pattern.aida_count}-count · {pattern.size_inches[0]}×
            {pattern.size_inches[1]} in · {pattern.difficulty.level} ({pattern.difficulty.score}/100) · ~
            {pattern.difficulty.estimated_hours}h
          </p>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {pattern.skeins.map((floss) => (
          <li key={floss.code} className="flex items-center gap-3 rounded-xl bg-mist px-3 py-2">
            <span className="h-8 w-8 rounded-md border border-ink/10" style={{ background: floss.hex }} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {floss.symbol} · DMC {floss.code}
              </p>
              <p className="truncate text-xs text-ink/60">
                {floss.name} · {floss.count} stitches · {floss.skeins} skein
                {floss.skeins === 1 ? "" : "s"}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink/50">
        Screen-to-thread matching uses CIELAB + CIEDE2000. Always check a physical shade card for colors that
        matter.
      </p>
    </section>
  );
}
