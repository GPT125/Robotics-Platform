import type { LucideIcon } from 'lucide-react';

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'cyan',
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: 'cyan' | 'blue' | 'orange' | 'green' | 'red';
}) {
  const toneClass = {
    cyan: 'text-electric bg-electric/10 border-electric/30',
    blue: 'text-primary bg-primary/10 border-primary/30',
    orange: 'text-vex bg-vex/10 border-vex/30',
    green: 'text-good bg-good/10 border-good/30',
    red: 'text-bad bg-bad/10 border-bad/30',
  }[tone];

  return (
    <section className="panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${toneClass}`}>
          <Icon size={19} />
        </div>
      </div>
      <p className="mt-3 text-sm leading-5 text-slate-400">{detail}</p>
    </section>
  );
}
