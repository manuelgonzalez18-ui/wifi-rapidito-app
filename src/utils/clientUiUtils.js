/* eslint-disable react-refresh/only-export-components */
export const formatMoney = (value) => {
  const amount = Number.parseFloat(value ?? 0);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : '$0.00';
};

export const formatDate = (value, fallback = '—') => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const normalizeInvoiceStatus = (status) => {
  const value = String(status ?? '').toLowerCase().trim();
  if (value === '2' || value.includes('pendiente') || value.includes('por_pagar') || value.includes('unpaid')) return 'pending';
  if (value.includes('pagad') || value.includes('paid')) return 'paid';
  if (value.includes('vencid')) return 'overdue';
  if (value.includes('cancel')) return 'cancelled';
  return 'neutral';
};

export const invoiceStatusMeta = (status) => {
  const normalized = normalizeInvoiceStatus(status);
  const map = {
    pending: { label: 'Pendiente', tone: 'warning' },
    paid: { label: 'Pagada', tone: 'success' },
    overdue: { label: 'Vencida', tone: 'danger' },
    cancelled: { label: 'Cancelada', tone: 'neutral' },
    neutral: { label: status || 'Sin estado', tone: 'neutral' },
  };
  return map[normalized];
};
