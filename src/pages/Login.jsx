import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Wifi, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import useAuthStore from '../auth/authStore';
import Button from '../components/ui/Button';
import DebugPanel from '../components/ui/DebugPanel';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login, isLoading, error } = useAuthStore();

    const [formData, setFormData] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Automatically append suffix if it's not present and it's NOT admin or a cedula
            let finalUsername = formData.username.trim();
            const isNumeric = /^\d+$/.test(finalUsername); // Detectar si es cédula (solo números)

            if (finalUsername !== 'admin' && !finalUsername.includes('@') && !isNumeric) {
                // Solo agregar sufijo para usernames, NO para cédulas
                finalUsername = `${finalUsername}@wifi-rapidito`;
            }

            const user = await login(finalUsername, formData.password);
            if (user.role === 'staff') {
                navigate('/staff');
            } else {
                navigate('/client');
            }
        } catch (err) {
            // Error handled in store
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-cyber-dark overflow-hidden relative selection:bg-neon-blue/30">
            {/* Holographic Background Grid */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f3ff0a_1px,transparent_1px),linear-gradient(to_bottom,#00f3ff0a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,243,255,0.05)_0%,transparent_50%)]" />
            </div>

            <div className="w-full max-w-lg p-6 relative z-10">
                {/* HUD Header */}
                <div className="mb-8 text-center relative">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-block mb-4"
                    >
                        <div className="relative p-4 glass-panel border-neon-blue/40 shadow-[0_0_20px_rgba(0,243,255,0.2)]">
                            <Wifi className="text-neon-blue w-12 h-12 animate-pulse" />
                            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-neon-blue" />
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-neon-blue" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <h1 className="text-5xl font-bold font-display tracking-tight text-white neon-text mb-2">
                            WIFI <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-white">RAPIDITO</span>
                        </h1>
                        <div className="flex items-center justify-center gap-4 text-cyan-500/50 text-[10px] uppercase tracking-[0.4em] font-mono">
                            <span className="h-[1px] w-8 bg-current" />
                            Internet al alcance de todos
                            <span className="h-[1px] w-8 bg-current" />
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass-panel p-8 border-neon-blue/20"
                >
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Username with Suffix Box */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-70">
                                Usuario
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50 group-focus-within:text-neon-blue transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Ej: norapalacios"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full bg-cyan-950/20 glass-input rounded-xl pl-12 pr-4 py-4 text-white focus:border-neon-blue/50 outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-70">
                                Clave de Seguridad
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50 group-focus-within:text-neon-blue transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-cyan-950/20 glass-input rounded-xl pl-12 pr-12 py-4 text-white focus:border-neon-blue/50 outline-none transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-500/50 hover:text-neon-blue transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mt-4 ml-1">
                                <input
                                    id="show-pass"
                                    type="checkbox"
                                    checked={showPassword}
                                    onChange={(e) => setShowPassword(e.target.checked)}
                                    className="w-4 h-4 border-2 border-cyan-500/30 bg-transparent rounded cursor-pointer accent-neon-blue"
                                />
                                <label htmlFor="show-pass" className="text-[10px] text-cyan-200/50 uppercase tracking-wider font-bold cursor-pointer hover:text-cyan-200 transition-colors">
                                    Mostrar contraseña
                                </label>
                            </div>
                        </div>

                        {/* Error Message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex gap-3 items-center overflow-hidden"
                                >
                                    <ShieldCheck className="text-red-400 w-5 h-5 flex-shrink-0" />
                                    <div className="text-[10px] font-bold text-red-400 uppercase leading-tight tracking-wider">
                                        {error}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                className="w-full py-6 font-display text-xs font-bold tracking-[0.2em] bg-gradient-to-r from-neon-blue/80 to-blue-600/80 hover:from-neon-blue hover:to-blue-600 shadow-[0_0_30px_rgba(0,243,255,0.2)] border border-neon-blue/50 rounded-xl group relative overflow-hidden"
                                isLoading={isLoading}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    ACEPTAR <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent,rgba(255,255,255,0.1),transparent)] -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            </Button>
                        </div>
                    </form>
                </motion.div>

                {/* Footer HUD elements */}
                <div className="mt-8 flex justify-between items-center text-[8px] font-mono text-cyan-500/30 uppercase tracking-[0.3em]">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        NODES ONLINE
                    </div>
                    <div>SECURE LINK V4.0.2</div>
                    <div>© WIFI RAPIDITO 2026</div>
                </div>
            </div>

            {/* Global Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] animate-pulse bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-50"></div>
        </div>
    );
};

export default LoginPage;
