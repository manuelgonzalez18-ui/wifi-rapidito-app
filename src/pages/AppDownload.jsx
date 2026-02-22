import { motion } from 'framer-motion';
import { Download, Smartphone, ShieldCheck, Play, ArrowRight, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AppDownload = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen w-full flex flex-col items-center overflow-x-hidden bg-cyber-dark relative selection:bg-neon-blue/30">
            {/* Holographic Background Grid */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f3ff0a_1px,transparent_1px),linear-gradient(to_bottom,#00f3ff0a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_100%)]" />
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,243,255,0.08)_0%,transparent_50%)]" />
            </div>

            {/* Navbar */}
            <nav className="w-full relative z-20 px-6 py-6 flex justify-between items-center max-w-6xl">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/login')}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.3)]">
                        <Smartphone className="text-white w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold font-display tracking-tight text-white m-0 leading-tight">
                            WIFI <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-white">RAPIDITO</span>
                        </h1>
                    </div>
                </div>
                <div>
                    <button onClick={() => navigate('/login')} className="px-5 py-2 glass-panel border border-neon-blue/20 text-neon-blue text-xs font-bold font-mono tracking-widest rounded-lg hover:bg-neon-blue/10 transition-colors uppercase">
                        INGRESAR
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 w-full max-w-6xl px-6 pt-12 pb-20 relative z-10 flex flex-col lg:flex-row items-center gap-16 lg:gap-8">

                {/* Text Content */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex-1 text-center lg:text-left space-y-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-neon-blue/30 mx-auto lg:mx-0">
                        <span className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
                        <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-widest">NUEVA APP PARA ANDROID</span>
                    </div>

                    <h2 className="text-5xl lg:text-7xl font-bold font-display text-white leading-[1.1]">
                        Tu Internet<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-cyan-400 to-blue-600">
                            En Tus Manos
                        </span>
                    </h2>

                    <p className="text-lg text-slate-400 max-w-xl mx-auto lg:mx-0">
                        Descarga la aplicación oficial de Wi-Fi Rapidito. Consulta tus facturas, reporta pagos y recibe asistencia técnica directa desde tu celular, sin intermediarios.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                        {/* THE DOWNLOAD BUTTON */}
                        <a
                            href="/Wifi-Rapidito.apk"
                            download="Wifi-Rapidito.apk"
                            className="group relative px-8 py-5 rounded-xl font-display font-bold text-sm tracking-[0.1em] overflow-hidden flex items-center justify-center gap-3 bg-gradient-to-r from-neon-blue to-blue-600 text-white shadow-[0_0_40px_rgba(0,243,255,0.4)] hover:shadow-[0_0_60px_rgba(0,243,255,0.6)] transition-all"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <Download size={20} className="group-hover:-translate-y-1 transition-transform" />
                                DESCARGAR APK GRATIS
                            </span>
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </a>

                        <button onClick={() => navigate('/login')} className="px-8 py-5 rounded-xl font-display font-bold text-sm tracking-[0.1em] text-white glass-panel border border-white/10 hover:border-white/30 transition-all flex items-center justify-center gap-2">
                            PREFIERO USAR LA WEB <ArrowRight size={18} />
                        </button>
                    </div>

                    <div className="flex items-center gap-6 justify-center lg:justify-start text-xs text-slate-500 font-mono pt-6">
                        <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-cyan-500" /> Seguro</div>
                        <div className="flex items-center gap-2"><Play size={16} className="text-cyan-500" /> Rápido</div>
                        <div className="flex items-center gap-2"><Smartphone size={16} className="text-cyan-500" /> Android 7.0+</div>
                    </div>
                </motion.div>

                {/* Cyberpunk Phone Mockup */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="flex-1 w-full max-w-md relative"
                >
                    {/* Glowing Orbs behind the phone */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-neon-blue/20 blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-600/20 blur-[80px] rounded-full" />

                    {/* Phone Frame */}
                    <div className="relative mx-auto w-[280px] h-[580px] sm:w-[320px] sm:h-[650px] bg-slate-900 border-[8px] border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden ring-1 ring-white/10">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20 flex items-center justify-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                            <div className="w-16 h-1.5 rounded-full bg-slate-900" />
                        </div>

                        {/* Screen Content - A fake dashboard */}
                        <div className="absolute inset-0 bg-cyber-dark p-6 pt-12 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-white font-bold font-display text-lg">Hola, Cliente</h3>
                                    <p className="text-cyan-500/50 text-[10px] uppercase tracking-widest">Estado: Al día</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue to-blue-600 flex items-center justify-center">
                                    <User size={18} className="text-white" />
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-900/40 border border-neon-blue/20 relative overflow-hidden mt-2">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-neon-blue/10 blur-xl rounded-full" />
                                <p className="text-slate-400 text-xs mb-1">Monto a Pagar</p>
                                <h2 className="text-3xl font-display font-bold text-white mb-4">$25.00</h2>
                                <div className="w-full py-2 bg-neon-blue/10 rounded-lg text-neon-blue text-xs font-bold text-center border border-neon-blue/20">
                                    REPORTAR PAGO
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1 p-4 rounded-xl bg-slate-900 border border-white/5 flex flex-col items-center justify-center gap-2">
                                    <ShieldCheck className="text-cyan-500" size={24} />
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Soporte</span>
                                </div>
                                <div className="flex-1 p-4 rounded-xl bg-slate-900 border border-white/5 flex flex-col items-center justify-center gap-2">
                                    <Settings className="text-cyan-500" size={24} />
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Ajustes</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>

            {/* Global Scanline Effect */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] animate-pulse bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-50"></div>
        </div>
    );
};

export default AppDownload;
