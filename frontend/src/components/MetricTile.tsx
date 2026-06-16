import type { LucideIcon } from "lucide-react";

interface MetricTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "teal" | "amber" | "rose" | "violet";
}

const toneClasses: Record<NonNullable<MetricTileProps["tone"]>, string> = {
  teal: "border-teal-300/15 bg-teal-300/8 text-teal-100",
  amber: "border-amber-300/15 bg-amber-300/8 text-amber-100",
  rose: "border-rose-300/15 bg-rose-300/8 text-rose-100",
  violet: "border-violet-300/15 bg-violet-300/8 text-violet-100",
};

export function MetricTile({
  icon: Icon,
  label,
  value,
  tone = "teal",
}: MetricTileProps) {
  return (
    <div className={`rounded-md border p-4 ${toneClasses[tone]}`}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-current/15 bg-black/10">
        <Icon aria-hidden="true" className="h-4 w-4" />
      </div>
      <p className="text-2xl font-semibold leading-none text-stone-50">
        {value}
      </p>
      <p className="mt-2 text-sm text-stone-300">{label}</p>
    </div>
  );
}
