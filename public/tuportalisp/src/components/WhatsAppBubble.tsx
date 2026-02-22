import { MessageCircle } from 'lucide-react';

export function WhatsAppBubble() {
  return (
    <a
      href="https://wa.me/584120330315?text=Soy%20ISP%20y%20estoy%20interesado%20en%20automatizar%20mi%20empresa%20con%20TuPortalISP"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 group"
      title="Contactar por WhatsApp"
    >
      {/* Tooltip */}
      <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-300 pointer-events-none">
        <div className="glass px-4 py-2.5 rounded-xl whitespace-nowrap">
          <span className="text-white text-xs font-700 uppercase tracking-wider">
            ¿Interesado? Chatea con nosotros
          </span>
        </div>
      </div>

      {/* Ping effect */}
      <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping-slow opacity-30" />

      {/* Button */}
      <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(34,197,94,0.4)] hover:scale-110 hover:rotate-6 transition-all duration-300 border-2 border-white/20">
        <MessageCircle className="w-7 h-7 text-white" />
      </div>
    </a>
  );
}
