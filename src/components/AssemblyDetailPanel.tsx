'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Badge, StatCard } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { dateTime } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';
import { ASM_STATUS, KIND_LABEL } from '@/components/AssembliesPanel';

export type UnitRow = { id: string; block: string | null; apartment_number: string };

type Tally = Record<string, { units: number; arsa_payi: number }>;
type Item = {
  id: string; item_no: number; title: string; description: string | null;
  voting_open: boolean; decision: string | null; decision_note: string | null;
  tally: Tally; total_votes: number;
};
type Attendance = { unit_id: string; unit_label: string; present: boolean; proxy_name: string | null };
type Quorum = { total_units: number; total_arsa_payi: number; present_units: number; present_arsa_payi: number };

export type AssemblyDetail = {
  id: string; title: string; kind: string; status: string;
  first_meeting_at: string | null; second_meeting_at: string | null;
  location: string | null; call_published_at: string | null; minutes: string | null;
  items: Item[]; attendance: Attendance[]; quorum: Quorum;
};

const DECISION_LABEL: Record<string, { label: string; tone: 'green' | 'red' | 'amber' }> = {
  kabul: { label: 'Kabul', tone: 'green' },
  red: { label: 'Red', tone: 'red' },
  ertelendi: { label: 'Ertelendi', tone: 'amber' },
};
const CHOICE_LABEL: Record<string, string> = { evet: 'Evet', hayir: 'Hayır', cekimser: 'Çekimser' };

export function AssemblyDetailPanel({ canManage, detail: initial, units }: {
  canManage: boolean; detail: AssemblyDetail; units: UnitRow[];
}) {
  const router = useRouter();
  const [d, setD] = useState<AssemblyDetail>(initial);
  const [busy, setBusy] = useState(false);

  // gündem modal
  const [itemOpen, setItemOpen] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);
  const [itemNo, setItemNo] = useState('1');
  const [itemTitle, setItemTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemErr, setItemErr] = useState('');

  // katılım modal
  const [attOpen, setAttOpen] = useState(false);
  const [attUnit, setAttUnit] = useState('');
  const [attProxy, setAttProxy] = useState('');

  // kapatma modal
  const [closeOpen, setCloseOpen] = useState(false);
  const [minutes, setMinutes] = useState(initial.minutes ?? '');
  const [closeErr, setCloseErr] = useState('');

  const editable = d.status === 'taslak' || d.status === 'cagri';
  const isActive = d.status === 'cagri';

  async function reload() {
    const { data } = await supabaseBrowser().rpc('get_assembly_detail', { p_id: d.id });
    if (data) setD(data as unknown as AssemblyDetail);
    router.refresh();
  }

  async function call(fn: string, args: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc(fn as never, args as never);
    setBusy(false);
    if (error) { alert('İşlem başarısız: ' + friendlyDbMessage(error.message)); return; }
    await reload();
  }

  function openNewItem() {
    setItemId(null);
    setItemNo(String((d.items.length ? Math.max(...d.items.map((i) => i.item_no)) : 0) + 1));
    setItemTitle(''); setItemDesc(''); setItemErr(''); setItemOpen(true);
  }
  function openEditItem(i: Item) {
    setItemId(i.id); setItemNo(String(i.item_no)); setItemTitle(i.title); setItemDesc(i.description ?? '');
    setItemErr(''); setItemOpen(true);
  }
  async function submitItem() {
    if (!itemTitle.trim()) { setItemErr('Başlık girin.'); return; }
    setBusy(true); setItemErr('');
    const { error } = await supabaseBrowser().rpc('save_assembly_item', {
      p_id: itemId, p_assembly_id: d.id, p_item_no: Number(itemNo) || 1,
      p_title: itemTitle.trim(), p_description: itemDesc.trim() || undefined,
    });
    setBusy(false);
    if (error) { setItemErr(friendlyDbMessage(error.message)); return; }
    setItemOpen(false);
    await reload();
  }

  async function submitAttendance() {
    if (!attUnit) return;
    await call('mark_attendance', { p_assembly_id: d.id, p_unit_id: attUnit, p_present: true, p_proxy_name: attProxy.trim() || undefined });
    setAttUnit(''); setAttProxy('');
  }

  async function submitClose(status: 'tamamlandi' | 'iptal') {
    setBusy(true); setCloseErr('');
    const { error } = await supabaseBrowser().rpc('close_assembly', {
      p_id: d.id, p_status: status, p_minutes: minutes.trim() || undefined,
    });
    setBusy(false);
    if (error) { setCloseErr(friendlyDbMessage(error.message)); return; }
    setCloseOpen(false);
    await reload();
  }

  const attendedIds = new Set(d.attendance.filter((a) => a.present).map((a) => a.unit_id));
  const q = d.quorum;
  const quorumOk = q.present_units * 2 > q.total_units && Number(q.present_arsa_payi) * 2 > Number(q.total_arsa_payi);

  return (
    <div className="flex flex-col gap-5">
      {/* Üst bilgi + eylemler */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={ASM_STATUS[d.status]?.tone ?? 'slate'}>{ASM_STATUS[d.status]?.label ?? d.status}</Badge>
          <Badge tone="slate">{KIND_LABEL[d.kind] ?? d.kind}</Badge>
          {d.first_meeting_at && <span className="text-sm text-slate-500">📅 {dateTime(d.first_meeting_at)}</span>}
          {d.location && <span className="text-sm text-slate-500">📍 {d.location}</span>}
        </div>
        {canManage && (
          <div className="flex gap-2">
            {d.status === 'taslak' && (
              <button
                onClick={() => call('publish_assembly_call', { p_id: d.id },
                  'Çağrı yayınlansın mı? Tüm sakinlere duyuru + bildirim gider; toplantı artık taslak olmaz.')}
                disabled={busy || d.items.length === 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                📣 Çağrıyı Yayınla
              </button>
            )}
            {isActive && (
              <button onClick={() => { setCloseErr(''); setCloseOpen(true); }} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
                Toplantıyı Kapat
              </button>
            )}
          </div>
        )}
      </div>
      {d.status === 'taslak' && d.items.length === 0 && (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">Çağrıyı yayınlamadan önce en az bir gündem maddesi ekleyin.</p>
      )}

      {/* Yeter sayı */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Toplam Daire" value={String(q.total_units)} />
        <StatCard label="Katılan Daire" value={String(q.present_units)} tone={quorumOk ? 'success' : undefined} />
        <StatCard label="Toplam Arsa Payı" value={String(Number(q.total_arsa_payi))} />
        <StatCard label="Katılan Arsa Payı" value={String(Number(q.present_arsa_payi))} tone={quorumOk ? 'success' : undefined} />
      </div>
      <p className="-mt-3 text-xs text-slate-400">
        Yeter sayı bilgi amaçlıdır (sayı ve arsa payı çoğunluğu {quorumOk ? 'sağlanıyor ✓' : 'henüz sağlanmıyor'}); nihai değerlendirme yönetime aittir.
      </p>

      {/* Gündem */}
      <Card
        title="Gündem"
        action={canManage && editable ? (
          <button onClick={openNewItem} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">+ Madde</button>
        ) : undefined}
      >
        {d.items.length === 0 ? (
          <EmptyState>Gündem maddesi yok.</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            {d.items.map((i) => {
              const t = i.tally ?? {};
              return (
                <div key={i.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">{i.item_no}. {i.title}</p>
                      {i.description && <p className="mt-0.5 text-sm text-slate-500">{i.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {i.decision ? (
                        <Badge tone={DECISION_LABEL[i.decision]?.tone ?? 'amber'}>{DECISION_LABEL[i.decision]?.label ?? i.decision}</Badge>
                      ) : i.voting_open ? (
                        <Badge tone="blue">Oylama Açık</Badge>
                      ) : (
                        <Badge tone="slate">Oylama Kapalı</Badge>
                      )}
                    </div>
                  </div>

                  {/* Oy dökümü */}
                  {i.total_votes > 0 && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {(['evet', 'hayir', 'cekimser'] as const).map((c) => (
                        <div key={c} className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
                          <span className="font-semibold text-slate-700">{CHOICE_LABEL[c]}:</span>{' '}
                          <span className="tabular-nums">{t[c]?.units ?? 0} daire</span>
                          <span className="text-slate-400"> · arsa payı {Number(t[c]?.arsa_payi ?? 0)}</span>
                        </div>
                      ))}
                      <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-500">Toplam {i.total_votes} oy</div>
                    </div>
                  )}
                  {i.decision_note && <p className="mt-2 text-xs text-slate-400">Karar notu: {i.decision_note}</p>}

                  {/* Eylemler */}
                  {canManage && isActive && !i.decision && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {i.voting_open ? (
                        <button onClick={() => call('set_item_voting', { p_item_id: i.id, p_open: false })} disabled={busy} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">Oylamayı Durdur</button>
                      ) : (
                        <button onClick={() => call('set_item_voting', { p_item_id: i.id, p_open: true })} disabled={busy} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Oylamayı Aç</button>
                      )}
                      {(['kabul', 'red', 'ertelendi'] as const).map((dec) => (
                        <button key={dec} onClick={() => call('decide_item', { p_item_id: i.id, p_decision: dec }, `Madde ${i.item_no} "${DECISION_LABEL[dec].label}" olarak karara bağlansın mı? Oylama kapanır ve kilitlenir.`)} disabled={busy}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${dec === 'kabul' ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' : dec === 'red' ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}`}>
                          {DECISION_LABEL[dec].label}
                        </button>
                      ))}
                    </div>
                  )}
                  {canManage && editable && !i.decision && !i.voting_open && (
                    <div className="mt-2">
                      <button onClick={() => openEditItem(i)} className="text-xs text-slate-500 hover:underline">Düzenle</button>
                      {i.total_votes === 0 && (
                        <button onClick={() => call('delete_assembly_item', { p_id: i.id }, 'Gündem maddesi silinsin mi?')} disabled={busy} className="ml-3 text-xs text-slate-400 hover:text-red-600">Sil</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Katılım */}
      <Card title={`Katılım (${d.attendance.filter((a) => a.present).length}/${q.total_units})`}>
        {canManage && editable && (
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <div className="min-w-40">
              <select value={attUnit} onChange={(e) => setAttUnit(e.target.value)} className={inputCls}>
                <option value="">— Daire seçin —</option>
                {units.filter((u) => !attendedIds.has(u.id)).map((u) => (
                  <option key={u.id} value={u.id}>{u.block ? u.block + ' ' : ''}{u.apartment_number}</option>
                ))}
              </select>
            </div>
            <div className="min-w-40">
              <input value={attProxy} onChange={(e) => setAttProxy(e.target.value)} className={inputCls} placeholder="Vekil adı (vekaleten ise)" />
            </div>
            <button onClick={submitAttendance} disabled={busy || !attUnit} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50">
              Katıldı İşaretle
            </button>
          </div>
        )}
        {d.attendance.length === 0 ? (
          <EmptyState>Katılım kaydı yok.</EmptyState>
        ) : (
          <div className="flex flex-wrap gap-2">
            {d.attendance.map((a) => (
              <span key={a.unit_id} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${a.present ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400 line-through'}`}>
                {a.unit_label}{a.proxy_name ? ` (vekil: ${a.proxy_name})` : ''}
                {canManage && editable && a.present && (
                  <button onClick={() => call('mark_attendance', { p_assembly_id: d.id, p_unit_id: a.unit_id, p_present: false })} disabled={busy} className="text-emerald-400 hover:text-red-500">×</button>
                )}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Tutanak */}
      {d.minutes && (
        <Card title="Tutanak">
          <p className="whitespace-pre-wrap text-sm text-slate-600">{d.minutes}</p>
        </Card>
      )}

      {/* Gündem modal */}
      {itemOpen && (
        <Modal title={itemId ? 'Gündem Maddesi Düzenle' : 'Gündem Maddesi Ekle'} onClose={() => setItemOpen(false)}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-4 gap-3">
              <Field label="No">
                <input value={itemNo} onChange={(e) => setItemNo(e.target.value)} className={inputCls} inputMode="numeric" />
              </Field>
              <div className="col-span-3">
                <Field label="Başlık *">
                  <input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} className={inputCls} />
                </Field>
              </div>
            </div>
            <Field label="Açıklama">
              <textarea value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} className={inputCls} rows={3} />
            </Field>
            {itemErr && <p className="text-sm text-red-600">{itemErr}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setItemOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submitItem} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Kapatma modal */}
      {closeOpen && (
        <Modal title="Toplantıyı Kapat" onClose={() => setCloseOpen(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Tutanak">
              <textarea value={minutes} onChange={(e) => setMinutes(e.target.value)} className={inputCls} rows={6} placeholder="Toplantı tutanağı / alınan kararların özeti…" />
            </Field>
            <p className="text-xs text-slate-400">Kapatınca tüm oylamalar durur ve toplantı kilitlenir; geri alınamaz.</p>
            {closeErr && <p className="text-sm text-red-600">{closeErr}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setCloseOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Vazgeç</button>
              <button onClick={() => submitClose('iptal')} disabled={busy} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                İptal Et
              </button>
              <button onClick={() => submitClose('tamamlandi')} disabled={busy} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50">
                {busy ? 'Kaydediliyor…' : 'Tamamlandı Olarak Kapat'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
