'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Table, Th, Td, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';
import { money, date } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';

export type EnforcementCase = {
  id: string;
  unit_id: string;
  block: string | null;
  apartment_number: string | null;
  debtor_name: string | null;
  status: string;
  case_no: string | null;
  lawyer: string | null;
  debt_at_open: number;
  current_debt: number;
  note: string | null;
  opened_at: string;
  closed_at: string | null;
};

export type DebtorUnit = { unit_id: string; block: string | null; apartment_number: string | null; net_borc: number };

const STATUS_TONE: Record<string, 'blue' | 'amber' | 'red' | 'slate'> = { ihtar: 'blue', takip: 'amber', icra: 'red', kapandi: 'slate' };
const STATUS_LABEL: Record<string, string> = { ihtar: 'İhtarda', takip: 'Takipte', icra: 'İcrada', kapandi: 'Kapandı' };
// Gerçek akış: sözlü uyarı → yazılı ihtar → takip → icra
const NEXT_STATUS: Record<string, { to: string; label: string }[]> = {
  ihtar: [{ to: 'takip', label: 'Takibe Çevir' }, { to: 'icra', label: 'İcraya Çevir' }],
  takip: [{ to: 'icra', label: 'İcraya Çevir' }],
  icra: [],
};

type CaseEvent = { id: string; kind: string; body: string; actor_name: string | null; created_at: string };
type DebtItem = { description: string | null; due_date: string | null; principal_remaining: number };

function unitLabel(block: string | null, apt: string | null) {
  return `${block ? block + ' ' : ''}${apt ?? '—'}`;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function EnforcementPanel({ cases: initial, debtors, siteName = '' }: { cases: EnforcementCase[]; debtors: DebtorUnit[]; siteName?: string }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [cases, setCases] = useState<EnforcementCase[]>(initial);
  const [showClosed, setShowClosed] = useState(false);
  const [busy, setBusy] = useState(false);

  // open modal
  const [openModal, setOpenModal] = useState(false);
  const [unitId, setUnitId] = useState('');
  const [status, setStatus] = useState('ihtar');
  const [caseNo, setCaseNo] = useState('');
  const [lawyer, setLawyer] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  // Dosya detayı: olay geçmişi + not + ihtarname
  const [detail, setDetail] = useState<EnforcementCase | null>(null);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [newNote, setNewNote] = useState('');
  const [dErr, setDErr] = useState('');

  const openUnitIds = new Set(cases.filter((c) => c.status !== 'kapandi').map((c) => c.unit_id));
  const availableDebtors = debtors.filter((d) => !openUnitIds.has(d.unit_id));

  async function reload(includeClosed: boolean) {
    setBusy(true);
    const { data } = await supabaseBrowser().rpc('get_enforcement_cases', { p_include_closed: includeClosed });
    setBusy(false);
    setCases((data ?? []) as EnforcementCase[]);
  }

  async function toggleClosed() {
    const next = !showClosed;
    setShowClosed(next);
    await reload(next);
  }

  async function submitOpen() {
    if (!unitId) { setErr('Daire seçin.'); return; }
    setBusy(true); setErr('');
    const { error } = await supabaseBrowser().rpc('open_enforcement', {
      p_unit_id: unitId,
      p_status: status,
      p_case_no: caseNo.trim() || undefined,
      p_lawyer: lawyer.trim() || undefined,
      p_note: note.trim() || undefined,
    });
    setBusy(false);
    if (error) { setErr(friendlyDbMessage(error.message)); return; }
    setOpenModal(false); setUnitId(''); setStatus('ihtar'); setCaseNo(''); setLawyer(''); setNote('');
    router.refresh();
    await reload(showClosed);
  }

  async function changeStatus(c: EnforcementCase, newStatus: string) {
    const verb = newStatus === 'icra' ? 'icraya çevrilsin' : newStatus === 'kapandi' ? 'kapatılsın' : newStatus === 'takip' ? 'takibe alınsın' : 'güncellensin';
    if (!confirm(`${unitLabel(c.block, c.apartment_number)} dosyası ${verb} mı?`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('update_enforcement', { p_case_id: c.id, p_status: newStatus });
    setBusy(false);
    if (error) { alert('Güncellenemedi: ' + friendlyDbMessage(error.message)); return; }
    await reload(showClosed);
    router.refresh();
    if (detail?.id === c.id) {
      setDetail({ ...detail, status: newStatus });
      await loadEvents(c.id);
    }
  }

  async function loadEvents(caseId: string) {
    const { data } = await supabaseBrowser().rpc('get_enforcement_events', { p_case_id: caseId });
    setEvents((data ?? []) as CaseEvent[]);
  }

  async function openDetail(c: EnforcementCase) {
    setDetail(c); setNewNote(''); setDErr(''); setEvents([]);
    await loadEvents(c.id);
  }

  async function submitNote() {
    if (!detail || !newNote.trim()) return;
    setBusy(true); setDErr('');
    const { error } = await supabaseBrowser().rpc('add_enforcement_note', { p_case_id: detail.id, p_note: newNote.trim() });
    setBusy(false);
    if (error) { setDErr(friendlyDbMessage(error.message)); return; }
    setNewNote('');
    await loadEvents(detail.id);
  }

  /** Borç dökümü ekli yazılı ihtarname — avukata gitmeden önceki son adım. */
  async function printIhtarname(c: EnforcementCase) {
    const sb = supabaseBrowser();
    const [{ data: accruals }, { data: bal }] = await Promise.all([
      sb.from('accruals')
        .select('description, due_date, principal_remaining')
        .eq('unit_id', c.unit_id).in('status', ['open', 'partial'])
        .order('due_date', { ascending: true }),
      sb.from('unit_balances').select('kalan_gecikme, net_borc').eq('unit_id', c.unit_id).maybeSingle(),
    ]);
    const items = ((accruals ?? []) as DebtItem[]).filter((a) => Number(a.principal_remaining) > 0.005);
    const gecikme = Number(bal?.kalan_gecikme ?? 0);
    const toplam = Number(bal?.net_borc ?? c.current_debt);
    const today = new Date().toLocaleDateString('tr-TR');
    const daire = unitLabel(c.block, c.apartment_number);

    const rowsHtml = items.map((a) => `
      <tr>
        <td>${esc(a.description ?? 'Aidat / ortak gider')}</td>
        <td>${a.due_date ? esc(date(a.due_date)) : '—'}</td>
        <td class="num">${esc(money(Number(a.principal_remaining), true))}</td>
      </tr>`).join('');

    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) { alert('Açılır pencere engellendi — tarayıcı ayarlarından izin verin.'); return; }
    w.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>İhtarname — ${esc(daire)}</title>
      <style>
        body{font-family:Georgia,'Times New Roman',serif;max-width:680px;margin:32px auto;color:#111;line-height:1.6}
        h1{font-size:18px;text-align:center;letter-spacing:2px;margin-bottom:4px}
        .head{text-align:center;font-size:13px;color:#444;margin-bottom:24px}
        p{font-size:13px;text-align:justify}
        table{width:100%;border-collapse:collapse;font-size:12px;margin:14px 0}
        th,td{border:1px solid #999;padding:5px 8px;text-align:left}
        th{background:#f2f2f2}
        .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
        .total td{font-weight:bold}
        .sign{margin-top:56px;display:flex;justify-content:space-between;font-size:13px}
        .sign div{text-align:center;width:45%}
        .sign .line{margin-top:48px;border-top:1px solid #333;padding-top:6px}
        @media print{body{margin:12mm}}
      </style></head><body>
      <h1>İHTARNAME</h1>
      <div class="head">${esc(siteName || 'Site Yönetimi')} — ${esc(today)}</div>
      <p><b>Sayın ${esc(c.debtor_name ?? 'Daire Sakini / Kat Maliki')}</b> (${esc(daire)} no'lu bağımsız bölüm),</p>
      <p>634 sayılı Kat Mülkiyeti Kanunu'nun 20. maddesi uyarınca ortak gider ve avans payı borcunuz bulunmaktadır.
      Aşağıda dökümü verilen toplam <b>${esc(money(toplam, true))}</b> tutarındaki borcunuzu, işbu ihtarnamenin
      tarafınıza tebliğinden itibaren <b>7 (yedi) gün</b> içinde site yönetimine ödemenizi rica ederiz.</p>
      <table>
        <thead><tr><th>Borç Kalemi</th><th>Vade</th><th class="num">Kalan Tutar</th></tr></thead>
        <tbody>
          ${rowsHtml}
          ${gecikme > 0.005 ? `<tr><td>Gecikme tazminatı (KMK m.20 — aylık %5)</td><td>—</td><td class="num">${esc(money(gecikme, true))}</td></tr>` : ''}
          <tr class="total"><td colspan="2">GENEL TOPLAM</td><td class="num">${esc(money(toplam, true))}</td></tr>
        </tbody>
      </table>
      <p>Belirtilen süre içinde ödeme yapılmadığı takdirde, hakkınızda yasal takip (icra) başlatılacağını,
      yargılama giderleri, vekâlet ücreti ve gecikme tazminatının tarafınıza yükletileceğini ihtaren bildiririz.</p>
      ${c.case_no ? `<p style="font-size:12px;color:#555">Dosya No: ${esc(c.case_no)}</p>` : ''}
      <div class="sign">
        <div><b>Tebliğ Alan</b><div class="line">Ad Soyad / İmza</div></div>
        <div><b>${esc(siteName || 'Site Yönetimi')}</b><div class="line">Yönetici / İmza</div></div>
      </div>
      <script>window.print()</script>
      </body></html>`);
    w.document.close();

    // İz bırak: ihtarname üretimi dosya geçmişine not düşülür
    await sb.rpc('add_enforcement_note', { p_case_id: c.id, p_note: `İhtarname çıktısı alındı (${today}, toplam ${money(toplam, true)})` });
    if (detail?.id === c.id) await loadEvents(c.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showClosed} onChange={toggleClosed} disabled={busy} />
          Kapanan dosyaları da göster
        </label>
        {!ro && (
          <button
            onClick={() => { setErr(''); setOpenModal(true); }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Takibe Al
          </button>
        )}
      </div>

      <Card>
        {cases.length === 0 ? (
          <EmptyState>Açık takip / icra dosyası yok.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Daire</Th>
                  <Th>Borçlu</Th>
                  <Th>Durum</Th>
                  <Th>Dosya No</Th>
                  <Th>Avukat</Th>
                  <Th className="text-right">Açılış Borcu</Th>
                  <Th className="text-right">Güncel Borç</Th>
                  <Th>Açılış</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <Td>{unitLabel(c.block, c.apartment_number)}</Td>
                    <Td>{c.debtor_name ?? '—'}</Td>
                    <Td><Badge tone={STATUS_TONE[c.status] ?? 'slate'}>{STATUS_LABEL[c.status] ?? c.status}</Badge></Td>
                    <Td className="text-slate-500">{c.case_no ?? '—'}</Td>
                    <Td className="text-slate-500">{c.lawyer ?? '—'}</Td>
                    <Td className="text-right tabular-nums text-slate-500">{money(Number(c.debt_at_open), true)}</Td>
                    <Td className={`text-right tabular-nums ${Number(c.current_debt) > 0 ? 'text-red-600 font-medium' : 'text-emerald-600'}`}>{money(Number(c.current_debt), true)}</Td>
                    <Td className="text-slate-400">{date(c.opened_at)}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <button onClick={() => openDetail(c)} className="text-xs font-semibold text-blue-600 hover:underline">Detay</button>
                      {!ro && (NEXT_STATUS[c.status] ?? []).map((n) => (
                        <button key={n.to} onClick={() => changeStatus(c, n.to)} className={`ml-3 text-xs hover:underline ${n.to === 'icra' ? 'text-red-600' : 'text-amber-600'}`}>{n.label}</button>
                      ))}
                      {!ro && c.status !== 'kapandi' && (
                        <button onClick={() => changeStatus(c, 'kapandi')} className="ml-3 text-xs text-slate-400 hover:text-slate-700">Kapat</button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {detail && (
        <Modal title={`Dosya — ${unitLabel(detail.block, detail.apartment_number)}`} onClose={() => setDetail(null)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[detail.status] ?? 'slate'}>{STATUS_LABEL[detail.status] ?? detail.status}</Badge>
              {detail.debtor_name && <span className="text-sm text-slate-600">{detail.debtor_name}</span>}
              {detail.case_no && <span className="text-xs text-slate-400">Dosya No: {detail.case_no}</span>}
              {detail.lawyer && <span className="text-xs text-slate-400">Avukat: {detail.lawyer}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="rounded-lg bg-slate-50 px-3 py-2">Açılış borcu: <span className="font-semibold tabular-nums">{money(Number(detail.debt_at_open), true)}</span></p>
              <p className="rounded-lg bg-slate-50 px-3 py-2">Güncel borç: <span className={`font-semibold tabular-nums ${Number(detail.current_debt) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{money(Number(detail.current_debt), true)}</span></p>
            </div>

            {!ro && (
              <div className="flex flex-wrap gap-1.5">
                {(NEXT_STATUS[detail.status] ?? []).map((n) => (
                  <button key={n.to} onClick={() => changeStatus(detail, n.to)} disabled={busy}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    {n.label}
                  </button>
                ))}
                <button onClick={() => printIhtarname(detail)} disabled={busy}
                  className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                  🖨 İhtarname Yazdır (borç dökümlü)
                </button>
              </div>
            )}

            {!ro && (
              <div className="flex gap-2">
                <input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitNote()}
                  className={inputCls}
                  placeholder="Dosyaya not ekle (görüşme, tebligat, ödeme sözü…)"
                />
                <button onClick={submitNote} disabled={busy || !newNote.trim()}
                  className="shrink-0 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                  Ekle
                </button>
              </div>
            )}
            {dErr && <p className="text-sm text-red-600">{dErr}</p>}

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Dosya Geçmişi</p>
              {events.length === 0 ? (
                <p className="text-xs text-slate-400">Kayıtlı olay yok.</p>
              ) : (
                <ol className="flex max-h-64 flex-col gap-1.5 overflow-y-auto border-l-2 border-slate-100 pl-3">
                  {events.map((ev) => (
                    <li key={ev.id} className="text-xs text-slate-600">
                      <span className={ev.kind === 'durum' ? 'font-semibold text-slate-800' : ''}>{ev.body}</span>
                      <span className="ml-1 text-slate-300">· {date(ev.created_at)}{ev.actor_name ? ` · ${ev.actor_name}` : ''}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </Modal>
      )}

      {openModal && (
        <Modal title="Takibe Al / İcra Aç" onClose={() => setOpenModal(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Borçlu Daire *">
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputCls}>
                <option value="">— Daire seçin —</option>
                {availableDebtors.map((d) => (
                  <option key={d.unit_id} value={d.unit_id}>
                    {unitLabel(d.block, d.apartment_number)} · borç {money(Number(d.net_borc), true)}
                  </option>
                ))}
              </select>
              {availableDebtors.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">Takibe alınabilecek borçlu daire yok (ya borç yok ya da tümü zaten dosyada).</p>
              )}
            </Field>
            <Field label="Durum">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                <option value="ihtar">Yazılı İhtar (ilk adım — ihtarname çıktısı alınabilir)</option>
                <option value="takip">Takibe Al</option>
                <option value="icra">Doğrudan İcra</option>
              </select>
            </Field>
            <Field label="İcra Dosya No (opsiyonel)">
              <input value={caseNo} onChange={(e) => setCaseNo(e.target.value)} className={inputCls} placeholder="örn. 2026/1234" />
            </Field>
            <Field label="Avukat / Büro (opsiyonel)">
              <input value={lawyer} onChange={(e) => setLawyer(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Not (opsiyonel)">
              <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
            </Field>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setOpenModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submitOpen} disabled={busy || !unitId} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Kaydediliyor…' : 'Dosya Aç'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
