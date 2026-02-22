import { useState } from 'react';
import { Bug, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../auth/authStore';

const DebugPanel = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuthStore();

    const debugInfo = {
        'Usuario Actual': user?.name || user?.nombre || 'N/A',
        'Modo Demo': user?.is_offline_mode ? '🔴 SÍ (Datos Falsos)' : '🟢 NO (Datos Reales)',
        'Cédula': user?.cedula || 'N/A',
        'ID Cliente': user?.id_cliente || 'N/A',
        'ID Servicio': user?.id_servicio || 'N/A',
        'Usuario Login': user?.usuario || 'N/A',
        'Token': user ? (localStorage.getItem('token')?.substring(0, 20) + '...') : 'N/A',
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-4 right-4 z-50 bg-purple-600 hover:bg-purple-500 text-white rounded-full p-4 shadow-lg transition-all"
                title="Debug Panel"
            >
                <Bug size={24} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-20 right-4 z-50 glass-panel p-6 rounded-xl border border-purple-500/30 max-w-md"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                                <Bug size={20} />
                                Panel de Diagnóstico
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-2 text-sm font-mono">
                            {Object.entries(debugInfo).map(([key, value]) => (
                                <div key={key} className="border-b border-white/5 pb-2">
                                    <div className="text-slate-500 text-xs">{key}</div>
                                    <div className="text-cyan-400">{value}</div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <p className="text-xs text-amber-400">
                                💡 <strong>Tip:</strong> Abre la consola del navegador (F12) para ver logs detallados de las búsquedas en Wisphub.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default DebugPanel;
