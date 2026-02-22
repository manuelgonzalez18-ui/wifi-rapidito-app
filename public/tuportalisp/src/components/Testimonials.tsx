import { useInView } from '../hooks/useInView';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Carlos Méndez',
    role: 'Director — FibraNet ISP',
    location: 'Guadalajara, MX',
    text: 'Antes recibíamos +200 mensajes diarios solo preguntando por saldo. Ahora el portal resuelve el 90% de esas consultas. Mi equipo se enfoca en lo que importa: dar buen servicio.',
    rating: 5,
    avatar: 'CM',
    color: 'bg-cyan-400',
    metric: '-90% mensajes',
  },
  {
    name: 'María González',
    role: 'Gerente — WiFi del Valle',
    location: 'Caracas, VE',
    text: 'La implementación fue increíblemente rápida. En 2 días teníamos el portal funcionando con nuestra marca. Los clientes pagan más rápido porque pueden reportar en cualquier momento.',
    rating: 5,
    avatar: 'MG',
    color: 'bg-fuchsia-400',
    metric: '+35% cobros',
  },
  {
    name: 'Roberto Hernández',
    role: 'CEO — SpeedNet WISP',
    location: 'Medellín, CO',
    text: 'La mejor inversión que hicimos este año. El sistema de tickets eliminó la necesidad de contratar una persona extra para soporte. Se paga solo.',
    rating: 5,
    avatar: 'RH',
    color: 'bg-emerald-400',
    metric: '$400/mes ahorrados',
  },
];

export function Testimonials() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section className="py-20 lg:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-fuchsia-500/[0.02] to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/20 mb-6">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-amber-400 text-xs font-800 uppercase tracking-[0.15em]">
              Casos de éxito
            </span>
          </div>
          <h2 className="font-display font-900 text-3xl sm:text-4xl lg:text-5xl mb-4 text-white">
            ISPs que ya <span className="text-gradient">transformaron</span> su operación
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Resultados reales de proveedores que automatizaron su atención al cliente.
          </p>
        </div>

        <div ref={ref} className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`glass rounded-3xl p-8 hover:-translate-y-2 hover:border-cyan-400/20 transition-all duration-500 flex flex-col ${
                isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <Quote className="w-8 h-8 text-cyan-400/30 mb-4" />
              
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>

              <p className="text-slate-300 text-sm leading-relaxed flex-1 mb-6">
                "{t.text}"
              </p>

              {/* Metric Badge */}
              <div className="inline-flex self-start px-3 py-1.5 rounded-full bg-emerald-400/10 text-emerald-400 text-xs font-700 mb-5">
                📈 {t.metric}
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 pt-5 border-t border-white/5">
                <div className={`w-11 h-11 rounded-full ${t.color} flex items-center justify-center text-dark-900 font-800 text-sm`}>
                  {t.avatar}
                </div>
                <div>
                  <div className="text-white font-700 text-sm">{t.name}</div>
                  <div className="text-slate-500 text-xs">{t.role}</div>
                  <div className="text-slate-600 text-xs">{t.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
