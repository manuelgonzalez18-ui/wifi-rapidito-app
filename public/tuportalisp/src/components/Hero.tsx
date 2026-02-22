import { Play, ArrowRight, Shield, Clock, Users, Star } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-cyan-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-400/10 border border-cyan-400/30 mb-8 animate-slide-up">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-cyan-400 text-xs font-800 uppercase tracking-[0.2em]">
              +120 ISPs ya automatizan su atención
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="font-display font-900 text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
              Tus clientes resuelven solos.
            </span>
            <br />
            <span className="text-gradient">Tú dejas de apagar fuegos.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Portal de autogestión <strong className="text-white">conectado a Wisphub</strong> que permite a tus abonados consultar saldo, reportar pagos y abrir tickets de soporte — <strong className="text-cyan-400">sin que nadie te escriba por WhatsApp.</strong>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <a
              href="#contact"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-400 to-cyan-500 text-dark-900 font-800 text-base rounded-2xl hover:shadow-[0_0_40px_rgba(34,211,238,0.4)] hover:-translate-y-1 transition-all uppercase tracking-wider animate-pulse-glow"
            >
              Quiero Mi Portal a $299
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="https://www.wifirapidito.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 glass rounded-2xl text-white font-700 text-base hover:border-cyan-400/40 transition-all uppercase tracking-wider"
            >
              <Play className="w-5 h-5 text-cyan-400" />
              Ver Demo en Vivo
            </a>
          </div>

          {/* Social Proof Row */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm text-slate-500 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Pago contra entrega</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Listo en 48 horas</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-fuchsia-400" />
              <span>+3,500 abonados gestionados</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>4.9/5 satisfacción</span>
            </div>
          </div>
        </div>

        {/* Hero Visual - Dashboard Mockup */}
        <div className="mt-16 lg:mt-20 max-w-5xl mx-auto animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <div className="relative rounded-3xl overflow-hidden neon-border bg-dark-800 p-1.5 shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
            {/* Browser Chrome */}
            <div className="bg-dark-700 rounded-t-2xl px-4 py-3 flex items-center gap-3">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/70" />
                <div className="w-3 h-3 rounded-full bg-amber-400/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/70" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-dark-900/60 rounded-lg px-4 py-1.5 text-xs text-slate-500 text-center font-mono">
                  portal.tuisp.com
                </div>
              </div>
            </div>
            {/* Dashboard Content */}
            <div className="bg-dark-800 rounded-b-2xl p-6 sm:p-8 min-h-[300px] sm:min-h-[400px]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Saldo', value: '$450.00', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                  { label: 'Próximo Corte', value: '15 Jun', color: 'text-amber-400', bg: 'bg-amber-400/10' },
                  { label: 'Plan', value: '50 Mbps', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
                  { label: 'Estado', value: 'Activo', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                ].map((item) => (
                  <div key={item.label} className={`${item.bg} rounded-xl p-4 text-center`}>
                    <div className="text-xs text-slate-500 mb-1 font-medium">{item.label}</div>
                    <div className={`text-lg sm:text-xl font-800 ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: '💳', label: 'Reportar Pago', desc: 'Sube tu comprobante' },
                  { icon: '🔧', label: 'Soporte Técnico', desc: 'Abre un ticket' },
                  { icon: '📊', label: 'Mi Historial', desc: 'Pagos y facturas' },
                ].map((item) => (
                  <div key={item.label} className="glass-light rounded-xl p-4 hover:border-cyan-400/20 transition-all cursor-pointer group">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="text-white font-700 text-sm mb-1 group-hover:text-cyan-400 transition-colors">{item.label}</div>
                    <div className="text-slate-500 text-xs">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Glow effect under the dashboard */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-cyan-400/10 rounded-full blur-3xl" />
        </div>
      </div>
    </section>
  );
}
