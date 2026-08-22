import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Lock, Wifi, ArrowRight, AlertCircle, Eye, EyeOff, Smartphone, ShieldCheck } from 'lucide-react';
import useAuthStore from '../auth/authStore';

const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isLoading, error } = useAuthStore();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [validationError, setValidationError] = useState('');

    const requestedPath = typeof location.state?.from === 'string' && location.state.from.startsWith('/')
        ? location.state.from
        : null;
    const staffDestination = requestedPath && (
        requestedPath.startsWith('/staff') ||
        requestedPath.startsWith('/monitor/') ||
        requestedPath.startsWith('/finance/')
    );
    const staffMode = Boolean(staffDestination) || new URLSearchParams(location.search).get('staff') === '1';

    const handleSubmit = async (event) => {
        event.preventDefault();
        setValidationError('');

        let finalUsername = formData.username
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '');

        if (/^\d+$/.test(finalUsername)) {
            setValidationError(staffMode
                ? 'Ingresa el usuario asignado al personal, no un número de cédula.'
                : 'El acceso de clientes es únicamente con tu usuario. Ejemplo: juanperez.');
            return;
        }

        if (finalUsername !== 'admin' && !finalUsername.includes('@')) {
            finalUsername = `${finalUsername}@wifi-rapidito`;
        }

        try {
            const user = await login(finalUsername, formData.password, { preferStaff: staffMode });

            if (user.role === 'staff') {
                const destination = staffDestination ? requestedPath : '/staff/support';
                navigate(destination, { replace: true });
                return;
            }

            const destination = requestedPath?.startsWith('/client') ? requestedPath : '/client';
            navigate(destination, { replace: true });
        } catch {
            // The store exposes the user-facing error.
        }
    };

    const displayedError = validationError || error;

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#050b14] px-4 py-8 text-slate-100 sm:px-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,.14),transparent_35rem)]" />
            <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
                <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#08111f]/85 shadow-2xl shadow-black/35 backdrop-blur-2xl lg:grid-cols-[.95fr_1.05fr]">
                    <section className="hidden border-r border-white/8 p-10 lg:flex lg:flex-col lg:justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300"><Wifi size={22} /></span>
                                <div><p className="font-bold text-white">Wifi Rapidito</p><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{staffMode ? 'Operaciones' : 'Autogestión'}</p></div>
                            </div>

                            <h1 className="mt-14 max-w-md text-4xl font-bold leading-tight tracking-tight text-white">
                                {staffMode ? 'Operaciones y soporte técnico en un solo lugar.' : 'Tu servicio, facturas, pagos y soporte en un solo lugar.'}
                            </h1>
                            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
                                {staffMode ? 'Acceso exclusivo para personal autorizado de Wifi Rapidito.' : 'Ingresa con tu usuario de Wifi Rapidito para consultar y gestionar tu cuenta.'}
                            </p>
                        </div>

                        <div className="grid gap-3 text-sm text-slate-400">
                            {staffMode ? (
                                <>
                                    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Consulta y organiza tickets de WispHub.</div>
                                    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3.5"><span className="h-2 w-2 rounded-full bg-cyan-400" /> Genera órdenes y reportes PDF.</div>
                                    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3.5"><span className="h-2 w-2 rounded-full bg-violet-400" /> Permisos separados por usuario.</div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Consulta el estado de tu servicio.</div>
                                    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3.5"><span className="h-2 w-2 rounded-full bg-cyan-400" /> Reporta pagos para validación Banesco.</div>
                                    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3.5"><span className="h-2 w-2 rounded-full bg-violet-400" /> Crea y consulta tickets de soporte.</div>
                                </>
                            )}
                        </div>
                    </section>

                    <section className="p-5 sm:p-8 lg:p-10">
                        <div className="mx-auto max-w-md">
                            <div className="mb-8 flex items-center gap-3 lg:hidden">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300"><Wifi size={20} /></span>
                                <div><p className="font-bold text-white">Wifi Rapidito</p><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{staffMode ? 'Operaciones' : 'Autogestión'}</p></div>
                            </div>

                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                                <p className="app-eyebrow">{staffMode ? 'Personal autorizado' : 'Bienvenido'}</p>
                                <h2 className="text-3xl font-bold tracking-tight text-white">{staffMode ? 'Acceso de personal' : 'Ingresa a tu cuenta'}</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                    {staffMode
                                        ? 'Usa el usuario Staff habilitado para este portal y su clave de acceso.'
                                        : 'Usa tu usuario y tu clave de acceso. Tu usuario es tu nombre y apellido pegados en minúsculas.'}
                                </p>
                            </motion.div>

                            {staffMode ? (
                                <div className="mt-5 flex items-start gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4">
                                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                                    <div>
                                        <p className="text-sm font-semibold text-cyan-100">Acceso protegido</p>
                                        <p className="mt-1 text-xs leading-5 text-cyan-100/65">El usuario proviene del directorio Staff de WispHub. La clave de este portal se administra de forma independiente y segura.</p>
                                    </div>
                                </div>
                            ) : null}

                            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                                <div>
                                    <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-300">{staffMode ? 'Usuario Staff' : 'Usuario'}</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        <input
                                            id="username"
                                            type="text"
                                            inputMode="text"
                                            autoComplete="username"
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                            spellCheck={false}
                                            placeholder={staffMode ? 'Ej. tecnico1' : 'Ej. juanperez'}
                                            value={formData.username}
                                            onChange={(event) => {
                                                const normalizedUsername = event.target.value.toLowerCase().replace(/\s+/g, '');
                                                setValidationError('');
                                                setFormData({ ...formData, username: normalizedUsername });
                                            }}
                                            className="glass-input w-full rounded-xl py-3.5 pl-11 pr-4 text-sm"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500">{staffMode ? 'Puedes escribir el usuario con o sin @wifi-rapidito.' : <>Ejemplo: Juan Perez → <span className="font-mono text-cyan-300/80">juanperez</span></>}</p>
                                </div>

                                <div>
                                    <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-300">Clave</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Ingresa tu clave" value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} className="glass-input w-full rounded-xl py-3.5 pl-11 pr-12 text-sm" required />
                                        <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.05] hover:text-white" aria-label={showPassword ? 'Ocultar clave' : 'Mostrar clave'}>
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence initial={false}>
                                    {displayedError ? (
                                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.07] p-4">
                                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" /><p className="text-sm leading-5 text-red-100/80">{displayedError}</p>
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
                                {staffMode ? (
                                    <Link to="/login" className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-4 text-sm text-slate-400 transition hover:border-cyan-400/20 hover:text-white">
                                        <span>Volver al acceso de clientes</span><ArrowRight size={15} />
                                    </Link>
                                ) : (
                                    <div className="space-y-2">
                                        <Link to="/descargar" className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-4 text-sm text-slate-400 transition hover:border-cyan-400/20 hover:text-white">
                                            <span className="flex items-center gap-3"><Smartphone size={17} className="text-cyan-300" /> Descargar app para Android</span><ArrowRight size={15} />
                                        </Link>
                                        <Link to="/login?staff=1" className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-4 text-xs font-semibold text-slate-500 transition hover:bg-white/[0.025] hover:text-cyan-300">
                                            <span className="flex items-center gap-2"><ShieldCheck size={15} /> Acceso de personal</span><ArrowRight size={14} />
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
