import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Share2, CheckCircle2 } from 'lucide-react';

const PaymentStoryView = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const paymentData = location.state || {
        user_name: 'Isaias Daniel Alvarado Marin',
        amount: '9.000,00',
        bank: 'Banco de Venezuela',
        reference: '000012785',
        concept: 'Flezer',
        date: new Date().toLocaleDateString()
    };

    return (
        <div className="fixed inset-0 bg-[#0b0e14] flex items-center justify-center z-[100] overflow-hidden">
            {/* Top Navigation */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
                <button
                    onClick={() => navigate(-1)}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all border border-white/10"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-mono">Vista Previa de Historia</div>
            </div>

            {/* Story Container (9:16 Aspect Ratio) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-[450px] aspect-[9/16] bg-gradient-to-b from-[#1a2a44] to-[#0b0e14] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center overflow-hidden"
            >
                {/* Background Decorations */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[30%] bg-blue-500/10 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[30%] bg-cyan-500/10 blur-[100px] rounded-full" />

                {/* Header Branding */}
                <div className="absolute top-16 text-center space-y-2">
                    <div className="text-cyan-400 font-bold tracking-[0.4em] text-sm uppercase">WiFi Rapidito</div>
                    <div className="text-white/40 text-[10px] font-mono uppercase tracking-[0.1em]">Comprobante Digital Verificado</div>
                </div>

                <div className="relative w-[85%] space-y-8 flex flex-col items-center">
                    {/* Status Circle */}
                    <div className="relative">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 12 }}
                            className="w-24 h-24 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.4)]"
                        >
                            <CheckCircle2 size={48} className="text-white" />
                        </motion.div>
                        <div className="absolute inset-[-10px] border-2 border-cyan-500/20 rounded-full animate-ping" />
                    </div>

                    {/* Amount Block */}
                    <div className="text-center space-y-2">
                        <div className="text-white/60 text-xs uppercase tracking-widest font-medium">Monto del Reporte</div>
                        <div className="text-5xl font-bold text-white tracking-tight">
                            <span className="text-2xl text-cyan-400 mr-1">Bs.</span>{paymentData.amount}
                        </div>
                    </div>

                    {/* Details Glass Card */}
                    <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl">
                        <DetailRow label="CLIENTE" value={paymentData.user_name} />
                        <DetailRow label="BANCO" value={paymentData.bank} />
                        <DetailRow label="CONCEPTO" value={paymentData.concept || 'Flezer'} />
                        <DetailRow label="REFERENCIA" value={paymentData.reference} highlight />
                        <DetailRow label="FECHA" value={paymentData.date} />
                    </div>
                </div>

                {/* Footer Message */}
                <div className="absolute bottom-16 text-center">
                    <div className="text-white/20 text-[10px] tracking-[0.2em] uppercase mb-4">¡Gracias por preferirnos!</div>
                    <div className="flex gap-2">
                        <div className="h-[1px] w-8 bg-white/10 self-center" />
                        <div className="text-cyan-500/40 font-mono text-[8px] uppercase tracking-tighter">Tu conexión sin límites</div>
                        <div className="h-[1px] w-8 bg-white/10 self-center" />
                    </div>
                </div>
            </motion.div>

            {/* Bottom Actions (Only visible in preview) */}
            <div className="absolute bottom-10 left-0 w-full flex justify-center gap-4 px-8 z-20">
                <button className="flex-1 max-w-[200px] py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 flex items-center justify-center gap-2 font-bold text-xs uppercase transition-all">
                    <Download size={18} /> Guardar Imagen
                </button>
                <button className="flex-1 max-w-[200px] py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-xs uppercase transition-all shadow-lg shadow-cyan-900/40">
                    <Share2 size={18} /> Compartir
                </button>
            </div>
        </div>
    );
};

const DetailRow = ({ label, value, highlight }) => (
    <div className="space-y-1">
        <div className="text-[9px] text-cyan-400 font-bold tracking-widest uppercase opacity-60 font-mono">{label}</div>
        <div className={`text-sm tracking-wide ${highlight ? 'text-cyan-300 font-mono font-bold' : 'text-white font-medium'}`}>
            {value}
        </div>
    </div>
);

export default PaymentStoryView;
