import Link from 'next/link';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, tone, icon, href }: {
  label: string; value: string | number; hint?: string;
  tone?: 'default' | 'danger' | 'warning' | 'success'; icon?: string;
  /** Verilirse kart tıklanabilir olur ve ilgili filtreli listeye götürür. */
  href?: string;
}) {
  const toneClass =
    tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-amber-600' : tone === 'success' ? 'text-emerald-600' : 'text-slate-900';
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {icon && <span className="text-base opacity-70">{icon}</span>}
      </div>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm">
        {inner}
      </Link>
    );
  }
  return <div className="rounded-xl border border-slate-200 bg-white p-4">{inner}</div>;
}

export function Card({ title, action, children, className = '' }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          {title && <span className="text-sm font-semibold text-slate-700">{title}</span>}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'blue' | 'green' | 'red' | 'amber' }) {
  const map = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-slate-400">{children}</div>;
}

export function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
      {children}
    </Link>
  );
}

/** Basit, sunucu/istemci uyumlu tablo kabukları. */
export function Table({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm">{children}</table></div>;
}
export function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={`border-b border-slate-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`}>{children}</th>;
}
export function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`border-b border-slate-50 px-3 py-2 text-slate-700 ${className}`}>{children}</td>;
}
