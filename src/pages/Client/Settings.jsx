import { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, Info, Smartphone, UserRound } from 'lucide-react';
import useAuthStore from '../../auth/authStore';
import notificationService from '../../services/notificationService';
import { PageHeading, StatusPill, Surface } from '../../components/ui/ClientUi';

const permissionLabel = (permission) => {
    if (permission === 'granted') return { label: 'Activadas', tone: 'success' };
    if (permission === 'denied') return { label: 'Bloqueadas', tone: 'danger' };
    if (permission === 'unsupported') return { label: 'No disponibles', tone: 'neutral' };
    return { label: 'Sin activar', tone: 'warning' };
};

const Settings = () => {
    const { user } = useAuthStore();
    const [permission, setPermission] = useState('default');
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        if (!('Notification' in window)) {
            setPermission('unsupported');
            return;
        }
        setPermission(Notification.permission);
    }, []);

    const enableNotifications = async () => {
        if (permission === 'unsupported' || permission === 'denied') return;
        setRequesting(true);
        try {
            const granted = await notificationService.requestPermission();
            setPermission(granted ? 'granted' : Notification.permission);
        } finally {
            setRequesting(false);
        }
    };

    const meta = permissionLabel(permission);

    return (
        <div className="mx-auto max-w-4xl space-y-6 pb-4">
            <PageHeading
                eyebrow="Tu cuenta"
                title="Configuración"
                description="Consulta la información básica de tu cuenta y decide si quieres recibir avisos del portal."
            />

            <div className="grid gap-5 lg:grid-cols-2">
                <Surface className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-slate-300">
                            <UserRound size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white">Información de cuenta</p>
                            <p className="mt-1 text-sm text-slate-500">Datos asociados al servicio con el que ingresaste.</p>
                        </div>
                    </div>

                    <dl className="mt-6 divide-y divide-white/7 rounded-xl border border-white/8 bg-black/10 px-4">
                        <div className="flex items-center justify-between gap-4 py-3.5">
                            <dt className="text-sm text-slate-500">Cliente</dt>
                            <dd className="min-w-0 truncate text-right text-sm font-semibold text-slate-200">{user?.nombre || user?.name || 'Cliente'}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-3.5">
                            <dt className="text-sm text-slate-500">Servicio</dt>
                            <dd className="text-right text-sm font-semibold text-slate-200">#{user?.id_servicio || '—'}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-3.5">
                            <dt className="text-sm text-slate-500">Teléfono</dt>
                            <dd className="min-w-0 truncate text-right text-sm font-semibold text-slate-200">{user?.telefono || 'No disponible'}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-3.5">
                            <dt className="text-sm text-slate-500">Estado</dt>
                            <dd><StatusPill tone={String(user?.estado || '').toLowerCase().includes('suspend') ? 'danger' : 'success'}>{user?.estado || 'Activo'}</StatusPill></dd>
                        </div>
                    </dl>
                </Surface>

                <Surface className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                                {permission === 'denied' ? <BellOff size={20} /> : <Bell size={20} />}
                            </span>
                            <div>
                                <p className="font-semibold text-white">Notificaciones</p>
                                <p className="mt-1 text-sm leading-6 text-slate-500">Recibe avisos útiles cuando el navegador lo permita.</p>
                            </div>
                        </div>
                        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                    </div>

                    <div className="mt-6 rounded-xl border border-white/8 bg-black/10 p-4">
                        <p className="text-sm font-semibold text-slate-200">¿Qué podemos avisarte?</p>
                        <div className="mt-3 space-y-2.5 text-sm text-slate-400">
                            {['Pago registrado', 'Servicio reactivado', 'Promesa de pago', 'Actualización de soporte'].map((label) => (
                                <div key={label} className="flex items-center gap-2.5">
                                    <CheckCircle2 size={15} className="text-emerald-400/80" /> {label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {permission === 'default' ? (
                        <button type="button" onClick={enableNotifications} disabled={requesting} className="primary-action mt-5 w-full disabled:opacity-60">
                            <Bell size={16} /> {requesting ? 'Solicitando permiso…' : 'Activar notificaciones'}
                        </button>
                    ) : null}

                    {permission === 'denied' ? (
                        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
                            <Info size={17} className="mt-0.5 shrink-0 text-amber-300" />
                            <p className="text-sm leading-6 text-slate-400">Las notificaciones están bloqueadas por el navegador. Puedes habilitarlas desde los permisos del sitio o continuar usando el portal normalmente.</p>
                        </div>
                    ) : null}
                </Surface>
            </div>

            <Surface className="flex items-start gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300"><Smartphone size={18} /></span>
                <div>
                    <p className="font-semibold text-white">Diseñado para móvil</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">La misma cuenta funciona en el portal web y en la aplicación Android de Wifi Rapidito.</p>
                </div>
            </Surface>
        </div>
    );
};

export default Settings;
