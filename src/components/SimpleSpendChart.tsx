import { formatZAR } from "@/lib/currency";

export function SimpleSpendChart({ data }: { data: { month: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="flex items-end justify-between gap-2 h-36 pt-2">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <span className="text-[10px] text-muted truncate w-full text-center">
            {d.total > 0 ? formatZAR(d.total) : ""}
          </span>
          <div
            className="w-full max-w-10 mx-auto chart-bar"
            style={{ height: `${Math.max(4, (d.total / max) * 100)}%`, minHeight: d.total > 0 ? 8 : 4 }}
            title={formatZAR(d.total)}
          />
          <span className="text-[11px] font-medium text-muted">{d.month}</span>
        </div>
      ))}
    </div>
  );
}
