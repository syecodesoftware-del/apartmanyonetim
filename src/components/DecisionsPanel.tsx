'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { date } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';

export type Decision = {
  id: string;
  decision_year: number;
  decision_no: number;
  decision_date: string;
  subject: string;
  body: string | null;
  participants: string | null;
  source: string;
  assembly_id: string | null;
  assembly_title: string | null;
  created_by_name: string | null;
  created_at: string;
};

const SOURCE_LABEL: Record<string, string> = { yonetim: 'Yönetim', genel_kurul: 'Genel Kurul' };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type Form = { id: string | null; subject: string; body: string; decision_date: string; participants: string; source: string };
const EMPTY: Form = { id: null, subject: '', body: '', decision_date: '', participants: '', source: 'yonetim' };

export function DecisionsPanel({ siteName, canManage, decisions: initial }: { siteName: string; canManage: boolean; decisions: Decision[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Decision[]>(initial);
  const [busy, setBusy] = useState(false);
  const [yearFilter, setYearFilter] = useState(0); // 0 = tümü

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [err, setErr] = useState('');

  const years = [...new Set(rows.map((r) => r.decision_year))].sort((a, b) => b - a);
  const filtered = yearFilter ? rows.filter((r) => r.decision_year === yearFilter) : rows;

  async function reload() {
    const { data } = await supabaseBrowser().rpc('get_board_decisions', { p_year: undefined });
    setRows((data ?? []) as unknown as Decision[]);
    router.refresh();
  }

  function openNew() { setForm(EMPTY); setErr(''); setOpen(true); }
  function openEdit(d: Decision) {
    setForm({ id: d.id, subject: d.subject, body: d.body ?? '', decision_date: d.decision_date, participants: d.participants ?? '', source: d.source });
    setErr(''); setOpen(true);
  }

  async function submit() {
    if (!form.subject.trim()) { setErr('Konu girin.'); return; }
    setBusy(true); setErr('');
    const { error } = await supabaseBrowser().rpc('save_board_decision', {
      p_id: form.id,
      p_subject: form.subject.trim(),
      p_body: form.body.trim() || undefined,
      p_decision_date: form.decision_date || undefined,
      p_participants: form.participants.trim() || undefined,
      p_source: form.source,
    });
    setBusy(false);
    if (error) { setErr(friendlyDbMessage(error.message)); return; }
    setOpen(false);
    await reload();
  }

  async function remove(d: Decision) {
    if (!confirm(`${d.decision_year}/${d.decision_no} sayılı karar silinsin mi? (Yalnız yılın son kararı silinebilir — numara bütünlüğü.)`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('delete_board_decision', { p_id: d.id });
    setBusy(false);
    if (error) { alert('Silinemedi: ' + friendlyDbMessage(error.message)); return; }
    await reload();
  }

  function printBook() {
    const list = filtered.slice().sort((a, b) => a.decision_year - b.decision_year || a.decision_no - b.decision_no);
    if (list.length === 0) return;
    const body = list.map((d) => `
      <div class="decision">
        <div class="dhead">
          <span class="dno">Karar No: ${d.decision_year}/${d.decision_no}</span>
          <span>Tarih: ${date(d.decision_date)}</span>
          <span>Kaynak: ${SOURCE_LABEL[d.source] ?? d.source}</span>
        </div>
        <h3>${esc(d.subject)}</h3>
        ${d.body ? `<p>${esc(d.body).replace(/\n/g, '<br>')}</p>` : ''}
        ${d.participants ? `<p class="muted">Katılanlar: ${esc(d.participants)}</p>` : ''}
        <div class="sign"><div>Yönetici</div><div>Üye</div><div>Üye</div></div>
      </div>`).join('');
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Karar Defteri — ${esc(siteName)}</title>
<style>
body{font-family:Georgia,serif;color:#111;margin:36px;font-size:13px}
h1{font-size:18px;text-align:center;margin:0 0 4px}
h2{font-size:14px;text-align:center;font-weight:normal;margin:0 0 24px}
.decision{border:1px solid #999;border-radius:4px;padding:16px 20px;margin-bottom:20px;page-break-inside:avoid}
.dhead{display:flex;gap:24px;font-size:12px;color:#444;border-bottom:1px solid #ddd;padding-bottom:6px;margin-bottom:8px}
.dno{font-weight:bold}
h3{font-size:14px;margin:0 0 6px}
p{margin:4px 0;line-height:1.5}
.muted{color:#777;font-size:12px}
.sign{margin-top:28px;display:flex;justify-content:space-between}
.sign div{text-align:center;width:150px;border-top:1px solid #333;padding-top:5px;font-size:11px}
@media print{body{margin:12mm}}
</style></head><body>
<h1>KARAR DEFTERİ</h1>
<h2>${esc(siteName)}${yearFilter ? ` — ${yearFilter}` : ''}</h2>
${body}
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={yearFilter === 0} onClick={() => setYearFilter(0)}>Tümü</FilterChip>
          {years.map((y) => <FilterChip key={y} active={yearFilter === y} onClick={() => setYearFilter(y)}>{String(y)}</FilterChip>)}
        </div>
        <div className="flex gap-2">
          <button onClick={printBook} disabled={filtered.length === 0} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50">
            🖨 Defteri Yazdır
          </button>
          {canManage && (
            <button onClick={openNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              + Karar Ekle
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState>Kayıtlı karar yok. Genel kurul kararları ve yönetim kararlarını buraya işleyin.</EmptyState></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((d) => (
            <Card key={d.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-white">{d.decision_year}/{d.decision_no}</span>
                    <Badge tone={d.source === 'genel_kurul' ? 'blue' : 'slate'}>{SOURCE_LABEL[d.source] ?? d.source}</Badge>
                    <span className="text-xs text-slate-400">{date(d.decision_date)}</span>
                  </div>
                  <p className="mt-2 font-medium text-slate-800">{d.subject}</p>
                  {d.body && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{d.body}</p>}
                  {d.participants && <p className="mt-1 text-xs text-slate-400">Katılanlar: {d.participants}</p>}
                  {d.assembly_title && <p className="mt-1 text-xs text-blue-500">🗳️ {d.assembly_title}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-3 whitespace-nowrap">
                    <button onClick={() => openEdit(d)} className="text-xs text-blue-600 hover:underline">Düzenle</button>
                    <button onClick={() => remove(d)} disabled={busy} className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-50">Sil</button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <Modal title={form.id ? 'Karar Düzenle' : 'Karar Ekle'} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Konu *">
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls} placeholder="örn. Kapıcı ücretinin güncellenmesi" />
            </Field>
            <Field label="Karar Metni">
              <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className={inputCls} rows={5} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Karar Tarihi">
                <input type="date" value={form.decision_date} onChange={(e) => setForm({ ...form, decision_date: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Kaynak">
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={inputCls}>
                  <option value="yonetim">Yönetim Kararı</option>
                  <option value="genel_kurul">Genel Kurul Kararı</option>
                </select>
              </Field>
            </div>
            <Field label="Katılanlar">
              <input value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} className={inputCls} placeholder="örn. Ahmet Yılmaz, Ayşe Demir" />
            </Field>
            {!form.id && <p className="text-xs text-slate-400">Karar numarası, karar tarihinin yılına göre otomatik verilir ve sonradan değişmez.</p>}
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
