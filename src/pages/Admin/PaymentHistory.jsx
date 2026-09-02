import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, CreditCard, RefreshCw, Search, ShieldCheck, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

const SOURCE_LABELS = {
  assistant_virtual: 'Asistente virtual',
  portal_autogestion: 'Portal autogestión',
  unknown: 'Sin identificar',
};

const moneyBs = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateTime = new Intl.DateTimeFormat('es-VE', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Caracas',
});

const StatCard = ({ icon: Icon, label, value, detail }) => (
  <div className="app-surface p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-cyan-300">
        <Icon size={20} />
      </div>
    </div>
  </div>
);

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ count: 0, amount_bs: 0, assistant_count: 0, portal_count: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '1000' });
      const response = await fetch(`/payment_history.php?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No se pudo cargar el historial de pagos.');
      }
      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setSummary(data.summary || {});
    } catch (error) {
      toast.error(error.message || 'No se pudo cargar el historial de pagos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return payments.filter((payment) => {
      if (source !== 'all' && payment.source !== source) return false;
      if (!needle) return true;
      const text = [
        payment.client_name,
        payment.user_name,
        payment.invoice_id,
        payment.reference,
        payment.reference_key,
        payment.service_id,
        payment.origin_bank,
      ].join(' ').toLowerCase();
      return text.includes(needle);
    });
  }, [payments, query, source]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="app-eyebrow">Finanzas · Control bancario</p>
          <h1 className="text-2xl font-bold text-white">Pagos validados automáticamente</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Historial único de validaciones Banesco realizadas por el asistente virtual y el portal de autogestión.
            La misma referencia no puede registrarse dos veces en ninguno de los dos canales.
          </p>
        </div>
        <button
          type="button"
          onClick={loadPayments}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07] disabled:opacity-50"
        >
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ShieldCheck} label="Validados" value={summary.count || 0} detail="Referencias únicas registradas" />
        <StatCard icon={CreditCard} label="Monto validado" value={`Bs ${moneyBs.format(Number(summary.amount_bs || 0))}`} />
        <StatCard icon={Bot} label="Asistente virtual" value={summary.assistant_count || 0} detail="Pagos recibidos por WhatsApp" />
        <StatCard icon={Smartphone} label="Portal" value={summary.portal_count || 0} detail="Pagos desde autogestión" />
      </div>

      <div className="app-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/8 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cliente, usuario, factura o referencia…"
              className="min-h-11 w-full rounded-xl border border-white/10 bg-black/10 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30"
            />
          </div>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="min-h-11 rounded-xl border border-white/10 bg-[#0b1625] px-3 text-sm text-slate-200 outline-none"
          >
            <option value="all">Todos los canales</option>
            <option value="assistant_virtual">Asistente virtual</option>
            <option value="portal_autogestion">Portal autogestión</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/8 bg-white/[0.02] text-[11px] uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Factura</th>
                <th className="px-4 py-3">Referencia</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Banco / método</th>
                <th className="px-4 py-3">WispHub</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {loading ? (
                <tr><td colSpan="8" className="px-4 py-10 text-center text-slate-500">Cargando historial…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="8" className="px-4 py-10 text-center text-slate-500">No hay pagos que coincidan con el filtro.</td></tr>
              ) : filtered.map((payment) => (
                <tr key={payment.id} className="text-slate-300 transition hover:bg-white/[0.025]">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                    {payment.validated_at ? dateTime.format(new Date(payment.validated_at)) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{payment.client_name || payment.user_name || 'Cliente'}</p>
                    {payment.user_name && payment.user_name !== payment.client_name ? <p className="text-xs text-slate-500">{payment.user_name}</p> : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{payment.invoice_id || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-cyan-200">{payment.reference || payment.reference_key || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-white">Bs {moneyBs.format(Number(payment.amount_bs || 0))}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs">{SOURCE_LABELS[payment.source] || SOURCE_LABELS.unknown}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p>{payment.origin_bank || 'Banesco'}</p>
                    <p className="text-xs text-slate-500">{payment.payment_method || 'Transferencia bancaria'}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{payment.wisphub_task_id || 'Registrado'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
