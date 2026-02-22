import { useState } from 'react';
import { useInView } from '../hooks/useInView';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqs = [
  {
    question: '¿Necesito tener Wisphub para usar TuPortalISP?',
    answer: 'Sí, actualmente nuestro portal se integra directamente con Wisphub para sincronizar datos de clientes, saldos, planes y estados de servicio. Es requisito tener una cuenta activa de Wisphub.',
  },
  {
    question: '¿Cuánto tarda la implementación?',
    answer: 'La implementación completa tarda máximo 48 horas hábiles desde que recibimos tu información (logo, colores, datos de Wisphub). Esto incluye configuración, personalización y pruebas.',
  },
  {
    question: '¿Cuánto cuesta el servicio completo?',
    answer: 'La implementación tiene un costo único de $299 USD que incluye todo: diseño, desarrollo, configuración, personalización con tu marca, dominio propio y los primeros 12 meses de hosting y servidores sin cargo adicional. A partir del mes 13, se debe cancelar $199 USD anuales por concepto de mantenimiento de servidores, hosting, actualizaciones de seguridad y soporte técnico continuo.',
  },
  {
    question: '¿Qué incluyen los $199 anuales de mantenimiento?',
    answer: 'El mantenimiento anual de $199 USD (a partir del mes 13) cubre: hosting y servidores dedicados para tu portal, actualizaciones de seguridad, respaldos automáticos, monitoreo de disponibilidad 24/7, soporte técnico continuo y mejoras menores del sistema. Equivale a solo $16.58/mes.',
  },
  {
    question: '¿Qué pasa si no pago el mantenimiento anual?',
    answer: 'Los primeros 12 meses están completamente cubiertos. Si al llegar al mes 13 decides no renovar el mantenimiento, el portal dejará de funcionar ya que los servidores y hosting requieren un costo operativo continuo. Puedes renovar en cualquier momento para reactivar el servicio.',
  },
  {
    question: '¿Qué pasa si no me gusta el resultado?',
    answer: 'Trabajamos contigo durante el proceso de diseño y configuración. Haces revisiones antes de publicar. Además, solo pagas cuando el portal está 100% funcional y aprobado por ti.',
  },
  {
    question: '¿Mis clientes necesitan instalar alguna app?',
    answer: 'No. El portal es una aplicación web (PWA) que funciona desde cualquier navegador en móvil, tablet o computadora. No requiere descarga ni instalación.',
  },
  {
    question: '¿Puedo personalizar el portal con mi marca?',
    answer: 'Absolutamente. El portal lleva tu logotipo, colores de marca, nombre de tu empresa y dominio propio. Es 100% White Label — tus clientes nunca sabrán que nosotros lo desarrollamos.',
  },
  {
    question: '¿El portal es seguro para los datos de mis clientes?',
    answer: 'Sí. Usamos conexiones HTTPS cifradas, autenticación segura y las mejores prácticas de seguridad web. Los datos sensibles nunca se almacenan en texto plano. Las actualizaciones de seguridad están incluidas en el mantenimiento anual.',
  },
  {
    question: '¿Qué soporte ofrecen después de la implementación?',
    answer: 'Incluimos 30 días de soporte técnico intensivo post-lanzamiento para ajustes y consultas. Durante los primeros 12 meses, el soporte básico está incluido. A partir del mes 13, el soporte técnico continuo está cubierto por la cuota anual de mantenimiento de $199.',
  },
];

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [open, setOpen] = useState(false);
  const { ref, isInView } = useInView(0.1);

  return (
    <div
      ref={ref}
      className={`glass rounded-2xl overflow-hidden transition-all duration-500 hover:border-cyan-400/20 ${
        open ? 'neon-border' : ''
      } ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 text-left cursor-pointer group"
      >
        <span className="text-white font-600 text-base pr-4 group-hover:text-cyan-400 transition-colors">
          {faq.question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-slate-500 shrink-0 transition-transform duration-300 ${
            open ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 pt-0">
          <p className="text-slate-400 text-sm leading-relaxed">{faq.answer}</p>
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  return (
    <section id="faq" className="py-20 lg:py-28 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-400/10 border border-cyan-400/20 mb-6">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-400 text-xs font-800 uppercase tracking-[0.15em]">
              Preguntas frecuentes
            </span>
          </div>
          <h2 className="font-display font-900 text-3xl sm:text-4xl lg:text-5xl mb-4 text-white">
            ¿Tienes <span className="text-gradient">dudas?</span>
          </h2>
          <p className="text-slate-400 text-lg">
            Aquí respondemos las preguntas más comunes de ISPs como el tuyo.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} index={i} />
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-slate-500 text-sm mb-4">¿No encontraste tu pregunta?</p>
          <a
            href="https://wa.me/584120330315?text=Hola,%20tengo%20una%20duda%20sobre%20TuPortalISP"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 glass rounded-xl text-cyan-400 font-600 text-sm hover:border-cyan-400/30 transition-all"
          >
            Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
