import { useCountUp } from '../hooks/useInView';
import { TrendingDown, Clock, ThumbsUp, HeadphonesIcon } from 'lucide-react';

const stats = [
  { icon: TrendingDown, value: 80, suffix: '%', label: 'Menos mensajes en WhatsApp', color: 'text-cyan-400' },
  { icon: Clock, value: 48, suffix: 'h', label: 'Implementación completa', color: 'text-amber-400' },
  { icon: ThumbsUp, value: 95, suffix: '%', label: 'Satisfacción del abonado', color: 'text-emerald-400' },
  { icon: HeadphonesIcon, value: 24, suffix: '/7', label: 'Disponibilidad del portal', color: 'text-fuchsia-400' },
];

export function StatsBar() {
  return (
    <section className="py-12 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 via-transparent to-fuchsia-500/5" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatItem({ icon: Icon, value, suffix, label, color }: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  suffix: string;
  label: string;
  color: string;
}) {
  const { count, ref } = useCountUp(value);

  return (
    <div ref={ref} className="glass rounded-2xl p-6 text-center hover:border-cyan-400/20 transition-all group">
      <Icon className={`w-7 h-7 ${color} mx-auto mb-3 group-hover:scale-110 transition-transform`} />
      <div className={`text-3xl sm:text-4xl font-display font-900 ${color} mb-1`}>
        {count}{suffix}
      </div>
      <div className="text-slate-500 text-sm font-medium">{label}</div>
    </div>
  );
}
