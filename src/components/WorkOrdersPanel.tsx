'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { PhoneLink } from '@/components/PhoneLink';
import { useReadOnly } from '@/components/ReadOnly';
import { money, date } from '@/lib/format';
import { todayLocalISO } from '@/lib/date';
import { friendlyDbMessage } from '@/lib/error';

export type WorkOrder = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  cost: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  source_complaint_id: string | null;
  unit_id: string | null;
  unit_label: string | null;
  assignee_user_id: string | null;
  assignee_display: string | null;
  assignee_phone: string | null;
};

export type SiteUser = { id: string; full_name: string | null; role: string };
export type OpenComplaint = { id: string; title: string; status: string; created_at: string };
export type AccountOption = { id: string; ad: string; tur: string };

type Activity = { action: string; note: string | null; created_at: string; actor: string | null };
type Detail = WorkOrder & { cost_note: string | null; activity: Activity[] };
type WoDoc = { id: string; title: string; storage_path: string; created_at: string };

const KIND_LABEL: Record<string, string> = { ariza: 'Arıza', bakim: 'Bakım', dilek: 'Dilek', sikayet: 'Şikayet' };
const KIND_TONE: Record<string, 'red' | 'blue' | 'green' | 'amber'> = { ariza: 'red', bakim: 'blue', dilek: 'green', sikayet: 'amber' };

const PRIORITY_LABEL: Record<string, string> = { dusuk: 'Düşük', normal: 'Normal', yuksek: 'Yüksek', acil: 'Acil' };
const PRIORITY_TONE: Record<string, 'slate' | 'amber' | 'red'> = { dusuk: 'slate', normal: 'slate', yuksek: 'amber', acil: 'red' };

const STATUS_LABEL: Record<string, string> = {
  acik: 'Açık', atandi: 'Atandı', devam: 'Devam Ediyor', beklemede: 'Beklemede', tamamlandi: 'Tamamlandı', iptal: 'İptal',
};
// Durum panosu kolonları (iptal ayrı, gizli tutulur)
const BOARD_COLUMNS: string[] = ['acik', 'atandi', 'devam', 'beklemede', 'tamamlandi'];
const ACTION_LABEL: Record<string, string> = { olustur: 'Oluşturuldu', atama: 'Görevli atandı', durum: 'Durum', maliyet: 'Maliyet', not: 'Not' };

export function WorkOrdersPanel({ siteId, orders: initial, users, complaints, accounts = [] }: { siteId: string; orders: WorkOrder[]; users: SiteUser[]; complaints: OpenComplaint[]; accounts?: AccountOption[] }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [orders, setOrders] = useState<WorkOrder[]>(initial);
  const [busy, setBusy] = useState(false);
  const [kindFilter, setKindFilter] = useState<string>('');

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [cKind, setCKind] = useState('ariza');
  const [cTitle, setCTitle] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cPriority, setCPriority] = useState('normal');
  const [cDue, setCDue] = useState('');
  const [cComplaint, setCComplaint] = useState('');
  const [cErr, setCErr] = useState('');

  // detail modal
  const [detail, setDetail] = useState<Detail | null>(null);
  const [dErr, setDErr] = useState('');
  // assign fields
  const [aUser, setAUser] = useState('');
  const [aName, setAName] = useState('');
  const [aPhone, setAPhone] = useState('');
  // cost fields
  const [costVal, setCostVal] = useState('');
  const [costNote, setCostNote] = useState('');
  const [costAccount, setCostAccount] = useState(''); // '' = kasaya işleme
  // documents (modül derin-link)
  const [docs, setDocs] = useState<WoDoc[]>([]);
  const docRef = useRef<HTMLInputElement>(null);

  async function loadDocs(id: string) {
    const { data } = await supabaseBrowser().rpc('get_site_documents', {
      p_category: undefined, p_entity_type: 'work_order', p_entity_id: id,
    });
    setDocs((data ?? []) as unknown as WoDoc[]);
  }

  async function reload() {
    setBusy(true);
    const { data } = await supabaseBrowser().rpc('get_work_orders', { p_status: undefined });
    setBusy(false);
    setOrders((data ?? []) as WorkOrder[]);
  }

  async function openDetail(id: string) {
    setDErr('');
    const { data, error } = await supabaseBrowser().rpc('get_work_order_detail', { p_id: id });
    if (error || !data) { alert('Açılamadı: ' + friendlyDbMessage(error?.message ?? 'boş')); return; }
    const d = data as Detail;
    setDetail(d);
    setAUser(d.assignee_user_id ?? '');
    setAName(d.assignee_user_id ? '' : (d.assignee_display ?? ''));
    setAPhone(d.assignee_phone ?? '');
    setCostVal(d.cost ? String(d.cost) : '');
    setCostNote(d.cost_note ?? '');
    setCostAccount('');
    await loadDocs(d.id);
  }

  async function attachDoc() {
    if (!detail) return;
    const file = docRef.current?.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { setDErr('Dosya 25 MB sınırını aşıyor.'); return; }
    setBusy(true); setDErr('');
    const sb = supabaseBrowser();
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${siteId}/${crypto.randomUUID()}.${ext}`;
    const up = await sb.storage.from('site-archive').upload(path, file, { contentType: file.type || undefined });
    if (up.error) { setBusy(false); setDErr('Yükleme hatası: ' + up.error.message); return; }
    const { error } = await sb.rpc('add_site_document', {
      p_category: 'diger', p_title: file.name, p_storage_path: path,
      p_mime: file.type || undefined, p_size_bytes: file.size,
      p_entity_type: 'work_order', p_entity_id: detail.id,
    });
    if (error) { await sb.storage.from('site-archive').remove([path]); setBusy(false); setDErr(friendlyDbMessage(error.message)); return; }
    setBusy(false);
    if (docRef.current) docRef.current.value = '';
    await loadDocs(detail.id);
  }

  async function openDoc(path: string) {
    const { data, error } = await supabaseBrowser().storage.from('site-archive').createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) { alert('Açılamadı'); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  async function removeDoc(d: WoDoc) {
    if (!detail) return;
    if (!confirm(`"${d.title}" silinsin mi?`)) return;
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.rpc('delete_site_document', { p_id: d.id });
    if (error) { setBusy(false); alert('Silinemedi: ' + friendlyDbMessage(error.message)); return; }
    await sb.storage.from('site-archive').remove([d.storage_path]);
    setBusy(false);
    await loadDocs(detail.id);
  }

  async function submitCreate() {
    if (!cTitle.trim()) { setCErr('Başlık girin.'); return; }
    setBusy(true); setCErr('');
    let error;
    if (cComplaint) {
      ({ error } = await supabaseBrowser().rpc('convert_complaint_to_work_order', { p_complaint_id: cComplaint }));
    } else {
      ({ error } = await supabaseBrowser().rpc('create_work_order', {
        p_kind: cKind,
        p_title: cTitle.trim(),
        p_description: cDesc.trim() || undefined,
        p_priority: cPriority,
        p_due_date: cDue || undefined,
      }));
    }
    setBusy(false);
    if (error) { setCErr(friendlyDbMessage(error.message)); return; }
    setCreateOpen(false);
    setCKind('ariza'); setCTitle(''); setCDesc(''); setCPriority('normal'); setCDue(''); setCComplaint('');
    await reload();
    router.refresh();
  }

  async function submitAssign() {
    if (!detail) return;
    setBusy(true); setDErr('');
    const { error } = await supabaseBrowser().rpc('assign_work_order', {
      p_id: detail.id,
      p_assignee_user_id: aUser || undefined,
      p_assignee_name: aUser ? undefined : (aName.trim() || undefined),
      p_assignee_phone: aUser ? undefined : (aPhone.trim() || undefined),
    });
    setBusy(false);
    if (error) { setDErr(friendlyDbMessage(error.message)); return; }
    await refreshDetail(detail.id);
  }

  async function submitCost() {
    if (!detail) return;
    const val = Number(costVal.replace(',', '.'));
    if (isNaN(val) || val < 0) { setDErr('Geçerli bir tutar girin.'); return; }
    setBusy(true); setDErr('');
    const { error } = await supabaseBrowser().rpc('set_work_order_cost', {
      p_id: detail.id, p_cost: val, p_cost_note: costNote.trim() || undefined,
      p_cash_account_id: costAccount || undefined,
    });
    setBusy(false);
    if (error) { setDErr(friendlyDbMessage(error.message)); return; }
    await refreshDetail(detail.id);
  }

  async function changeStatus(newStatus: string) {
    if (!detail) return;
    setBusy(true); setDErr('');
    const { error } = await supabaseBrowser().rpc('update_work_order_status', {
      p_id: detail.id, p_status: newStatus,
    });
    setBusy(false);
    if (error) { setDErr(friendlyDbMessage(error.message)); return; }
    await refreshDetail(detail.id);
  }

  async function refreshDetail(id: string) {
    const { data } = await supabaseBrowser().rpc('get_work_order_detail', { p_id: id });
    if (data) setDetail(data as Detail);
    await reload();
    router.refresh();
  }

  const filtered = kindFilter ? orders.filter((o) => o.kind === kindFilter) : orders;
  const iptalCount = filtered.filter((o) => o.status === 'iptal').length;
  const todayIso = todayLocalISO();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={kindFilter === ''} onClick={() => setKindFilter('')}>Tümü</FilterChip>
          {Object.entries(KIND_LABEL).map(([k, label]) => (
            <FilterChip key={k} active={kindFilter === k} onClick={() => setKindFilter(k)}>{label}</FilterChip>
          ))}
        </div>
        {!ro && (
          <button
            onClick={() => { setCErr(''); setCreateOpen(true); }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Yeni Talep
          </button>
        )}
      </div>

      {/* Durum panosu */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {BOARD_COLUMNS.map((col) => {
          const items = filtered.filter((o) => o.status === col);
          return (
            <div key={col} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{STATUS_LABEL[col]}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] text-slate-300">—</div>
                ) : (
                  items.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => openDetail(o.id)}
                      className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-300 hover:shadow"
                    >
                      <div className="flex items-center gap-1.5">
                        <Badge tone={KIND_TONE[o.kind] ?? 'slate'}>{KIND_LABEL[o.kind] ?? o.kind}</Badge>
                        {(o.priority === 'yuksek' || o.priority === 'acil') && (
                          <Badge tone={PRIORITY_TONE[o.priority]}>{PRIORITY_LABEL[o.priority]}</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium leading-snug text-slate-800">{o.title}</p>
                      {o.unit_label && <p className="text-[11px] text-slate-400">🏠 {o.unit_label}</p>}
                      {o.assignee_display && <p className="text-[11px] text-slate-500">👤 {o.assignee_display}</p>}
                      {o.due_date && !['tamamlandi', 'iptal'].includes(o.status) && (
                        o.due_date < todayIso ? (
                          <p className="text-[11px] font-semibold text-red-600">⚠ Termin geçti: {date(o.due_date)}</p>
                        ) : (
                          <p className="text-[11px] text-slate-400">📅 Termin: {date(o.due_date)}</p>
                        )
                      )}
                      <div className="flex items-center justify-between pt-0.5">
                        {Number(o.cost) > 0 ? (
                          <span className="text-[11px] font-medium text-slate-600">{money(Number(o.cost), true)}</span>
                        ) : <span />}
                        <span className="text-[10px] text-slate-300">{date(o.created_at)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {iptalCount > 0 && (
        <p className="text-center text-xs text-slate-400">+ {iptalCount} iptal edilmiş talep (panoda gösterilmiyor)</p>
      )}
      {orders.length === 0 && (
        <Card><EmptyState>Henüz iş talebi yok. Sağ üstten yeni talep oluşturun.</EmptyState></Card>
      )}

      <RecurringTemplates siteId={siteId} />

      {/* Yeni talep modalı */}
      {createOpen && (
        <Modal title="Yeni İş Talebi" onClose={() => setCreateOpen(false)}>
          <div className="flex flex-col gap-3">
            {complaints.length > 0 && (
              <Field label="Şikayetten dönüştür (opsiyonel)">
                <select value={cComplaint} onChange={(e) => setCComplaint(e.target.value)} className={inputCls}>
                  <option value="">— Yeni talep oluştur —</option>
                  {complaints.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </Field>
            )}
            {!cComplaint && (
              <>
                <Field label="Talep Tipi">
                  <select value={cKind} onChange={(e) => setCKind(e.target.value)} className={inputCls}>
                    {Object.entries(KIND_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                </Field>
                <Field label="Başlık *">
                  <input value={cTitle} onChange={(e) => setCTitle(e.target.value)} className={inputCls} placeholder="örn. Bodrum kat su kaçağı" />
                </Field>
                <Field label="Açıklama (opsiyonel)">
                  <textarea value={cDesc} onChange={(e) => setCDesc(e.target.value)} className={inputCls} rows={3} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Öncelik">
                    <select value={cPriority} onChange={(e) => setCPriority(e.target.value)} className={inputCls}>
                      {Object.entries(PRIORITY_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label="Termin (opsiyonel)">
                    <input type="date" value={cDue} onChange={(e) => setCDue(e.target.value)} className={inputCls} />
                  </Field>
                </div>
              </>
            )}
            {cErr && <p className="text-sm text-red-600">{cErr}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setCreateOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submitCreate} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Kaydediliyor…' : cComplaint ? 'Dönüştür' : 'Oluştur'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detay modalı */}
      {detail && (
        <Modal title={detail.title} onClose={() => { setDetail(null); setDocs([]); }}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={KIND_TONE[detail.kind] ?? 'slate'}>{KIND_LABEL[detail.kind] ?? detail.kind}</Badge>
              <Badge tone={PRIORITY_TONE[detail.priority]}>{PRIORITY_LABEL[detail.priority]}</Badge>
              <Badge tone="slate">{STATUS_LABEL[detail.status] ?? detail.status}</Badge>
              {detail.unit_label && <span className="text-xs text-slate-500">🏠 {detail.unit_label}</span>}
            </div>
            {detail.description && <p className="whitespace-pre-wrap text-sm text-slate-600">{detail.description}</p>}

            {!ro && detail.status !== 'iptal' && (
              <>
                {/* Durum değiştir */}
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Durum</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['atandi', 'devam', 'beklemede', 'tamamlandi', 'iptal'].filter((s) => s !== detail.status).map((s) => (
                      <button key={s} onClick={() => changeStatus(s)} disabled={busy}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Görevli ata */}
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Görevli</p>
                  <div className="flex flex-col gap-2">
                    <select value={aUser} onChange={(e) => setAUser(e.target.value)} className={inputCls}>
                      <option value="">— Harici / kişi gir —</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.full_name ?? '(isimsiz)'} · {u.role}</option>)}
                    </select>
                    {!aUser && (
                      <div className="grid grid-cols-2 gap-2">
                        <input value={aName} onChange={(e) => setAName(e.target.value)} className={inputCls} placeholder="Ad / firma" />
                        <input value={aPhone} onChange={(e) => setAPhone(e.target.value)} className={inputCls} placeholder="Telefon" />
                      </div>
                    )}
                    <button onClick={submitAssign} disabled={busy} className="self-start rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                      Görevliyi Kaydet
                    </button>
                  </div>
                </div>

                {/* Maliyet */}
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Maliyet</p>
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={costVal} onChange={(e) => setCostVal(e.target.value)} className={inputCls} placeholder="0,00 ₺" inputMode="decimal" />
                      <input value={costNote} onChange={(e) => setCostNote(e.target.value)} className={inputCls} placeholder="Açıklama" />
                    </div>
                    {accounts.length > 0 && (
                      <select value={costAccount} onChange={(e) => setCostAccount(e.target.value)} className={inputCls}>
                        <option value="">Kasaya işleme (yalnız maliyet bilgisi)</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>Kasadan düş: {a.ad}</option>)}
                      </select>
                    )}
                    {costAccount && (
                      <p className="text-[11px] text-slate-400">Seçilen hesaba "Tamir" gideri yazılır ve bu işe bağlanır; tutarı güncellerseniz gider de güncellenir. Kasa ekranından ikinci kez girmeyin.</p>
                    )}
                    <button onClick={submitCost} disabled={busy} className="self-start rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                      Maliyeti Kaydet
                    </button>
                  </div>
                </div>
              </>
            )}

            {detail.assignee_phone && (
              <p className="text-sm text-slate-600">Görevli telefonu: <PhoneLink phone={detail.assignee_phone} /></p>
            )}
            {ro && detail.assignee_display && (
              <p className="text-sm text-slate-600">Görevli: <span className="font-medium">{detail.assignee_display}</span></p>
            )}
            {ro && Number(detail.cost) > 0 && (
              <p className="text-sm text-slate-600">Maliyet: <span className="font-medium">{money(Number(detail.cost), true)}</span></p>
            )}

            {dErr && <p className="text-sm text-red-600">{dErr}</p>}

            {/* Belgeler (modül derin-link) */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Belgeler</p>
              {docs.length === 0 ? (
                <p className="text-xs text-slate-400">Bu talebe bağlı belge yok.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {docs.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                      <button onClick={() => openDoc(d.storage_path)} className="truncate text-left text-xs font-medium text-blue-600 hover:underline">📎 {d.title}</button>
                      {!ro && <button onClick={() => removeDoc(d)} disabled={busy} className="text-xs text-slate-400 hover:text-red-600">Sil</button>}
                    </li>
                  ))}
                </ul>
              )}
              {!ro && (
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-blue-600 hover:underline">
                  <input ref={docRef} type="file" className="hidden" onChange={attachDoc} disabled={busy} />
                  + Belge Ekle
                </label>
              )}
            </div>

            {/* Geçmiş */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Geçmiş</p>
              <ol className="flex flex-col gap-1.5 border-l-2 border-slate-100 pl-3">
                {detail.activity.map((a, i) => (
                  <li key={i} className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{ACTION_LABEL[a.action] ?? a.action}</span>
                    {a.note ? <>: {a.note}</> : null}
                    <span className="ml-1 text-slate-300">· {date(a.created_at)}{a.actor ? ` · ${a.actor}` : ''}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Rapor #24: asansör bakımı, ilaçlama gibi düzenli işler için şablon — her gün 07:00 cron'u
 *  vadesi gelen şablondan otomatik iş emri açar (run_work_order_templates). */
type Template = {
  id: string; title: string; description: string | null; kind: string; priority: string;
  assignee_name: string | null; assignee_phone: string | null;
  day_of_month: number; interval_months: number; due_days: number;
  active: boolean; last_generated_period: string | null;
};
type TemplateForm = {
  id: string | null; title: string; description: string; kind: string; priority: string;
  assignee_name: string; assignee_phone: string; day_of_month: string; interval_months: string; due_days: string;
};
const EMPTY_TPL: TemplateForm = {
  id: null, title: '', description: '', kind: 'bakim', priority: 'normal',
  assignee_name: '', assignee_phone: '', day_of_month: '1', interval_months: '1', due_days: '7',
};

function RecurringTemplates({ siteId }: { siteId: string }) {
  const ro = useReadOnly();
  const [rows, setRows] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TemplateForm>(EMPTY_TPL);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function reload() {
    const { data } = await supabaseBrowser()
      .from('work_order_templates')
      .select('id, title, description, kind, priority, assignee_name, assignee_phone, day_of_month, interval_months, due_days, active, last_generated_period')
      .eq('site_id', siteId)
      .order('day_of_month', { ascending: true });
    setRows((data ?? []) as Template[]);
  }
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openNew() { setForm(EMPTY_TPL); setErr(''); setOpen(true); }
  function openEdit(t: Template) {
    setForm({
      id: t.id, title: t.title, description: t.description ?? '', kind: t.kind, priority: t.priority,
      assignee_name: t.assignee_name ?? '', assignee_phone: t.assignee_phone ?? '',
      day_of_month: String(t.day_of_month), interval_months: String(t.interval_months), due_days: String(t.due_days),
    });
    setErr(''); setOpen(true);
  }

  async function submit() {
    if (!form.title.trim()) { setErr('Başlık girin.'); return; }
    const day = Number(form.day_of_month), months = Number(form.interval_months), dueDays = Number(form.due_days);
    if (!Number.isInteger(day) || day < 1 || day > 28) { setErr('Ayın günü 1–28 arası olmalı.'); return; }
    if (!Number.isInteger(months) || months < 1 || months > 12) { setErr('Tekrar aralığı 1–12 ay arası olmalı.'); return; }
    if (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > 60) { setErr('Termin süresi 0–60 gün arası olmalı.'); return; }
    setBusy(true); setErr('');
    const sb = supabaseBrowser();
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      kind: form.kind, priority: form.priority,
      assignee_name: form.assignee_name.trim() || null,
      assignee_phone: form.assignee_phone.trim() || null,
      day_of_month: day, interval_months: months, due_days: dueDays,
    };
    const { error } = form.id
      ? await sb.from('work_order_templates').update(payload).eq('id', form.id)
      : await sb.from('work_order_templates').insert({ site_id: siteId, ...payload });
    setBusy(false);
    if (error) { setErr(friendlyDbMessage(error.message)); return; }
    setOpen(false);
    await reload();
  }

  async function toggleActive(t: Template) {
    setBusy(true);
    await supabaseBrowser().from('work_order_templates').update({ active: !t.active }).eq('id', t.id);
    setBusy(false);
    await reload();
  }

  async function remove(t: Template) {
    if (!confirm(`"${t.title}" şablonu silinsin mi? (Açılmış iş emirleri silinmez.)`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().from('work_order_templates').delete().eq('id', t.id);
    setBusy(false);
    if (error) { alert('Silinemedi: ' + friendlyDbMessage(error.message)); return; }
    await reload();
  }

  return (
    <Card
      title="🔁 Periyodik İş Şablonları"
      action={!ro && (
        <button onClick={openNew} className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">
          + Şablon Ekle
        </button>
      )}
    >
      {rows.length === 0 ? (
        <EmptyState>
          Şablon yok. Asansör aylık bakımı, ilaçlama, hidrofor kontrolü gibi düzenli işleri şablona bağlayın —
          her ay vaktinde otomatik iş emri açılır, siz hatırlamak zorunda kalmazsınız.
        </EmptyState>
      ) : (
        <div className="flex flex-col divide-y divide-slate-50">
          {rows.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  {t.title}
                  <Badge tone={KIND_TONE[t.kind] ?? 'slate'}>{KIND_LABEL[t.kind] ?? t.kind}</Badge>
                  {!t.active && <Badge tone="slate">Duraklatıldı</Badge>}
                </p>
                <p className="text-xs text-slate-400">
                  Her {t.interval_months > 1 ? `${t.interval_months} ayda bir` : 'ay'}, ayın {t.day_of_month}. günü
                  {' · '}termin +{t.due_days} gün
                  {t.assignee_name ? ` · 👤 ${t.assignee_name}` : ''}
                  {t.last_generated_period ? ` · son üretim: ${date(t.last_generated_period)}` : ' · henüz üretilmedi'}
                </p>
              </div>
              {!ro && (
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleActive(t)} disabled={busy} className="text-xs font-medium text-slate-500 hover:underline disabled:opacity-50">
                    {t.active ? 'Duraklat' : 'Devam Ettir'}
                  </button>
                  <button onClick={() => openEdit(t)} className="text-xs font-medium text-blue-600 hover:underline">Düzenle</button>
                  <button onClick={() => remove(t)} disabled={busy} className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-50">Sil</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal title={form.id ? 'Şablonu Düzenle' : 'Periyodik İş Şablonu'} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Başlık *">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="örn. Asansör aylık bakımı" />
            </Field>
            <Field label="Açıklama">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={2} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Talep Tipi">
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={inputCls}>
                  {Object.entries(KIND_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </Field>
              <Field label="Öncelik">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                  {Object.entries(PRIORITY_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Ayın günü (1–28)">
                <input value={form.day_of_month} onChange={(e) => setForm({ ...form, day_of_month: e.target.value })} className={inputCls} inputMode="numeric" />
              </Field>
              <Field label="Tekrar (ay)">
                <input value={form.interval_months} onChange={(e) => setForm({ ...form, interval_months: e.target.value })} className={inputCls} inputMode="numeric" />
              </Field>
              <Field label="Termin (+gün)">
                <input value={form.due_days} onChange={(e) => setForm({ ...form, due_days: e.target.value })} className={inputCls} inputMode="numeric" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Görevli / Firma (ops.)">
                <input value={form.assignee_name} onChange={(e) => setForm({ ...form, assignee_name: e.target.value })} className={inputCls} placeholder="örn. Kone servisi" />
              </Field>
              <Field label="Telefon (ops.)">
                <input value={form.assignee_phone} onChange={(e) => setForm({ ...form, assignee_phone: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <p className="text-xs text-slate-400">Her sabah 07:00'de kontrol edilir: sırası gelen şablondan iş emri açılır ve bildirim gelir. Aynı ay içinde ikinci kez üretilmez.</p>
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
    </Card>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}
