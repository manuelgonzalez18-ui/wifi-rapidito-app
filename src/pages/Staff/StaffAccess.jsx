import { useEffect, useMemo, useState } from 'react';
import { KeyRound, RefreshCw, Search, ShieldCheck, UserCog, UserRoundCheck, UserRoundX, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api/client';
import { EmptyState, LoadingBlock, PageHeading, StatusPill, Surface } from '../../components/ui/ClientUi';

const PROFILES = [
    { value: 'tecnico', label: 'Técnico', description: 'Acceso al dashboard y reportes de soporte técnico.' },
    { value: 'finanzas', label: 'Finanzas', description: 'Acceso a las herramientas financieras autorizadas.' },
    { value: 'administrador', label: 'Administrador', description: 'Acceso completo al portal interno.' },
    { value: 'punto_venta', label: 'Punto de venta', description: 'Cuenta registrada sin permisos administrativos adicionales.' },
];

const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const StaffAccess = () => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(null);
    const [profile, setProfile] = useState('tecnico');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const loadDirectory = async (refresh = false) => {
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/staff_auth.php', { action: 'directory', refresh }, {
                withCredentials: true,
                timeout: 20000,
                headers: { 'Cache-Control': 'no-cache' },
            });
            setStaff(Array.isArray(response?.data?.staff) ? response.data.staff : []);
            setWarning(response?.data?.warning || '');
        } catch (requestError) {
            setError(requestError?.response?.data?.error || 'No pudimos sincronizar el personal de WispHub.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDirectory(false);
    }, []);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return staff;
        return staff.filter((item) => [item.name, item.username, item.email]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(needle));
    }, [staff, query]);

    const openAccess = (item) => {
        setSelected(item);
        setProfile(item.profile || 'tecnico');
        setPassword('');
    };

    const saveAccess = async (event) => {
        event.preventDefault();
        if (!selected || password.length < 8) {
            toast.error('La clave debe tener al menos 8 caracteres.');
            return;
        }

        setSaving(true);
        try {
            await api.post('/staff_auth.php', {
                action: 'set_access',
                username: selected.username,
                password,
                profile,
            }, { withCredentials: true, timeout: 20000 });
            toast.success(selected.enabled ? 'Clave y permisos actualizados' : 'Acceso habilitado');
            setSelected(null);
            setPassword('');
            await loadDirectory(false);
        } catch (requestError) {
            toast.error(requestError?.response?.data?.error || 'No pudimos guardar el acceso.');
        } finally {
            setSaving(false);
        }
    };

    const disableAccess = async (item) => {
        if (!window.confirm(`¿Deshabilitar el acceso de ${item.name || item.username}?`)) return;
        try {
            await api.post('/staff_auth.php', { action: 'disable_access', username: item.username }, {
                withCredentials: true,
                timeout: 12000,
            });
            toast.success('Acceso deshabilitado');
            await loadDirectory(false);
        } catch (requestError) {
            toast.error(requestError?.response?.data?.error || 'No pudimos deshabilitar el acceso.');
        }
    };

    return (
        <div className="space-y-6 pb-6">
            <PageHeading
                eyebrow="Seguridad · WispHub"
                title="Accesos del personal"
                description="Sincroniza los usuarios Staff de WispHub y habilita un acceso individual al portal sin almacenar contraseñas en texto plano."
                action={(
                    <button type="button" onClick={() => loadDirectory(true)} className="secondary-action" disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sincronizar WispHub
                    </button>
                )}
            />

            <Surface className="border-cyan-400/15 bg-cyan-400/[0.035] p-5">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                    <div>
                        <p className="font-semibold text-white">Cómo funciona este acceso</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">
                            El nombre de usuario se obtiene del directorio oficial de WispHub. La API de WispHub no permite validar la contraseña del Staff, por eso la clave de este portal se configura aquí y solo se guarda como hash fuera de la carpeta pública del sitio.
                        </p>
                    </div>
                </div>
            </Surface>

            {warning ? <Surface className="border-amber-400/20 bg-amber-400/[0.05] p-4 text-sm text-amber-100/80">{warning}</Surface> : null}

            <Surface className="p-4 sm:p-5">
                <div className="relative max-w-xl">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar por nombre, usuario o correo…"
                        className="glass-input w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                    />
                </div>
                <p className="mt-3 text-xs text-slate-500">{filtered.length} de {staff.length} usuarios Staff</p>
            </Surface>

            {loading ? <LoadingBlock label="Sincronizando directorio Staff de WispHub…" /> : null}
            {!loading && error ? <EmptyState icon={UserCog} title="No pudimos cargar el personal" description={error} action={<button type="button" onClick={() => loadDirectory(true)} className="secondary-action">Reintentar</button>} /> : null}
            {!loading && !error && filtered.length === 0 ? <EmptyState icon={UserCog} title="No encontramos personal" description="Prueba otra búsqueda o sincroniza nuevamente con WispHub." /> : null}

            {!loading && !error && filtered.length > 0 ? (
                <div className="grid gap-3 xl:grid-cols-2">
                    {filtered.map((item) => (
                        <Surface key={item.username} className="p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="truncate font-semibold text-white">{item.name || item.username}</h2>
                                        <StatusPill tone={item.enabled ? 'success' : 'neutral'}>{item.enabled ? 'Habilitado' : 'Sin acceso'}</StatusPill>
                                    </div>
                                    <p className="mt-1 break-all text-sm text-cyan-300/80">{item.username}</p>
                                    <p className="mt-1 truncate text-xs text-slate-500">{item.email || 'Sin correo registrado'}</p>
                                </div>
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.enabled ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/[0.04] text-slate-500'}`}>
                                    {item.enabled ? <UserRoundCheck size={19} /> : <UserRoundX size={19} />}
                                </span>
                            </div>

                            <div className="mt-4 grid gap-2 rounded-xl border border-white/8 bg-black/10 p-3 text-xs sm:grid-cols-2">
                                <div><span className="text-slate-600">Perfil</span><p className="mt-1 font-medium capitalize text-slate-300">{item.profile?.replace('_', ' ') || '—'}</p></div>
                                <div><span className="text-slate-600">Actualizado</span><p className="mt-1 font-medium text-slate-300">{formatDate(item.updated_at)}</p></div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <button type="button" onClick={() => openAccess(item)} className="primary-action">
                                    <KeyRound size={16} /> {item.enabled ? 'Cambiar acceso' : 'Habilitar acceso'}
                                </button>
                                {item.enabled ? (
                                    <button type="button" onClick={() => disableAccess(item)} className="secondary-action text-red-200 hover:text-red-100">
                                        <UserRoundX size={16} /> Deshabilitar
                                    </button>
                                ) : null}
                            </div>
                        </Surface>
                    ))}
                </div>
            ) : null}

            {selected ? (
                <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#0b1422] shadow-2xl sm:rounded-3xl">
                        <div className="flex items-center justify-between border-b border-white/8 p-5">
                            <div>
                                <p className="app-eyebrow">Acceso individual</p>
                                <h2 className="text-xl font-bold text-white">{selected.name || selected.username}</h2>
                                <p className="mt-1 text-xs text-slate-500">{selected.username}</p>
                            </div>
                            <button type="button" onClick={() => setSelected(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-slate-400 hover:text-white" aria-label="Cerrar">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={saveAccess} className="space-y-5 p-5 sm:p-6">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-300">Perfil en el portal</label>
                                <select value={profile} onChange={(event) => setProfile(event.target.value)} className="glass-input w-full rounded-xl px-4 py-3 text-sm">
                                    {PROFILES.map((item) => <option key={item.value} value={item.value} className="bg-slate-900">{item.label}</option>)}
                                </select>
                                <p className="mt-2 text-xs leading-5 text-slate-500">{PROFILES.find((item) => item.value === profile)?.description}</p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-300">Clave para el portal</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    minLength={8}
                                    autoComplete="new-password"
                                    placeholder="Mínimo 8 caracteres"
                                    className="glass-input w-full rounded-xl px-4 py-3 text-sm"
                                    required
                                />
                                <p className="mt-2 text-xs leading-5 text-slate-500">Esta clave no se envía a WispHub ni se guarda en texto plano.</p>
                            </div>

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <button type="button" onClick={() => setSelected(null)} className="secondary-action">Cancelar</button>
                                <button type="submit" className="primary-action" disabled={saving}>
                                    <KeyRound size={16} /> {saving ? 'Guardando…' : 'Guardar acceso'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default StaffAccess;
