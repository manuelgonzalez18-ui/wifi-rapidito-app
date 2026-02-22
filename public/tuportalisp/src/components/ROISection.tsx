import { useState } from 'react';
import { useInView } from '../hooks/useInView';
import { Calculator, TrendingUp, Clock, DollarSign, Users } from 'lucide-react';

export function ROISection() {
  const { ref, isInView } = useInView(0.1);
  const [clients, setClients] = useState(200);

  // Estimaciones
  const messagesPerDay = Math.round(clients * 0.15); // 15% contactan por día
  const minutesPerMessage = 3;
  const hoursWasted = Math.round((messagesPerDay * minutesPerMessage) / 60);
  const costPerHour = 5; // USD
  const monthlySavings = Math.round(hoursWasted * costPerHour * 30);
  const reductionPercent = 80;
  const actualSavings = Math.round(monthlySavings * (reductionPercent / 100));

  return (
    <section className="py-20 lg:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-400/[0.02] to-transparent" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400/10 border border-emerald-400/20 mb-6">
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-800 uppercase tracking-[0.15em]">
              Calculadora de ROI
            </span>
          </div>
          <h2 className="font-display font-900 text-3xl sm:text-4xl lg:text-5xl mb-4 text-white">
            ¿Cuánto <span className="text-gradient">ahorrarás</span> al mes?
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Mueve el slider con la cantidad de clientes de tu ISP y ve el impacto real.
          </p>
        </div>

        <div
          ref={ref}
          className={`glass rounded-3xl p-8 sm:p-12 neon-border transition-all duration-700 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Slider */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <label className="text-slate-400 text-sm font-600 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Número de clientes
              </label>
              <span className="text-cyan-400 font-display font-900 text-2xl">{clients}</span>
            </div>
            <input
              type="range"
              min={50}
              max={2000}
              step={50}
              value={clients}
              onChange={(e) => setClients(Number(e.target.value))}
              className="w-full h-2 bg-dark-700 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(34,211,238,0.5)] [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>50</span>
              <span>500</span>
              <span>1,000</span>
              <span>1,500</span>
              <span>2,000</span>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <ResultCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Mensajes/día a resolver"
              value={`~${messagesPerDay}`}
              color="text-rose-400"
              bg="bg-rose-400/10"
            />
            <ResultCard
              icon={<Clock className="w-5 h-5" />}
              label="Horas/día desperdiciadas"
              value={`~${hoursWasted}h`}
              color="text-amber-400"
              bg="bg-amber-400/10"
            />
            <ResultCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Costo mensual en soporte"
              value={`$${monthlySavings}`}
              color="text-fuchsia-400"
              bg="bg-fuchsia-400/10"
            />
            <ResultCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Ahorro con TuPortalISP"
              value={`$${actualSavings}/mes`}
              color="text-emerald-400"
              bg="bg-emerald-400/10"
              highlight
            />
          </div>

          {/* Bottom insight */}
          <div className="text-center p-5 bg-emerald-400/5 rounded-2xl border border-emerald-400/10">
            <p className="text-emerald-300 text-sm font-600">
              💡 Con <strong className="text-emerald-400">{clients} clientes</strong>, recuperas la inversión de $299 en{' '}
              <strong className="text-white font-800">
                {actualSavings > 0 ? `${Math.max(1, Math.ceil(299 / actualSavings))} ${Math.ceil(299 / actualSavings) === 1 ? 'mes' : 'meses'}` : 'poco tiempo'}
              </strong>
              {' '}— y después es ahorro puro. A partir del mes 13 solo pagas <strong className="text-fuchsia-400">$199/año</strong> de mantenimiento.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultCard({ icon, label, value, color, bg, highlight = false }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bg: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 text-center ${highlight ? 'bg-emerald-400/5 border border-emerald-400/20' : 'glass-light'}`}>
      <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center ${color} mx-auto mb-3`}>
        {icon}
      </div>
      <div className={`text-2xl font-display font-900 ${color} mb-1`}>{value}</div>
      <div className="text-slate-500 text-xs font-500">{label}</div>
    </div>
  );
}
