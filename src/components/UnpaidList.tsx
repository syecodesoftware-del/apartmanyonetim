'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState } from '@/components/ui';
import { Modal } from '@/components/UnitsPanel';
import { money } from '@/lib/format';

export type UnpaidRow = {
  id: string;
  full_name: string;
  block: string | null;
  apartment_number: string | null;
  phone: string | null;
};

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
type DebtPeriod = { key: string; label: string; amount: number };

export function UnpaidList({ unpaid, siteId }: { unpaid: UnpaidRow[]; siteId: string }) {
  const [selected, setSelected] = useState<UnpaidRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<DebtPeriod[]>([]);

  async function open(r: UnpaidRow) {
    setSelected(r); setLoading(true); setPeriods([]);
    const { data } = await supabaseBrowser()
      .from('accruals')
      .select('period_month, period_year, principal_remaining, status')
      .eq('site_id', siteId).eq('debtor_user_id', r.id).in('status', ['open', 'partial'])
      .order('period_year', { ascending: false }).order('period_month', { ascending: false });
    setPeriods((data ?? []).map((a) => ({
      key: `${a.period_year}-${a.period_month}`,
      label: `${MONTHS[(a.period_month ?? 1) - 1]} ${a.period_year}`,
      amount: Number(a.principal_remaining ?? 0),
    })));
    setLoading(false);
  }

  const total = periods.reduce((s, p) => s + p.amount, 0);

  if (unpaid.length === 0) {
    return <Card><EmptyState>Açık borcu olan sakin yok 🎉</EmptyState></Card>;
  }

  return (
    <>
      <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700">
        ⚠ {unpaid.length} sakinin açık borcu var
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {unpaid.map((r) => (
          <button key={r.id} onClick={() => open(r)} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-red-600">{r.full_name?.charAt(0)?.toUpperCase() ?? '?'}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-800">{r.full_name}</span>
              <span className="block truncate text-xs text-slate-400">{[r.block, r.apartment_number].filter(Boolean).join(' / ') || 'Daire yok'}{r.phone ? ` · ${r.phone}` : ''}</span>
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <Modal title={selected.full_name} onClose={() => setSelected(null)}>
          <p className="mb-3 text-xs text-slate-400">{[selected.block, selected.apartment_number].filter(Boolean).join(' / ') || 'Daire bilgisi yok'}</p>
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-400">Yükleniyor…</p>
          ) : periods.length === 0 ? (
            <p className="py-6 text-center text-sm text-emerald-600">Açık/kısmi tahakkuk bulunamadı.</p>
          ) : (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Borçlu Olduğu Dönemler</p>
              <ul className="divide-y divide-slate-100">
                {periods.map((p) => (
                  <li key={p.key} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-700">{p.label}</span>
                    <span className="font-semibold text-red-600">{money(p.amount, true)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-semibold text-slate-700">Toplam Borç</span>
                <span className="text-lg font-bold text-red-600">{money(total, true)}</span>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
