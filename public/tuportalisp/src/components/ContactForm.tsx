import { useState } from 'react';
import { useInView } from '../hooks/useInView';
import { Send, Zap, ArrowRight, CheckCircle, MessageCircle } from 'lucide-react';

export function ContactForm() {
  const { ref, isInView } = useInView(0.1);
  const [formData, setFormData] = useState({
    name: '',
    isp_name: '',
    email: '',
    phone: '',
    clients: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    // Build WhatsApp message with form data
    const whatsappMsg = encodeURIComponent(
      `🚀 *Nueva solicitud TuPortalISP*\n\n` +
      `👤 *Nombre:* ${formData.name}\n` +
      `🏢 *ISP:* ${formData.isp_name}\n` +
      `📧 *Email:* ${formData.email}\n` +
      `📱 *Teléfono:* ${formData.phone}\n` +
      `👥 *Clientes:* ${formData.clients}\n` +
      `💬 *Mensaje:* ${formData.message || 'Sin mensaje adicional'}\n\n` +
      `Estoy interesado en la oferta de implementación por $299 + $199/año de mantenimiento a partir del mes 13`
    );

    setTimeout(() => {
      setStatus('sent');
      window.open(`https://wa.me/584120330315?text=${whatsappMsg}`, '_blank');
      setTimeout(() => {
        setStatus('idle');
        setFormData({ name: '', isp_name: '', email: '', phone: '', clients: '', message: '' });
      }, 3000);
    }, 1000);
  };

  return (
    <section id="contact" className="py-20 lg:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-400/[0.03] to-transparent" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div
          ref={ref}
          className={`transition-all duration-700 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Left Content */}
            <div className="lg:col-span-2 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400/10 border border-emerald-400/20 mb-6 self-start">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-800 uppercase tracking-[0.15em]">
                  Dar el paso
                </span>
              </div>

              <h2 className="font-display font-900 text-3xl sm:text-4xl text-white mb-4">
                Reclama tu portal por{' '}
                <span className="text-gradient-cyan">$299</span>
              </h2>
              <p className="text-slate-400 text-base leading-relaxed mb-3">
                Llena el formulario y nuestro equipo te contactará en menos de 2 horas para iniciar la implementación de tu portal.
              </p>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                💡 <strong className="text-slate-300">Implementación: $299</strong> · Primeros 12 meses de servidores incluidos · A partir del mes 13: <strong className="text-fuchsia-400">$199/año</strong> por mantenimiento.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  'Respuesta en menos de 2 horas',
                  'Asesoría personalizada sin compromiso',
                  'Demo privada con tus datos reales',
                  'Pago solo contra entrega funcional',
                  '12 meses de hosting incluidos',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-slate-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>

              {/* Direct WhatsApp Option */}
              <div className="glass rounded-2xl p-5 border-emerald-400/10">
                <p className="text-slate-400 text-sm mb-3">¿Prefieres contacto directo?</p>
                <a
                  href="https://wa.me/584120330315?text=Soy%20ISP%20y%20estoy%20interesado%20en%20la%20oferta%20de%20implementaci%C3%B3n%20por%20$299%20de%20TuPortalISP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white font-700 text-sm rounded-xl hover:bg-emerald-400 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp Directo
                </a>
              </div>
            </div>

            {/* Right Form */}
            <div className="lg:col-span-3">
              <div className="glass rounded-3xl p-8 sm:p-10 neon-border">
                <h3 className="font-display font-800 text-xl text-white mb-2 uppercase tracking-wide">
                  Solicita tu portal
                </h3>
                <p className="text-slate-500 text-sm mb-8">
                  Completa los datos y te enviamos una propuesta personalizada.
                </p>

                {status === 'sent' ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <h4 className="font-display font-800 text-2xl text-white mb-2">¡Solicitud Enviada!</h4>
                    <p className="text-slate-400">Te contactaremos en menos de 2 horas.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-400 text-xs font-600 uppercase tracking-wider mb-2 block">
                          Tu nombre *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Juan Pérez"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400/50 focus:bg-white/10 transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs font-600 uppercase tracking-wider mb-2 block">
                          Nombre del ISP *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.isp_name}
                          onChange={(e) => setFormData({ ...formData, isp_name: e.target.value })}
                          placeholder="FibraNet ISP"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400/50 focus:bg-white/10 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-400 text-xs font-600 uppercase tracking-wider mb-2 block">
                          Correo electrónico *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="tu@email.com"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400/50 focus:bg-white/10 transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs font-600 uppercase tracking-wider mb-2 block">
                          WhatsApp *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+52 1234567890"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400/50 focus:bg-white/10 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 text-xs font-600 uppercase tracking-wider mb-2 block">
                        ¿Cuántos clientes tienes?
                      </label>
                      <select
                        value={formData.clients}
                        onChange={(e) => setFormData({ ...formData, clients: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/50 focus:bg-white/10 transition-all text-sm appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-dark-800">Selecciona un rango</option>
                        <option value="1-50" className="bg-dark-800">1 - 50 clientes</option>
                        <option value="51-200" className="bg-dark-800">51 - 200 clientes</option>
                        <option value="201-500" className="bg-dark-800">201 - 500 clientes</option>
                        <option value="501-1000" className="bg-dark-800">501 - 1,000 clientes</option>
                        <option value="1000+" className="bg-dark-800">Más de 1,000 clientes</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 text-xs font-600 uppercase tracking-wider mb-2 block">
                        Cuéntanos sobre tu ISP
                      </label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="¿Qué problemas quieres resolver? ¿Qué funciones te interesan más?"
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400/50 focus:bg-white/10 transition-all text-sm resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={status === 'sending'}
                      className="w-full group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-400 to-cyan-500 text-dark-900 font-800 text-base rounded-2xl hover:shadow-[0_0_40px_rgba(34,211,238,0.4)] hover:-translate-y-0.5 transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {status === 'sending' ? (
                        <>
                          <div className="w-5 h-5 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Solicitar Mi Portal por $299
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>

                    <p className="text-slate-600 text-xs text-center">
                      🔒 Tu información está segura. No hacemos spam.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
