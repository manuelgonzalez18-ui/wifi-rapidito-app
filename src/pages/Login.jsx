import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Lock, Wifi, ArrowRight, AlertCircle, Eye, EyeOff, Smartphone } from 'lucide-react';
import useAuthStore from '../auth/authStore';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login, isLoading, error } = useAuthStore();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();

        let finalUsername = formData.username.trim();
        const isNumeric = /^\d+$/.test(finalUsername);

        if (finalUsername !== 'admin' && !finalUsername.includes('@') && !isNumeric) {
            finalUsername = `${finalUsername}@wifi-rapidito`;
        }

        try {
            const user = await login(finalUsername, formData.password);
            navigate(user.role === 'staff' ? '/staff' : '/client');
        } catch {
            // The store exposes the user-facing error.
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#050b14] px-4 py-8 text-slate-100 sm:px-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,.14),transparent_35rem)]" />
            <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
                <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#08111f]/85 shadow-2xl shadow-black/35 backdrop-blur-2xl lg:grid-cols-[.95fr_1.05fr]">
                    <section className="hidden border-r border-white/8 p-10 lg:flex lg:flex-col lg:justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300">
                                    <Wifi size={22} />
                                </span>
                                <div>
                                    <p className="font-bold text-white">Wifi Rapidito</p>
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Autogestión</p>
                                </div>
                            </div>

                            <h1 className="mt-14 max-w-md text-4xl font-bold leading-tight tracking-tight text-white">
                                Tu servicio, facturas, pagos y soporte en un solo lugar.
                            </h1>
                            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
                                Ingresa con tu usuario de Wifi Rapidito o con tu cédula para consultar y gestionar tu cuenta.
                            </p>
                        </div>

                        <div className="grid gap-3 text-sm text-slate-400">
                            <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                Consulta el estado de tu servicio.
                            </div>
                            <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3.5">
                                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                                Reporta pagos para validación Banesco.
                            </div>
                            <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3.5">
                                <span className="h-2 w-2 rounded-full bg-violet-400" />
                                Crea y consulta tickets de soporte.
                            </div>
                        </div>
                    </section>

                    <section className="p-5 sm:p-8 lg:p-10">
                        <div className="mx-auto max-w-md">
                            <div className="mb-8 flex items-center gap-3 lg:hidden">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300">
                                    <Wifi size={20} />
                                </span>
                                <div>
                                    <p className="font-bold text-white">Wifi Rapidito</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Autogestión</p>
                                </div>
                            </div>

                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                                <p className="app-eyebrow">Bienvenido</p>
                                <h2 className="text-3xl font-bold tracking-tight text-white">Ingresa a tu cuenta</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-400">Usa tu usuario o cédula y tu clave de acceso.</p>
                            </motion.div>

                            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                                <div>
                                    <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-300">Usuario o cédula</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        <input
                                            id="username"
                                            type="text"
                                            inputMode="text"
                                            autoComplete="username"
                                            placeholder="Ej. juanperez o 12345678"
                                            value={formData.username}
                                            onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                                            className="glass-input w-full rounded-xl py-3.5 pl-11 pr-4 text-sm"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-300">Clave</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            placeholder="Ingresa tu clave"
                                            value={formData.password}
                                            onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                                            className="glass-input w-full rounded-xl py-3.5 pl-11 pr-12 text-sm"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((value) => !value)}
                                            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.05] hover:text-white"
                                            aria-label={showPassword ? 'Ocultar clave' : 'Mostrar clave'}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence initial={false}>
                                    {error ? (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.07] p-4"
                                        >
                                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                                            <p className="text-sm leading-5 text-red-100/80">{error}</p>
                                        </motion.div>
                                    ) : null}
                                </AnimatePresence>

                                <button type="submit" disabled={isLoading} className="primary-action w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-60">
                                    {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
                                    {isLoading ? 'Ingresando…' : 'Ingresar'}
                                    {!isLoading ? <ArrowRight size={17} /> : null}
                                </button>
                            </form>

                            <div className="mt-8 border-t border-white/8 pt-6">
                                <Link to="/descargar" className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-4 text-sm text-slate-400 transition hover:border-cyan-400/20 hover:text-white">
                                    <span className="flex items-center gap-3"><Smartphone size={17} className="text-cyan-300" /> Descargar app para Android</span>
                                    <ArrowRight size={15} />
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
