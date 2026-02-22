import { useInView } from '../hooks/useInView';
import { 
  CreditCard, Search, LifeBuoy, MessageSquare, 
  Palette, Zap, Smartphone, Bell, BarChart3
} from 'lucide-react';

const features = [
  {
    icon: CreditCard,
    title: 'Reporte de Pagos Inteligente',
    description: 'Tus clientes suben el comprobante desde su móvil con datos prellenados. Recibes notificación instantánea lista para validar. Adiós al caos de capturas por chat.',
    color: 'from-emerald-400 to-emerald-600',
    iconBg: 'bg-emerald-400/10',
    iconColor: 'text-emerald-400',
  },
  {
    icon: Search,
    title: 'Autoconsulta en Tiempo Real',
    description: 'Saldo, fecha de corte, estado del servicio, plan contratado y más. Todo sincronizado con Wisphub al instante. El cliente deja de preguntarte.',
    color: 'from-cyan-400 to-cyan-600',
    iconBg: 'bg-cyan-400/10',
    iconColor: 'text-cyan-400',
  },
  {
    icon: LifeBuoy,
    title: 'Sistema de Tickets Completo',
    description: 'Los clientes describen su fallo, seleccionan categoría y envían evidencia fotográfica. Tu equipo recibe tickets organizados, no chats desordenados.',
    color: 'from-fuchsia-400 to-fuchsia-600',
    iconBg: 'bg-fuchsia-400/10',
    iconColor: 'text-fuchsia-400',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Bot Integrado',
    description: 'Bot conversacional que educa a tus clientes y los redirige al portal para cualquier trámite. Automatiza las respuestas más frecuentes.',
    color: 'from-green-400 to-green-600',
    iconBg: 'bg-green-400/10',
    iconColor: 'text-green-400',
  },
  {
    icon: Palette,
    title: 'White Label 100% Tu Marca',
    description: 'Tu logotipo, tus colores, tu dominio propio. El portal es 100% tuyo ante el cliente. Nadie sabe que existimos. Profesionaliza tu imagen.',
    color: 'from-amber-400 to-amber-600',
    iconBg: 'bg-amber-400/10',
    iconColor: 'text-amber-400',
  },
  {
    icon: Zap,
    title: 'Cero Complicaciones Técnicas',
    description: 'Sin servidores caros, sin conocimientos técnicos. Nosotros desplegamos, configuramos y entregamos listo para operar. Tú solo apruebas.',
    color: 'from-yellow-400 to-yellow-600',
    iconBg: 'bg-yellow-400/10',
    iconColor: 'text-yellow-400',
  },
  {
    icon: Smartphone,
    title: 'Diseño Mobile-First',
    description: 'Optimizado para que tus abonados accedan desde cualquier dispositivo. Carga rápida, interfaz intuitiva, sin necesidad de instalar apps.',
    color: 'from-blue-400 to-blue-600',
    iconBg: 'bg-blue-400/10',
    iconColor: 'text-blue-400',
  },
  {
    icon: Bell,
    title: 'Notificaciones Automáticas',
    description: 'Alertas por WhatsApp y email cuando hay pagos pendientes, cortes próximos o tickets resueltos. Mantén a tu equipo y clientes informados.',
    color: 'from-rose-400 to-rose-600',
    iconBg: 'bg-rose-400/10',
    iconColor: 'text-rose-400',
  },
  {
    icon: BarChart3,
    title: 'Métricas y Reportes',
    description: 'Panel administrativo con estadísticas de uso, pagos recibidos, tickets activos y rendimiento del equipo. Toma decisiones con datos reales.',
    color: 'from-indigo-400 to-indigo-600',
    iconBg: 'bg-indigo-400/10',
    iconColor: 'text-indigo-400',
  },
];

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const { ref, isInView } = useInView(0.1);

  return (
    <div
      ref={ref}
      className={`glass rounded-2xl p-7 hover:-translate-y-2 hover:border-cyan-400/30 hover:shadow-[0_10px_40px_rgba(34,211,238,0.08)] transition-all duration-500 group cursor-default ${
        isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className={`w-14 h-14 rounded-2xl ${feature.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
        <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
      </div>
      <h3 className="font-display font-700 text-lg text-white mb-3 group-hover:text-cyan-400 transition-colors">
        {feature.title}
      </h3>
      <p className="text-slate-400 text-sm leading-relaxed">
        {feature.description}
      </p>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-28 relative">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 mb-6">
            <span className="text-fuchsia-400 text-xs font-800 uppercase tracking-[0.15em]">
              Todo incluido
            </span>
          </div>
          <h2 className="font-display font-900 text-3xl sm:text-4xl lg:text-5xl mb-4 text-white">
            Un portal completo para{' '}
            <span className="text-gradient">tu ISP</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Cada función diseñada para reducir tu carga operativa y mejorar la experiencia de tus abonados.
          </p>
          <div className="w-20 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 mx-auto mt-6 rounded-full" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
