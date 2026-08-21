import { useEffect, useMemo, useState } from 'react';
import { Search, Users, Wifi, WifiOff, RefreshCw, UserRound } from 'lucide-react';
import api from '../../api/client';
import {
    EmptyState,
    LoadingBlock,
    PageHeading,
    StatusPill,
    Surface,
} from '../../components/ui/ClientUi';

const getClientName = (client) => client?.nombre || client?.name || client?.cliente || client?.usuario || 'Cliente';
const getClientStatus = (client) => String(client?.estado || client?.status || '').toLowerCase().trim();
const getServiceId = (client) => client?.id_servicio || client?.servicio?.id_servicio || client?.id || '—';
const getPlan = (client) => client?.plan_internet || client?.plan || client?.servicio?.plan || client?.nombre_plan || '—';

const statusMeta = (client) => {
    const status = getClientStatus(client);
    const active = ['activo', 'active', 'online', 'habilitado'].includes(status);
    const suspended = status.includes('suspend') || status.includes('cort') || status.includes('inactiv');
    if (active) return { label: client?.estado || client?.status || 'Activo', tone: 'success' };
    if (suspended) return { label: client?.estado || client?.status || 'Suspendido', tone: 'danger' };
    return { label: client?.estado || client?.status || 'Sin estado', tone: 'neutral' };
};

const StaffDashboard = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let active = true;

        const fetchClients = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await api.get('/clientes/');
                const data = response?.data;
                const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
                if (active) setClients(list);
            } catch (requestError) {
                console.error('Staff client load error:', requestError);
                if (active) setError('No pudimos cargar los clientes en este momento.');
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchClients();
        return () => { active = false; };
    }, [reloadKey]);

    const metrics = useMemo(() => {
        let active = 0;
        let suspended = 0;
        let unknown = 0;

        clients.forEach((client) => {
            const status = getClientStatus(client);
            if (['activo', 'active', 'online', 'habilitado'].includes(status)) active += 1;
            else if (status.includes('suspend') || status.includes('cort') || status.includes('inactiv')) suspended += 1;
            else unknown += 1;
        });

        return { total: clients.length, active, suspended, unknown };
    }, [clients]);

    const filteredClients = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return clients.slice(0, 30);

        return clients.filter((client) => [
            getClientName(client),
            client?.cedula,
            client?.telefono,
            client?.usuario,
            getServiceId(client),
            client?.direccion,
        ].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle))).slice(0, 50);
    }, [clients, query]);

    return (
        <div className="space-y-6 pb-4">
            <PageHeading
                eyebrow="Operaciones"
                title="Resumen de clientes"
                description="Información operativa basada en los datos disponibles actualmente en WispHub."
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: 'Clientes cargados', value: metrics.total, icon: Users, tone: 'text-cyan-300 bg-cyan-400/10' },
                    { label: 'Activos', value: metrics.active, icon: Wifi, tone: 'text-emerald-300 bg-emerald-400/10' },
                    { label: 'Suspendidos', value: metrics.suspended, icon: WifiOff, tone: 'text-red-300 bg-red-400/10' },
                    { label: 'Sin clasificar', value: metrics.unknown, icon: UserRound, tone: 'text-slate-300 bg-white/[0.05]' },
                ].map(({ label, value, icon: Icon, tone }) => (
                    <Surface key={label} className="p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
                                <p className="mt-2 text-2xl font-bold text-white">{value}</p>
                            </div>
                            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                                <Icon size={18} />
                            </span>
                        </div>
                    </Surface>
                ))}
            </div>

            <Surface className="p-4">
                <div className="relative max-w-xl">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar por nombre, cédula, teléfono, usuario o servicio"
                        className="glass-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
                    />
                </div>
            </Surface>

            {loading ? <LoadingBlock label="Cargando clientes…" /> : null}

            {!loading && error ? (
                <EmptyState
                    icon={RefreshCw}
                    title="No pudimos cargar los clientes"
                    description={error}
                    action={(
                        <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="secondary-action">
                            <RefreshCw size={16} /> Reintentar
                        </button>
                    )}
                />
            ) : null}

            {!loading && !error ? (
                <Surface className="overflow-hidden">
                    <div className="border-b border-white/8 p-4 sm:p-5">
                        <h2 className="font-semibold text-white">Clientes</h2>
                        <p className="mt-1 text-xs text-slate-500">
                            {query ? `${filteredClients.length} coincidencia${filteredClients.length === 1 ? '' : 's'} mostradas` : `Mostrando hasta 30 de ${clients.length}`}
                        </p>
                    </div>

                    {filteredClients.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">No encontramos clientes con esa búsqueda.</div>
                    ) : (
                        <div className="divide-y divide-white/6">
                            {filteredClients.map((client, index) => {
                                const meta = statusMeta(client);
                                return (
                                    <div key={`${getServiceId(client)}-${index}`} className="grid gap-3 p-4 transition hover:bg-white/[0.025] sm:grid-cols-[1.4fr_.8fr_.8fr_auto] sm:items-center sm:px-5">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-white">{getClientName(client)}</p>
                                            <p className="mt-1 truncate text-xs text-slate-500">{client?.usuario || client?.cedula || client?.telefono || 'Sin identificador visible'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600 sm:hidden">Servicio</p>
                                            <p className="mt-1 text-sm font-medium text-slate-300 sm:mt-0">#{getServiceId(client)}</p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600 sm:hidden">Plan</p>
                                            <p className="mt-1 truncate text-sm text-slate-400 sm:mt-0">{getPlan(client)}</p>
                                        </div>
                                        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Surface>
            ) : null}
        </div>
    );
};

export default StaffDashboard;
