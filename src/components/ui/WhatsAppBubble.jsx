import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

const WhatsAppBubble = () => {
    const phoneNumber = '584242268245';
    const message = 'Hola, necesito asistencia con mi servicio de Wifi Rapidito.';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    return (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-24 md:bottom-8 right-6 md:right-8 z-50"
        >
            <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative group block"
            >
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-40 group-hover:opacity-70 transition-opacity duration-300" />

                {/* Main Button */}
                <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] border border-white/20 flex items-center justify-center">
                    <MessageCircle className="text-white w-7 h-7" />

                    {/* Pulsing Ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-20 pointer-events-none" />
                </div>

                {/* Tooltip */}
                <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-slate-900/90 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-white text-xs font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap hidden md:block">
                    Chat WhatsApp
                </div>
            </a>
        </motion.div>
    );
};

export default WhatsAppBubble;
