'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, StatCard, Table, Th, Td, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';
import { money } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';

export type BudgetHeader = { id: string; year: number; name: string; note: string | null; status: string };
export type ChargeTypeOption = { id: string; ad: string };
export type BudgetReportRow = {
  line_id: string;
  label: string;
  distribution: string;
  charge_type_id: string | null;
  charge_type_name: string | null;
  planned_annual: number;
  planned_monthly: number;
  accrued_ytd: number;
  remaining: number;
};

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function distLabel(d: string) {
  return d === 'arsa_payi' ? 'Arsa Payı' : 'Eşit';
}

export function BudgetPanel({
  year, currentYear, budgets, selected, rows, chargeTypes,
}: {
  year: number;
  currentYear: number;
  budgets: BudgetHeader[];
  selected: BudgetHeader | null;
  rows: BudgetReportRow[];
  chargeTypes: ChargeTypeOption[];
}) {
  const router = useRouter();
  const ro = useReadOnly();
  const [busy, setBusy] = useState(false);

  // line modal
  const [lineOpen, setLineOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [dist, setDist] = useState('esit');
  const [chargeType, setChargeType] = useState('');
  const [lineErr, setLineErr] = useState('');

  // generate modal
  const [genOpen, setGenOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genDue, setGenDue] = useState(15);

  const years = Array.from(new Set([currentYear, currentYear + 1, ...budgets.map((b) => b.year)])).sort((a, b) => b - a);

  const totals = rows.reduce(
    (a, r) => ({
      annual: a.annual + Number(r.planned_annual),
      monthly: a.monthly + Number(r.planned_monthly),
      accrued: a.accrued + Number(r.accrued_ytd),
      remaining: a.remaining + Number(r.remaining),
    }),
    { annual: 0, monthly: 0, accrued: 0, remaining: 0 },
  );

  function goYear(y: number) {
    router.push(`/budget?year=${y}`);
  }

  async function createBudget() {
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('save_budget', { p_year: year });
    setBusy(false);
    if (error) { alert('Oluşturulamadı: ' + friendlyDbMessage(error.message)); return; }
    router.refresh();
  }

  function openNewLine() {
    setEditId(null); setLabel(''); setAmount(''); setDist('esit'); setChargeType(''); setLineErr('');
    setLineOpen(true);
  }
  function openEditLine(r: BudgetReportRow) {
    setEditId(r.line_id); setLabel(r.label); setAmount(String(r.planned_annual));
    setDist(r.distribution); setChargeType(r.charge_type_id ?? ''); setLineErr('');
    setLineOpen(true);
  }

  async function saveLine() {
    if (!selected) return;
    const amt = Number(String(amount).replace(',', '.'));
    if (!label.trim()) { setLineErr('Kalem adı zorunludur.'); return; }
    if (!Number.isFinite(amt) || amt < 0) { setLineErr('Geçerli bir yıllık tutar girin.'); return; }
    setBusy(true); setLineErr('');
    const { error } = await supabaseBrowser().rpc('save_budget_line', {
      p_budget_id: selected.id,
      p_label: label.trim(),
      p_annual_amount: amt,
      p_distribution: dist,
      p_charge_type_id: chargeType || undefined,
      p_line_id: editId || undefined,
    });
    setBusy(false);
    if (error) { setLineErr(friendlyDbMessage(error.message)); return; }
    setLineOpen(false);
    router.refresh();
  }

  async function deleteLine(r: BudgetReportRow) {
    if (!confirm(`“${r.label}” kalemi silinsin mi?`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('delete_budget_line', { p_line_id: r.line_id });
    setBusy(false);
    if (error) { alert('Silinemedi: ' + friendlyDbMessage(error.message)); return; }
    router.refresh();
  }

  async function generateMonth() {
    if (!selected) return;
    const due = `${year}-${String(genMonth).padStart(2, '0')}-${String(genDue).padStart(2, '0')}`;
    setBusy(true);
    const { data, error } = await supabaseBrowser().rpc('generate_accruals_from_budget', {
      p_budget_id: selected.id,
      p_period_month: genMonth,
      p_period_year: year,
      p_due_date: due,
    });
    setBusy(false);
    if (error) { alert('Tahakkuk üretilemedi: ' + friendlyDbMessage(error.message)); return; }
    const r = (data ?? {}) as { generated?: number; skipped?: number; no_charge_type?: number };
    setGenOpen(false);
    alert(
      `${MONTHS[genMonth - 1]} ${year} tahakkukları:\n` +
      `• Üretilen kalem: ${r.generated ?? 0}\n` +
      `• Zaten üretilmiş (atlandı): ${r.skipped ?? 0}\n` +
      `• Gider türü atanmamış (atlandı): ${r.no_charge_type ?? 0}`,
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Yıl seçici */}
      <div className="flex flex-wrap items-center gap-2">
        {years.map((y) => {
          const has = budgets.some((b) => b.year === y);
          return (
            <button
              key={y}
              onClick={() => goYear(y)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                y === year ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400'
              }`}
            >
              {y} {has ? '•' : ''}
            </button>
          );
        })}
      </div>

      {!selected ? (
        <Card>
          <EmptyState>
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="text-4xl">📊</span>
              <p className="text-base font-semibold text-slate-700">{year} için bütçe oluşturulmamış</p>
              <p className="max-w-md text-sm text-slate-500">
                Yıllık işletme projesini kalem kalem tanımlayın; sistem her kalemi seçtiğiniz dağıtım anahtarıyla
                (eşit / arsa payı) aylık tahakkuka çevirsin.
              </p>
              {!ro && (
                <button onClick={createBudget} disabled={busy} className="mt-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  + {year} Bütçesi Oluştur
                </button>
              )}
            </div>
          </EmptyState>
        </Card>
      ) : (
        <>
          {/* Özet */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Planlanan Yıllık" value={money(totals.annual, true)} />
            <StatCard label="Planlanan Aylık" value={money(totals.monthly, true)} />
            <StatCard label="Tahakkuk (bu yıl)" value={money(totals.accrued, true)} tone="success" />
            <StatCard label="Kalan Plan" value={money(totals.remaining, true)} tone={totals.remaining < 0 ? 'danger' : 'default'} />
          </div>

          <Card
            title={`${selected.name} · ${year}`}
            action={
              !ro ? (
                <div className="flex gap-2">
                  <button onClick={openNewLine} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                    + Kalem
                  </button>
                  <button
                    onClick={() => setGenOpen(true)}
                    disabled={rows.length === 0}
                    className="rounded-lg border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                  >
                    ⚙️ Aya Tahakkuk Üret
                  </button>
                </div>
              ) : undefined
            }
          >
            {rows.length === 0 ? (
              <EmptyState>Henüz kalem yok. “+ Kalem” ile ilk gider kalemini ekleyin.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <Th>Kalem</Th>
                      <Th>Gider Türü</Th>
                      <Th>Dağıtım</Th>
                      <Th className="text-right">Yıllık</Th>
                      <Th className="text-right">Aylık</Th>
                      <Th className="text-right">Tahakkuk</Th>
                      <Th className="text-right">Kalan</Th>
                      {!ro && <Th></Th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.line_id}>
                        <Td>{r.label}</Td>
                        <Td>{r.charge_type_name ?? <Badge tone="amber">Atanmadı</Badge>}</Td>
                        <Td>{distLabel(r.distribution)}</Td>
                        <Td className="text-right tabular-nums">{money(Number(r.planned_annual), true)}</Td>
                        <Td className="text-right tabular-nums">{money(Number(r.planned_monthly), true)}</Td>
                        <Td className="text-right tabular-nums text-emerald-600">{money(Number(r.accrued_ytd), true)}</Td>
                        <Td className={`text-right tabular-nums ${Number(r.remaining) < 0 ? 'text-red-600' : ''}`}>{money(Number(r.remaining), true)}</Td>
                        {!ro && (
                          <Td className="text-right whitespace-nowrap">
                            <button onClick={() => openEditLine(r)} className="text-xs text-blue-600 hover:underline">Düzenle</button>
                            <button onClick={() => deleteLine(r)} className="ml-3 text-xs text-slate-400 hover:text-red-600">Sil</button>
                          </Td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}

      {lineOpen && (
        <Modal title={editId ? 'Kalem Düzenle' : 'Yeni Bütçe Kalemi'} onClose={() => setLineOpen(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Kalem Adı *">
              <input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus className={inputCls} placeholder="Örn. Asansör Bakımı" />
            </Field>
            <Field label="Yıllık Tutar (₺) *">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className={inputCls} placeholder="örn. 12000" />
            </Field>
            <Field label="Dağıtım Anahtarı">
              <select value={dist} onChange={(e) => setDist(e.target.value)} className={inputCls}>
                <option value="esit">Eşit (daire başına)</option>
                <option value="arsa_payi">Arsa Payı</option>
              </select>
            </Field>
            <Field label="Gider Türü (tahakkuk için)">
              <select value={chargeType} onChange={(e) => setChargeType(e.target.value)} className={inputCls}>
                <option value="">— Seçilmedi (tahakkuk üretilemez) —</option>
                {chargeTypes.map((c) => <option key={c.id} value={c.id}>{c.ad}</option>)}
              </select>
            </Field>
            {lineErr && <p className="text-sm text-red-600">{lineErr}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setLineOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={saveLine} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {genOpen && selected && (
        <Modal title="Aya Tahakkuk Üret" onClose={() => setGenOpen(false)}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-500">
              Her bütçe kalemi <b>yıllık ÷ 12</b> tutarıyla, seçtiğiniz gider türüne tahakkuk edilir.
              Aynı dönemde zaten üretilmiş kalemler atlanır.
            </p>
            <div className="flex gap-3">
              <Field label="Ay">
                <select value={genMonth} onChange={(e) => setGenMonth(Number(e.target.value))} className={inputCls}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </Field>
              <Field label="Vade Günü">
                <input value={genDue} onChange={(e) => setGenDue(Math.min(28, Math.max(1, Number(e.target.value) || 1)))} inputMode="numeric" className={inputCls} />
              </Field>
            </div>
            <p className="text-xs text-slate-400">Vade: {year}-{String(genMonth).padStart(2, '0')}-{String(genDue).padStart(2, '0')}</p>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setGenOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={generateMonth} disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {busy ? 'Üretiliyor…' : 'Tahakkuk Üret'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
