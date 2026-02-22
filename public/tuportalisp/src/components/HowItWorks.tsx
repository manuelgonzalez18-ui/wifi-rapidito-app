import { useInView } from '../hooks/useInView';
import { MessageCircle, Settings, Rocket, ArrowDown } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: MessageCircle,
    title: 'Nos contactas',
    description: 'Escríbenos por WhatsApp o llena el formulario. En 15 minutos entendemos tu ISP: cuántos clientes, qué problemas tienes, qué necesitas.',
    detail: 'Sin compromiso. Sin costo.',
    color: 'cyan',
  },
  {
    number: '02',
    icon: Settings,
    title: 'Configuramos tu portal',
    description: 'En 48 horas montamos tu portal personalizado: tu logo, tus colores, tu dominio. Lo conectamos con tu cuenta de Wisphub y configuramos los módulos.',
    detail: 'Tú solo apruebas el diseño.',
    color: 'fuchsia',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Lanzamiento y soporte',
    description: 'Publicamos el portal. Te damos las herramientas para comunicarlo a tus abonados. Soporte continuo para ajustes y mejoras.',
    detail: 'Pagas solo cuando esté funcionando.',
    color: 'emerald',
  },
];

const colorMap = {
  cyan: {
    bg: 'bg-cyan-400/10',
    text: 'text-cyan-400',
    border: 'border-cyan-400/30',
    glow: 'shadow-[0_0_30px_rgba(34,211,238,0.15)]',
    gradient: 'from-cyan-400 to-cyan-600',
  },
  fuchsia: {
    bg: 'bg-fuchsia-400/10',
    text: 'text-fuchsia-400',
    border: 'border-fuchsia-400/30',
    glow: 'shadow-[0_0_30px_rgba(217,70,239,0.15)]',
    gradient: 'from-fuchsia-400 to-fuchsia-600',
  },
  emerald: {
    bg: 'bg-emerald-400/10',
    text: 'text-emerald-400',
    border: 'border-emerald-400/30',
    glow: 'shadow-[0_0_30px_rgba(52,211,153,0.15)]',
    gradient: 'from-emerald-400 to-emerald-600',
  },
};

export function HowItWorks() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section id="how-it-works" className="py-20 lg:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/[0.02] to-transparent" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-400/10 border border-cyan-400/20 mb-6">
            <span className="text-cyan-400 text-xs font-800 uppercase tracking-[0.15em]">
              Proceso simple
            </span>
          </div>
          <h2 className="font-display font-900 text-3xl sm:text-4xl lg:text-5xl mb-4 text-white">
            En <span className="text-gradient-cyan">3 pasos</span> tienes tu portal
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Sin complicaciones técnicas. Sin inversión en servidores. Sin esperas interminables.
          </p>
        </div>

        <div ref={ref} className="space-y-6">
          {steps.map((step, i) => {
            const colors = colorMap[step.color as keyof typeof colorMap];
            return (
              <div key={step.number}>
                <div
                  className={`glass rounded-3xl p-8 sm:p-10 ${colors.border} ${colors.glow} hover:scale-[1.02] transition-all duration-500 ${
                    isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${i * 200}ms` }}
                >
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    <div className="flex items-center gap-5">
                      <div className={`text-5xl font-display font-900 ${colors.text} opacity-30`}>
                        {step.number}
                      </div>
                      <div className={`w-16 h-16 rounded-2xl ${colors.bg} flex items-center justify-center shrink-0`}>
                        <step.icon className={`w-8 h-8 ${colors.text}`} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-800 text-2xl text-white mb-3 uppercase">
                        {step.title}
                      </h3>
                      <p className="text-slate-400 text-base leading-relaxed mb-3">
                        {step.description}
                      </p>
                      <span className={`inline-block px-4 py-1.5 rounded-full ${colors.bg} ${colors.text} text-xs font-700 uppercase tracking-wider`}>
                        {step.detail}
                      </span>
                    </div>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowDown className="w-6 h-6 text-slate-600 animate-bounce" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
