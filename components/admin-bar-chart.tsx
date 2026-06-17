// Dependency-free bar chart (server-renderable). Hover a bar for the day + value.
export function AdminBarChart({
  title,
  total,
  days,
  data,
  format,
}: {
  title: string;
  total: string;
  days: string[];
  data: number[];
  format: (n: number) => string;
}) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-card ring-1 ring-white/60">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs font-medium text-primary">{total}</span>
      </div>
      <div className="flex h-40 items-end gap-[3px]">
        {data.map((v, i) => (
          <div
            key={days[i]}
            title={`${days[i]}: ${format(v)}`}
            className="flex-1 rounded-t bg-primary/70 transition hover:bg-primary"
            style={{ height: `${Math.max(v > 0 ? 3 : 0, Math.round((v / max) * 100))}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{days[0]?.slice(5)}</span>
        <span>{days[Math.floor(days.length / 2)]?.slice(5)}</span>
        <span>{days[days.length - 1]?.slice(5)}</span>
      </div>
    </div>
  );
}
