'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Table, Th, Td, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';
import { money, date } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';

export type Asset = {
  id: string;
  name: string;
  category: string;
  location: string | null;
  quantity: number;
  serial_no: string | null;
  purchase_date: string | null;
  value: number | null;
  status: string;
  next_inspection_date: string | null;
  inspection_note: string | null;
  warranty_until: string | null;
  note: string | null;
};

export type InspectionDue = {
  id: string; name: string; category: string; location: string | null;
  next_inspection_date: string; inspection_note: string | null; days_left: number; durum: string;
};

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'asansor', label: 'Asansör' },
  { key: 'jenerator', label: 'Jeneratör' },
  { key: 'hidrofor', label: 'Hidrofor' },
  { key: 'yangin', label: 'Yangın' },
  { key: 'isitma', label: 'Isıtma' },
  { key: 'bahce', label: 'Bahçe' },
  { key: 'guvenlik', label: 'Güvenlik' },
  { key: 'elektrik', label: 'Elektrik' },
  { key: 'mobilya', label: 'Mobilya' },
  { key: 'diger', label: 'Diğer' },
];
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

const STATUS_LABEL: Record<string, string> = { aktif: 'Aktif', arizali: 'Arızalı', bakimda: 'Bakımda', hurda: 'Hurda' };
const STATUS_TONE: Record<string, 'green' | 'red' | 'amber' | 'slate'> = { aktif: 'green', arizali: 'red', bakimda: 'amber', hurda: 'slate' };

type Form = {
  id: string | null; name: string; category: string; location: string; quantity: string;
  serial_no: string; purchase_date: string; value: string; status: string;
  next_inspection_date: string; inspection_note: string; warranty_until: string; note: string;
};
const EMPTY_FORM: Form = {
  id: null, name: '', category: 'asansor', location: '', quantity: '1', serial_no: '',
  purchase_date: '', value: '', status: 'aktif', next_inspection_date: '', inspection_note: '', warranty_until: '', note: '',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function InventoryPanel({ siteName, assets: initial, due: initialDue }: { siteName: string; assets: Asset[]; due: InspectionDue[] }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [assets, setAssets] = useState<Asset[]>(initial);
  const [due, setDue] = useState<InspectionDue[]>(initialDue);
  const [busy, setBusy] = useState(false);
  const [catFilter, setCatFilter] = useState('');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [err, setErr] = useState('');

  async function reload() {
    const sb = supabaseBrowser();
    const [{ data: a }, { data: d }] = await Promise.all([
      sb.rpc('get_assets', { p_category: undefined }),
      sb.rpc('get_inspection_due', { p_within_days: 60 }),
    ]);
    setAssets((a ?? []) as unknown as Asset[]);
    setDue((d ?? []) as unknown as InspectionDue[]);
  }

  function openNew() { setForm(EMPTY_FORM); setErr(''); setOpen(true); }
  function openEdit(a: Asset) {
    setForm({
      id: a.id, name: a.name, category: a.category, location: a.location ?? '', quantity: String(a.quantity),
      serial_no: a.serial_no ?? '', purchase_date: a.purchase_date ?? '', value: a.value != null ? String(a.value) : '',
      status: a.status, next_inspection_date: a.next_inspection_date ?? '', inspection_note: a.inspection_note ?? '',
      warranty_until: a.warranty_until ?? '', note: a.note ?? '',
    });
    setErr(''); setOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) { setErr('İsim girin.'); return; }
    setBusy(true); setErr('');
    const { error } = await supabaseBrowser().rpc('save_asset', {
      p_id: form.id,
      p_name: form.name.trim(),
      p_category: form.category,
      p_location: form.location.trim() || undefined,
      p_quantity: Number(form.quantity) || 1,
      p_serial_no: form.serial_no.trim() || undefined,
      p_purchase_date: form.purchase_date || undefined,
      p_value: form.value ? Number(form.value.replace(',', '.')) : undefined,
      p_status: form.status,
      p_next_inspection_date: form.next_inspection_date || undefined,
      p_inspection_note: form.inspection_note.trim() || undefined,
      p_warranty_until: form.warranty_until || undefined,
      p_note: form.note.trim() || undefined,
    });
    setBusy(false);
    if (error) { setErr(friendlyDbMessage(error.message)); return; }
    setOpen(false);
    await reload();
    router.refresh();
  }

  async function remove(a: Asset) {
    if (!confirm(`"${a.name}" demirbaşı silinsin mi?`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('delete_asset', { p_id: a.id });
    setBusy(false);
    if (error) { alert('Silinemedi: ' + friendlyDbMessage(error.message)); return; }
    await reload();
    router.refresh();
  }

  const filtered = catFilter ? assets.filter((a) => a.category === catFilter) : assets;

  // B7-3: Demirbaş Defteri yazdır (mevcut veriden, backend yok)
  function printRegister() {
    if (assets.length === 0) return;
    const rows = assets.map((a, i) => `<tr>
      <td class="num">${i + 1}</td>
      <td>${esc(a.name)}${a.serial_no ? ` <span class="muted">SN: ${esc(a.serial_no)}</span>` : ''}</td>
      <td>${esc(CAT_LABEL[a.category] ?? a.category)}</td>
      <td>${a.location ? esc(a.location) : '—'}</td>
      <td class="num">${a.quantity}</td>
      <td>${a.purchase_date ? date(a.purchase_date) : '—'}</td>
      <td class="num">${a.value != null ? money(Number(a.value), true) : '—'}</td>
      <td>${STATUS_LABEL[a.status] ?? a.status}</td>
    </tr>`).join('');
    const total = assets.reduce((s, a) => s + Number(a.value ?? 0), 0);
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Demirbaş Defteri — ${esc(siteName)}</title>
<style>
body{font-family:Georgia,serif;color:#111;margin:36px;font-size:12px}
h1{font-size:18px;text-align:center;margin:0}h2{font-size:14px;text-align:center;font-weight:normal;margin:4px 0 20px}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:5px 7px;text-align:left}
th{background:#f0f0f0;font-size:11px}.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.muted{color:#777;font-size:10px}.totals td{font-weight:bold;background:#fafafa}
.sign{margin-top:44px;display:flex;justify-content:space-between}
.sign div{text-align:center;width:200px;border-top:1px solid #333;padding-top:6px;font-size:11px}
@media print{body{margin:12mm}}
</style></head><body>
<h1>DEMİRBAŞ DEFTERİ</h1><h2>${esc(siteName)}</h2>
<table><thead><tr><th>#</th><th>Demirbaş</th><th>Kategori</th><th>Konum</th><th class="num">Adet</th><th>Alış</th><th class="num">Değer</th><th>Durum</th></tr></thead>
<tbody>${rows}<tr class="totals"><td colspan="6">TOPLAM DEĞER</td><td class="num">${money(total, true)}</td><td></td></tr></tbody></table>
<div class="sign"><div>Yönetici</div><div>Denetçi</div></div>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) { alert('Yazdırma penceresi açılamadı (pop-up engelleyiciyi kapatın).'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* #61 Muayene uyarısı */}
      {due.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">🛗 Yaklaşan / Geçmiş Muayeneler ({due.length})</p>
          <ul className="mt-2 flex flex-col gap-1">
            {due.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 text-xs text-amber-800">
                <span className="font-medium">{d.name}</span>
                <span className="text-amber-600">{CAT_LABEL[d.category] ?? d.category}{d.location ? ` · ${d.location}` : ''}</span>
                {d.durum === 'gecti' ? (
                  <Badge tone="red">{Math.abs(d.days_left)} gün gecikmiş</Badge>
                ) : (
                  <Badge tone="amber">{d.days_left} gün kaldı</Badge>
                )}
                <span className="text-amber-500">{date(d.next_inspection_date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={catFilter === ''} onClick={() => setCatFilter('')}>Tümü</FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip key={c.key} active={catFilter === c.key} onClick={() => setCatFilter(c.key)}>{c.label}</FilterChip>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={printRegister} disabled={assets.length === 0} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50">
            🖨 Defteri Yazdır
          </button>
          {!ro && (
            <button onClick={openNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              + Demirbaş Ekle
            </button>
          )}
        </div>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState>Bu kategoride demirbaş yok. Sağ üstten ekleyin.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Demirbaş</Th>
                  <Th>Kategori</Th>
                  <Th>Konum</Th>
                  <Th className="text-right">Adet</Th>
                  <Th>Durum</Th>
                  <Th>Muayene</Th>
                  <Th className="text-right">Değer</Th>
                  {!ro && <Th></Th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <Td>
                      <span className="font-medium">{a.name}</span>
                      {a.serial_no && <p className="text-xs text-slate-400">SN: {a.serial_no}</p>}
                    </Td>
                    <Td className="text-slate-500">{CAT_LABEL[a.category] ?? a.category}</Td>
                    <Td className="text-slate-500">{a.location ?? '—'}</Td>
                    <Td className="text-right tabular-nums">{a.quantity}</Td>
                    <Td><Badge tone={STATUS_TONE[a.status] ?? 'slate'}>{STATUS_LABEL[a.status] ?? a.status}</Badge></Td>
                    <Td className="text-slate-500">{a.next_inspection_date ? date(a.next_inspection_date) : '—'}</Td>
                    <Td className="text-right tabular-nums text-slate-500">{a.value != null ? money(Number(a.value), true) : '—'}</Td>
                    {!ro && (
                      <Td className="whitespace-nowrap text-right">
                        <button onClick={() => openEdit(a)} className="text-xs text-blue-600 hover:underline">Düzenle</button>
                        <button onClick={() => remove(a)} disabled={busy} className="ml-3 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50">Sil</button>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {open && (
        <Modal title={form.id ? 'Demirbaş Düzenle' : 'Demirbaş Ekle'} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <Field label="İsim *">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="örn. A Blok Asansörü" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kategori">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                  {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Durum">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                  {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Konum"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} /></Field>
              <Field label="Adet"><input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputCls} inputMode="numeric" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Seri No"><input value={form.serial_no} onChange={(e) => setForm({ ...form, serial_no: e.target.value })} className={inputCls} /></Field>
              <Field label="Değer (₺)"><input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputCls} inputMode="decimal" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Alış Tarihi"><input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} className={inputCls} /></Field>
              <Field label="Garanti Bitiş"><input type="date" value={form.warranty_until} onChange={(e) => setForm({ ...form, warranty_until: e.target.value })} className={inputCls} /></Field>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sonraki Muayene"><input type="date" value={form.next_inspection_date} onChange={(e) => setForm({ ...form, next_inspection_date: e.target.value })} className={inputCls} /></Field>
                <Field label="Muayene Notu"><input value={form.inspection_note} onChange={(e) => setForm({ ...form, inspection_note: e.target.value })} className={inputCls} placeholder="örn. yıllık periyodik" /></Field>
              </div>
              <p className="mt-1 text-xs text-amber-700">Asansör, jeneratör vb. periyodik muayene tarihi girilirse 60 gün kala uyarı verilir.</p>
            </div>
            <Field label="Not"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputCls} /></Field>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submit} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-medium transition ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
      {children}
    </button>
  );
}
