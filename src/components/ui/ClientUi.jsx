/* eslint-disable react-refresh/only-export-components */
import { createElement } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

export { formatMoney, formatDate, normalizeInvoiceStatus, invoiceStatusMeta } from '../../utils/clientUiUtils';

export const PageHeading = ({ eyebrow, title, description, action }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow ? <p className="app-eyebrow">{eyebrow}</p> : null}
      <h1 className="app-page-title">{title}</h1>
      {description ? <p className="app-page-description">{description}</p> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export const Surface = ({ children, className = '' }) => (
  <div className={`app-surface ${className}`}>{children}</div>
);

export const StatusPill = ({ tone = 'neutral', children, className = '' }) => (
  <span className={`status-pill status-pill-${tone} ${className}`}>{children}</span>
);

export const LoadingBlock = ({ label = 'Cargando información…', compact = false }) => (
  <div className={`app-surface flex items-center justify-center gap-3 text-slate-400 ${compact ? 'p-5' : 'p-10'}`}>
    <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
    <span className="text-sm font-medium">{label}</span>
  </div>
);

export const EmptyState = ({ icon = AlertCircle, title, description, action }) => (
  <div className="app-surface p-8 text-center sm:p-10">
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">
      {createElement(icon, { className: 'h-6 w-6' })}
    </div>
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p> : null}
    {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
  </div>
);

export const QuickAction = ({ icon, label, description, onClick, tone = 'cyan' }) => (
  <button
    type="button"
    onClick={onClick}
    className="app-surface group flex min-h-28 w-full items-start gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-white/[0.06] active:translate-y-0"
  >
    <span className={`quick-action-icon quick-action-${tone}`}>
      {createElement(icon, { className: 'h-5 w-5' })}
    </span>
    <span className="min-w-0">
      <span className="block font-semibold text-white">{label}</span>
      <span className="mt-1 block text-sm leading-5 text-slate-400">{description}</span>
    </span>
  </button>
);
