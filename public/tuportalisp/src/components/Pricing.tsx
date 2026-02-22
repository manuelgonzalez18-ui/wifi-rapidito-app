import { useState, useEffect } from 'react';
import { useInView } from '../hooks/useInView';
import { 
  Zap, Shield, Check, ArrowRight, Clock, 
  Users, Gift, Sparkles, Server, CalendarClock,
  CircleDollarSign, Info
} from 'lucide-react';

export function Pricing() {
  const { ref, isInView } = useInView(0.1);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const stored = localStorage.getItem('tuportalisp_deadline');
    let deadline: number;
    if (stored) {
      deadline = parseInt(stored);
    } else {
      deadline = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem('tuportalisp_deadline', deadline.toString());
    }

    const timer = setInterval(() => {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        clearInterval(timer);
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const included = [
    'Portal completo con tu marca (White Label)',
    'Módulo de reporte de pagos con comprobantes',
    'Autoconsulta de saldo sincronizada con Wisphub',
    'Sistema de tickets de soporte técnico',
    'Diseño responsive (móvil, tablet, desktop)',
    'Dominio propio configurado (tuisp.com)',
    'Integración con WhatsApp Bot',
    'Notificaciones automáticas',
    'Capacitación de uso para tu equipo',
    'Soporte técnico por 30 días post-lanzamiento',
    '12 meses de hosting y servidores incluidos',
    'Actualizaciones de seguridad durante el primer año',
  ];

  const timeline = [
    {
      period: 'Hoy',
      label: 'Implementación',
      price: '$299',
      description: 'Pago único. Diseño, desarrollo, configuración y lanzamiento de tu portal.',
      color: 'cyan',
      icon: Zap,
    },
    {
      period: 'Meses 1–12',
      label: 'Sin cargos adicionales',
      price: '$0',
      description: 'Los primeros 12 meses de hosting, servidores y mantenimiento están incluidos sin costo extra.',
      color: 'emerald',
      icon: Gift,
    },
    {
      period: 'A partir del mes 13',
      label: 'Mantenimiento anual',
      price: '$199/año',
      description: 'Mantenimiento de servidores, hosting, actualizaciones de seguridad y soporte técnico continuo.',
      color: 'fuchsia',
      icon: Server,
    },
  ];

  return (
    <section id="pricing" className="py-20 lg:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/[0.03] to-transparent" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <div
          ref={ref}
          className={`transition-all duration-700 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Urgency Banner */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400/10 border border-amber-400/30 mb-4">
              <Gift className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-xs font-800 uppercase tracking-[0.15em]">
                Oferta de lanzamiento — Cupos limitados
              </span>
            </div>
          </div>

          {/* Main Card */}
          <div className="glass rounded-[2rem] overflow-hidden neon-border relative">
            {/* Countdown */}
            <div className="bg-gradient-to-r from-cyan-400/10 via-fuchsia-500/10 to-cyan-400/10 px-6 py-4 flex flex-wrap items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400 text-sm font-600">Oferta expira en:</span>
              <div className="flex items-center gap-2 ml-2">
                {[
                  { value: timeLeft.days, label: 'd' },
                  { value: timeLeft.hours, label: 'h' },
                  { value: timeLeft.minutes, label: 'm' },
                  { value: timeLeft.seconds, label: 's' },
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-0.5">
                    <span className="bg-dark-700 px-2 py-1 rounded-lg text-cyan-400 font-display font-800 text-sm min-w-[32px] text-center">
                      {String(t.value).padStart(2, '0')}
                    </span>
                    <span className="text-slate-500 text-xs">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 sm:p-12 text-center">
              <h2 className="font-display font-900 text-3xl sm:text-4xl lg:text-5xl text-white mb-3">
                Tu ISP Digitalizado
                <br />
                <span className="text-gradient">en 48 Horas</span>
              </h2>
              <p className="text-slate-400 text-base mb-10 max-w-lg mx-auto">
                Sin riesgos, sin servidores propios, sin complicaciones técnicas. Todo listo para operar.
              </p>

              {/* ============================================ */}
              {/* PRICING VISUAL: Implementation + Maintenance */}
              {/* ============================================ */}
              <div className="max-w-3xl mx-auto mb-10">
                {/* Main Price Hero */}
                <div className="relative mb-8">
                  <div className="text-slate-500 text-lg line-through mb-1">$599 USD</div>
                  <div
                    className="font-display font-900 text-7xl sm:text-8xl text-cyan-400 leading-none mb-2"
                    style={{ textShadow: '0 0 40px rgba(34,211,238,0.3)' }}
                  >
                    $299
                  </div>
                  <div className="text-white font-700 uppercase tracking-widest text-sm">
                    Pago único por implementación
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 text-emerald-400 text-xs font-700">
                    <Check className="w-3.5 h-3.5" />
                    12 meses de servidores incluidos sin costo adicional
                  </div>
                </div>

                {/* Timeline: How the pricing works */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {timeline.map((step, i) => {
                    const colorMap = {
                      cyan: {
                        bg: 'bg-cyan-400/5',
                        border: 'border-cyan-400/20',
                        text: 'text-cyan-400',
                        iconBg: 'bg-cyan-400/10',
                        priceBg: 'bg-cyan-400/10',
                      },
                      emerald: {
                        bg: 'bg-emerald-400/5',
                        border: 'border-emerald-400/20',
                        text: 'text-emerald-400',
                        iconBg: 'bg-emerald-400/10',
                        priceBg: 'bg-emerald-400/10',
                      },
                      fuchsia: {
                        bg: 'bg-fuchsia-400/5',
                        border: 'border-fuchsia-400/20',
                        text: 'text-fuchsia-400',
                        iconBg: 'bg-fuchsia-400/10',
                        priceBg: 'bg-fuchsia-400/10',
                      },
                    };
                    const c = colorMap[step.color as keyof typeof colorMap];
                    const Icon = step.icon;

                    return (
                      <div
                        key={i}
                        className={`rounded-2xl p-5 ${c.bg} border ${c.border} text-left relative overflow-hidden transition-all duration-300 hover:scale-[1.03]`}
                      >
                        {/* Step Number */}
                        <div className={`absolute top-3 right-3 w-7 h-7 rounded-full ${c.iconBg} flex items-center justify-center`}>
                          <span className={`text-xs font-800 ${c.text}`}>{i + 1}</span>
                        </div>

                        <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center mb-3`}>
                          <Icon className={`w-5 h-5 ${c.text}`} />
                        </div>

                        <div className={`text-xs font-700 uppercase tracking-wider ${c.text} mb-1`}>
                          {step.period}
                        </div>
                        <div className="text-white font-display font-800 text-base mb-2">
                          {step.label}
                        </div>
                        <div className={`font-display font-900 text-2xl ${c.text} mb-2`}>
                          {step.price}
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Annual Maintenance Highlight Box */}
                <div className="glass rounded-2xl p-5 border-fuchsia-400/20 max-w-2xl mx-auto mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-fuchsia-400/10 flex items-center justify-center shrink-0">
                      <CalendarClock className="w-6 h-6 text-fuchsia-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-fuchsia-400 font-800 text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
                        <Server className="w-4 h-4" />
                        Mantenimiento Anual de Servidores
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed mb-2">
                        A partir del <strong className="text-white">mes 13</strong> de implementación, el ISP deberá cancelar 
                        <strong className="text-fuchsia-400"> $199 USD anuales</strong> por concepto de mantenimiento de servidores, 
                        hosting, actualizaciones de seguridad y soporte técnico continuo.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-fuchsia-400/10 text-fuchsia-300 text-xs font-600">
                          <Server className="w-3 h-3" /> Hosting incluido
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-fuchsia-400/10 text-fuchsia-300 text-xs font-600">
                          <Shield className="w-3 h-3" /> Actualizaciones de seguridad
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-fuchsia-400/10 text-fuchsia-300 text-xs font-600">
                          <Zap className="w-3 h-3" /> Soporte técnico
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Breakdown Summary */}
                <div className="glass rounded-2xl p-5 max-w-2xl mx-auto mb-6 border-cyan-400/10">
                  <div className="flex items-center gap-2 mb-4">
                    <CircleDollarSign className="w-5 h-5 text-cyan-400" />
                    <h4 className="text-white font-700 text-sm uppercase tracking-wider">
                      Resumen de inversión
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span className="text-slate-300 text-sm">Implementación completa (pago único)</span>
                      </div>
                      <span className="text-cyan-400 font-display font-800 text-base">$299</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-slate-300 text-sm">Meses 1 al 12 (servidores y hosting)</span>
                      </div>
                      <span className="text-emerald-400 font-display font-800 text-base">GRATIS</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-fuchsia-400" />
                        <span className="text-slate-300 text-sm">A partir del mes 13 (mantenimiento anual)</span>
                      </div>
                      <span className="text-fuchsia-400 font-display font-800 text-base">$199/año</span>
                    </div>
                    <div className="flex items-center justify-between py-3 mt-1 bg-cyan-400/5 rounded-xl px-4 -mx-1">
                      <span className="text-white font-700 text-sm">Costo total primer año</span>
                      <span className="text-cyan-400 font-display font-900 text-xl">$299</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>El mantenimiento anual de $199 equivale a solo <strong className="text-slate-300">$16.58/mes</strong> — menos que una salida a comer.</span>
                  </div>
                </div>
              </div>

              {/* Spots Left */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 mb-8">
                <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                <span className="text-rose-400 text-xs font-700 uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 inline mr-1" />
                  Solo 5 cupos disponibles este mes
                </span>
              </div>

              {/* What's Included */}
              <div className="max-w-lg mx-auto text-left mb-10">
                <h4 className="text-white font-700 text-sm uppercase tracking-wider mb-5 text-center flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Todo lo que incluye la implementación
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {included.map((item) => (
                    <div key={item} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-slate-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guarantee */}
              <div className="glass rounded-2xl p-5 max-w-lg mx-auto mb-8 border-emerald-400/20">
                <div className="flex items-center gap-4">
                  <Shield className="w-12 h-12 text-emerald-400 shrink-0" />
                  <div className="text-left">
                    <div className="text-emerald-400 font-800 text-sm uppercase tracking-wider mb-1">
                      Garantía de Satisfacción Total
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      Solo pagas cuando el portal esté <strong className="text-white">100% funcional</strong> y listo para tus clientes. Cero riesgo para ti.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <a
                href="#contact"
                className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-cyan-400 to-cyan-500 text-dark-900 font-900 text-lg rounded-2xl hover:shadow-[0_0_50px_rgba(34,211,238,0.4)] hover:-translate-y-1 transition-all uppercase tracking-wider animate-pulse-glow"
              >
                <Zap className="w-6 h-6" />
                Reclamar Oferta de $299
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>

              <p className="text-slate-600 text-xs mt-4">
                Al dar clic serás redirigido al formulario de contacto
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
