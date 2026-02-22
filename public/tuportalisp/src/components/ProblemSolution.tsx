import { useInView } from '../hooks/useInView';
import { XCircle, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';

const problems = [
  { text: 'WhatsApp saturado con "¿cuánto debo?" y "¿ya se reflejó mi pago?"' },
  { text: 'Clientes furiosos porque tardas horas en reconectar el servicio' },
  { text: 'Comprobantes de pago perdidos entre cientos de chats y grupos' },
  { text: 'Tu equipo de soporte resuelve lo mismo una y otra vez' },
  { text: 'No tienes visibilidad de cuántos tickets o reclamos existen' },
];

const solutions = [
  { text: 'Oficina virtual 24/7 donde el abonado consulta su saldo al instante' },
  { text: 'Módulo de pagos organizado con archivos adjuntos y notificaciones' },
  { text: 'Tickets de soporte con seguimiento y evidencia fotográfica' },
  { text: 'Sincronización en tiempo real con los datos de Wisphub' },
  { text: 'Dashboard para ti con métricas de atención y cobranza' },
];

export function ProblemSolution() {
  const { ref: leftRef, isInView: leftVisible } = useInView();
  const { ref: rightRef, isInView: rightVisible } = useInView();

  return (
    <section className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="font-display font-900 text-3xl sm:text-4xl lg:text-5xl mb-4">
            <span className="text-white">¿Te suena </span>
            <span className="text-gradient">familiar?</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Si manejas un ISP, seguro vives alguno de estos dolores de cabeza todos los días.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Problem Card */}
          <div
            ref={leftRef}
            className={`glass rounded-3xl p-8 sm:p-10 border-rose-500/20 relative overflow-hidden transition-all duration-700 ${
              leftVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl" />
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="font-display font-800 text-xl text-rose-400 uppercase tracking-wide">
                Sin portal de autogestión
              </h3>
            </div>
            <ul className="space-y-5">
              {problems.map((item, i) => (
                <li key={i} className="flex items-start gap-4 group">
                  <XCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                  <span className="text-slate-300 leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 p-4 bg-rose-500/5 rounded-xl border border-rose-500/10">
              <p className="text-rose-300 text-sm font-600 text-center">
                💸 Costo promedio de ineficiencia: <span className="text-rose-400 font-800">$500+/mes</span> en horas perdidas
              </p>
            </div>
          </div>

          {/* Solution Card */}
          <div
            ref={rightRef}
            className={`glass rounded-3xl p-8 sm:p-10 neon-border relative overflow-hidden transition-all duration-700 ${
              rightVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 rounded-full blur-2xl" />
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-cyan-400/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="font-display font-800 text-xl text-cyan-400 uppercase tracking-wide">
                Con TuPortalISP
              </h3>
            </div>
            <ul className="space-y-5">
              {solutions.map((item, i) => (
                <li key={i} className="flex items-start gap-4 group">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-slate-200 leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 p-4 bg-emerald-400/5 rounded-xl border border-emerald-400/10">
              <p className="text-emerald-300 text-sm font-600 text-center">
                ✅ ROI inmediato: <span className="text-emerald-400 font-800">recuperas la inversión en el primer mes</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
