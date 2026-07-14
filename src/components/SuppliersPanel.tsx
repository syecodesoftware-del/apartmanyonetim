'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Table, Th, Td, Badge, StatCard } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { PhoneLink } from '@/components/PhoneLink';
import { useReadOnly } from '@/components/ReadOnly';
import { money, date } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';

export type Supplier = {
  id: string; name: string; category: string; vkn: string | null; phone: string | null;
  email: string | null; iban: string | null; contact_person: string | null; active: boolean; note: string | null;
};
export type Invoice = {
  id: string; supplier_id: string; supplier_name: string; invoice_no: string | null;
  invoice_date: string | null; due_date: string | null; amount: number; description: string | null;
  status: string; reject_reason: string | null; approved_at: string | null; paid_at: string | null;
  work_order_id: string | null; approved_by_name: string | null; created_at: string;
};
export type QueueItem = {
  id: string; supplier_name: string; iban: string | null; invoice_no: string | null;
  due_date: string | null; amount: number; description: string | null; overdue: boolean;
};
export type AccountOption = { id: string; ad: string; tur: string };

const SUP_CATS: { key: string; label: string }[] = [
  { key: 'asansor', label: 'Asansör' }, { key: 'temizlik', label: 'Temizlik' }, { key: 'guvenlik', label: 'Güvenlik' },
  { key: 'yakit', label: 'Yakıt' }, { key: 'elektrik', label: 'Elektrik' }, { key: 'su', label: 'Su' },
  { key: 'bahce', label: 'Bahçe' }, { key: 'insaat', label: 'İnşaat' }, { key: 'hukuk', label: 'Hukuk' },
  { key: 'muhasebe', label: 'Muhasebe' }, { key: 'diger', label: 'Diğer' },
];
const SUP_CAT_LABEL: Record<string, string> = Object.fromEntries(SUP_CATS.map((c) => [c.key, c.label]));

const INV_STATUS: Record<string, { label: string; tone: 'amber' | 'green' | 'red' | 'blue' | 'slate' }> = {
  pending: { label: 'Onay Bekliyor', tone: 'amber' },
  approved: { label: 'Onaylandı', tone: 'blue' },
  rejected: { label: 'Reddedildi', tone: 'red' },
  paid: { label: 'Ödendi', tone: 'green' },
};

type SupForm = {
  id: string | null; name: string; category: string; vkn: string; phone: string; email: string;
  iban: string; contact_person: string; active: boolean; note: string;
};
const EMPTY_SUP: SupForm = { id: null, name: '', category: 'diger', vkn: '', phone: '', email: '', iban: '', contact_person: '', active: true, note: '' };

type InvForm = { id: string | null; supplier_id: string; amount: string; invoice_no: string; invoice_date: string; due_date: string; description: string };
const EMPTY_INV: InvForm = { id: null, supplier_id: '', amount: '', invoice_no: '', invoice_date: '', due_date: '', description: '' };

export function SuppliersPanel({ canApprove, suppliers: initSup, invoices: initInv, queue: initQ, accounts = [] }: {
  canApprove: boolean; suppliers: Supplier[]; invoices: Invoice[]; queue: QueueItem[]; accounts?: AccountOption[];
}) {
  const router = useRouter();
  const ro = useReadOnly();
  const [tab, setTab] = useState<'invoices' | 'suppliers'>('invoices');
  const [suppliers, setSuppliers] = useState<Supplier[]>(initSup);
  const [invoices, setInvoices] = useState<Invoice[]>(initInv);
  const [queue, setQueue] = useState<QueueItem[]>(initQ);
  const [statusFilter, setStatusFilter] = useState('');
  const [busy, setBusy] = useState(false);

  const [supOpen, setSupOpen] = useState(false);
  const [supForm, setSupForm] = useState<SupForm>(EMPTY_SUP);
  const [supErr, setSupErr] = useState('');

  const [invOpen, setInvOpen] = useState(false);
  const [invForm, setInvForm] = useState<InvForm>(EMPTY_INV);
  const [invErr, setInvErr] = useState('');

  async function reloadAll() {
    const sb = supabaseBrowser();
    const [{ data: s }, { data: i }, { data: q }] = await Promise.all([
      sb.rpc('get_suppliers', { p_include_inactive: false }),
      sb.rpc('get_supplier_invoices', { p_status: undefined, p_supplier_id: undefined }),
      sb.rpc('get_payment_queue'),
    ]);
    setSuppliers((s ?? []) as unknown as Supplier[]);
    setInvoices((i ?? []) as unknown as Invoice[]);
    setQueue((q ?? []) as unknown as QueueItem[]);
  }

  // ---- suppliers ----
  function openNewSup() { setSupForm(EMPTY_SUP); setSupErr(''); setSupOpen(true); }
  function openEditSup(s: Supplier) {
    setSupForm({ id: s.id, name: s.name, category: s.category, vkn: s.vkn ?? '', phone: s.phone ?? '', email: s.email ?? '', iban: s.iban ?? '', contact_person: s.contact_person ?? '', active: s.active, note: s.note ?? '' });
    setSupErr(''); setSupOpen(true);
  }
  async function submitSup() {
    if (!supForm.name.trim()) { setSupErr('İsim girin.'); return; }
    setBusy(true); setSupErr('');
    const { error } = await supabaseBrowser().rpc('save_supplier', {
      p_id: supForm.id, p_name: supForm.name.trim(), p_category: supForm.category,
      p_vkn: supForm.vkn.trim() || undefined, p_phone: supForm.phone.trim() || undefined,
      p_email: supForm.email.trim() || undefined, p_iban: supForm.iban.trim() || undefined,
      p_contact_person: supForm.contact_person.trim() || undefined, p_active: supForm.active, p_note: supForm.note.trim() || undefined,
    });
    setBusy(false);
    if (error) { setSupErr(friendlyDbMessage(error.message)); return; }
    setSupOpen(false); await reloadAll(); router.refresh();
  }
  async function deleteSup(s: Supplier) {
    if (!confirm(`"${s.name}" silinsin mi?`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('delete_supplier', { p_id: s.id });
    setBusy(false);
    if (error) { alert('Silinemedi: ' + friendlyDbMessage(error.message)); return; }
    await reloadAll(); router.refresh();
  }

  // ---- invoices ----
  function openNewInv() { setInvForm({ ...EMPTY_INV, supplier_id: suppliers[0]?.id ?? '' }); setInvErr(''); setInvOpen(true); }
  function openEditInv(i: Invoice) {
    setInvForm({ id: i.id, supplier_id: i.supplier_id, amount: String(i.amount), invoice_no: i.invoice_no ?? '', invoice_date: i.invoice_date ?? '', due_date: i.due_date ?? '', description: i.description ?? '' });
    setInvErr(''); setInvOpen(true);
  }
  async function submitInv() {
    if (!invForm.supplier_id) { setInvErr('Tedarikçi seçin.'); return; }
    const amt = Number(invForm.amount.replace(',', '.'));
    if (isNaN(amt) || amt < 0) { setInvErr('Geçerli tutar girin.'); return; }
    setBusy(true); setInvErr('');
    const { error } = await supabaseBrowser().rpc('save_supplier_invoice', {
      p_id: invForm.id, p_supplier_id: invForm.supplier_id, p_amount: amt,
      p_invoice_no: invForm.invoice_no.trim() || undefined, p_invoice_date: invForm.invoice_date || undefined,
      p_due_date: invForm.due_date || undefined, p_description: invForm.description.trim() || undefined,
    });
    setBusy(false);
    if (error) { setInvErr(friendlyDbMessage(error.message)); return; }
    setInvOpen(false); await reloadAll(); router.refresh();
  }
  async function act(fn: 'approve_invoice' | 'reject_invoice' | 'mark_invoice_paid', id: string, extra?: Record<string, unknown>) {
    setBusy(true);
    const { error } = await supabaseBrowser().rpc(fn, { p_id: id, ...extra } as never);
    setBusy(false);
    if (error) { alert('İşlem başarısız: ' + friendlyDbMessage(error.message)); return; }
    await reloadAll(); router.refresh();
  }
  async function approve(i: Invoice) { if (confirm(`${i.supplier_name} — ${money(Number(i.amount), true)} faturası onaylansın mı?`)) await act('approve_invoice', i.id); }

  // Ret modalı (rapor #33: çıplak prompt() yerine)
  const [rejectTarget, setRejectTarget] = useState<Invoice | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  async function submitReject() {
    if (!rejectTarget) return;
    await act('reject_invoice', rejectTarget.id, { p_reason: rejectReason.trim() || undefined });
    setRejectTarget(null); setRejectReason('');
  }

  // Ödeme modalı: ödendi işaretle + opsiyonel kasadan düş (tek işlem, çift kayıt yok)
  const [payTarget, setPayTarget] = useState<{ id: string; label: string; amount: number } | null>(null);
  const [payDate, setPayDate] = useState('');
  const [payAccount, setPayAccount] = useState('');
  const [payErr, setPayErr] = useState('');

  function openPay(id: string, label: string, amount: number) {
    setPayTarget({ id, label, amount });
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayAccount(accounts[0]?.id ?? '');
    setPayErr('');
  }
  async function confirmPay() {
    if (!payTarget) return;
    setBusy(true); setPayErr('');
    const { error } = await supabaseBrowser().rpc('mark_invoice_paid', {
      p_id: payTarget.id,
      p_paid_date: payDate || undefined,
      p_cash_account_id: payAccount || undefined,
    });
    setBusy(false);
    if (error) { setPayErr(friendlyDbMessage(error.message)); return; }
    setPayTarget(null);
    await reloadAll(); router.refresh();
  }

  const filteredInv = statusFilter ? invoices.filter((i) => i.status === statusFilter) : invoices;
  const queueTotal = queue.reduce((a, q) => a + Number(q.amount), 0);
  const pendingCount = invoices.filter((i) => i.status === 'pending').length;

  return (
    <div className="flex flex-col gap-4">
      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Onay Bekleyen" value={String(pendingCount)} tone={pendingCount > 0 ? 'warning' : 'default'} />
        <StatCard label="Ödeme Kuyruğu" value={String(queue.length)} />
        <StatCard label="Kuyruk Toplamı" value={money(queueTotal, true)} tone={queue.some((q) => q.overdue) ? 'danger' : 'default'} />
      </div>

      {/* Ödeme kuyruğu */}
      {queue.length > 0 && (
        <Card title="Ödeme Kuyruğu (onaylı · ödenmemiş)">
          <div className="overflow-x-auto">
            <Table>
              <thead><tr><Th>Tedarikçi</Th><Th>Fatura</Th><Th>Vade</Th><Th className="text-right">Tutar</Th><Th>IBAN</Th>{!ro && <Th></Th>}</tr></thead>
              <tbody>
                {queue.map((q) => (
                  <tr key={q.id}>
                    <Td className="font-medium">{q.supplier_name}</Td>
                    <Td className="text-slate-500">{q.invoice_no ?? '—'}{q.description ? ` · ${q.description}` : ''}</Td>
                    <Td>{q.due_date ? <span className={q.overdue ? 'font-medium text-red-600' : 'text-slate-500'}>{date(q.due_date)}{q.overdue ? ' (geçti)' : ''}</span> : '—'}</Td>
                    <Td className="text-right tabular-nums font-medium">{money(Number(q.amount), true)}</Td>
                    <Td className="text-xs text-slate-400">{q.iban ?? '—'}</Td>
                    {!ro && <Td className="text-right"><button onClick={() => openPay(q.id, `${q.supplier_name}${q.invoice_no ? ' · ' + q.invoice_no : ''}`, Number(q.amount))} disabled={busy} className="text-xs font-medium text-green-600 hover:underline disabled:opacity-50">Ödendi</button></Td>}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* Sekmeler */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <TabBtn active={tab === 'invoices'} onClick={() => setTab('invoices')}>Faturalar</TabBtn>
          <TabBtn active={tab === 'suppliers'} onClick={() => setTab('suppliers')}>Tedarikçiler</TabBtn>
        </div>
        {!ro && (
          tab === 'invoices'
            ? <button onClick={openNewInv} disabled={suppliers.length === 0} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">+ Fatura Gir</button>
            : <button onClick={openNewSup} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ Tedarikçi Ekle</button>
        )}
      </div>

      {tab === 'invoices' ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={statusFilter === ''} onClick={() => setStatusFilter('')}>Tümü</FilterChip>
            {Object.entries(INV_STATUS).map(([k, v]) => <FilterChip key={k} active={statusFilter === k} onClick={() => setStatusFilter(k)}>{v.label}</FilterChip>)}
          </div>
          <Card>
            {filteredInv.length === 0 ? (
              <EmptyState>{suppliers.length === 0 ? 'Önce tedarikçi ekleyin, sonra fatura girin.' : 'Fatura yok.'}</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead><tr><Th>Tedarikçi</Th><Th>Fatura No</Th><Th>Tarih</Th><Th>Vade</Th><Th className="text-right">Tutar</Th><Th>Durum</Th>{!ro && <Th></Th>}</tr></thead>
                  <tbody>
                    {filteredInv.map((i) => (
                      <tr key={i.id}>
                        <Td className="font-medium">{i.supplier_name}</Td>
                        <Td className="text-slate-500">{i.invoice_no ?? '—'}{i.description ? <p className="text-xs text-slate-400">{i.description}</p> : null}</Td>
                        <Td className="text-slate-400">{i.invoice_date ? date(i.invoice_date) : '—'}</Td>
                        <Td className="text-slate-400">{i.due_date ? date(i.due_date) : '—'}</Td>
                        <Td className="text-right tabular-nums font-medium">{money(Number(i.amount), true)}</Td>
                        <Td>
                          <Badge tone={INV_STATUS[i.status]?.tone ?? 'slate'}>{INV_STATUS[i.status]?.label ?? i.status}</Badge>
                          {i.status === 'rejected' && i.reject_reason && <p className="text-xs text-red-400">{i.reject_reason}</p>}
                        </Td>
                        {!ro && (
                          <Td className="whitespace-nowrap text-right">
                            {i.status === 'pending' && (
                              <>
                                <button onClick={() => openEditInv(i)} className="text-xs text-slate-500 hover:underline">Düzenle</button>
                                {canApprove && <button onClick={() => approve(i)} disabled={busy} className="ml-3 text-xs font-medium text-blue-600 hover:underline disabled:opacity-50">Onayla</button>}
                                {canApprove && <button onClick={() => { setRejectTarget(i); setRejectReason(''); }} disabled={busy} className="ml-3 text-xs text-red-500 hover:underline disabled:opacity-50">Reddet</button>}
                              </>
                            )}
                            {i.status === 'approved' && <button onClick={() => openPay(i.id, `${i.supplier_name}${i.invoice_no ? ' · ' + i.invoice_no : ''}`, Number(i.amount))} disabled={busy} className="text-xs font-medium text-green-600 hover:underline disabled:opacity-50">Ödendi</button>}
                          </Td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card>
          {!canApprove && !ro && <p className="text-center text-xs text-slate-400">Fatura onayı yalnız site yöneticisi tarafından yapılabilir (görevler ayrılığı).</p>}
        </>
      ) : (
        <Card>
          {suppliers.length === 0 ? (
            <EmptyState>Kayıtlı tedarikçi yok. Sağ üstten ekleyin.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead><tr><Th>Tedarikçi</Th><Th>Kategori</Th><Th>İletişim</Th><Th>IBAN</Th>{!ro && <Th></Th>}</tr></thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id}>
                      <Td><span className="font-medium">{s.name}</span>{s.vkn && <p className="text-xs text-slate-400">VKN: {s.vkn}</p>}</Td>
                      <Td className="text-slate-500">{SUP_CAT_LABEL[s.category] ?? s.category}</Td>
                      <Td className="text-slate-500">
                        {s.contact_person ?? '—'}
                        {s.phone && <> · <PhoneLink phone={s.phone} /></>}
                      </Td>
                      <Td className="text-xs text-slate-400">{s.iban ?? '—'}</Td>
                      {!ro && (
                        <Td className="whitespace-nowrap text-right">
                          <button onClick={() => openEditSup(s)} className="text-xs text-blue-600 hover:underline">Düzenle</button>
                          <button onClick={() => deleteSup(s)} disabled={busy} className="ml-3 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50">Sil</button>
                        </Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      )}

      {/* Tedarikçi modal */}
      {supOpen && (
        <Modal title={supForm.id ? 'Tedarikçi Düzenle' : 'Tedarikçi Ekle'} onClose={() => setSupOpen(false)}>
          <div className="flex flex-col gap-3">
            <Field label="İsim / Unvan *"><input value={supForm.name} onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kategori"><select value={supForm.category} onChange={(e) => setSupForm({ ...supForm, category: e.target.value })} className={inputCls}>{SUP_CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></Field>
              <Field label="VKN"><input value={supForm.vkn} onChange={(e) => setSupForm({ ...supForm, vkn: e.target.value })} className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Yetkili"><input value={supForm.contact_person} onChange={(e) => setSupForm({ ...supForm, contact_person: e.target.value })} className={inputCls} /></Field>
              <Field label="Telefon"><input value={supForm.phone} onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })} className={inputCls} /></Field>
            </div>
            <Field label="E-posta"><input value={supForm.email} onChange={(e) => setSupForm({ ...supForm, email: e.target.value })} className={inputCls} /></Field>
            <Field label="IBAN"><input value={supForm.iban} onChange={(e) => setSupForm({ ...supForm, iban: e.target.value })} className={inputCls} placeholder="TR.." /></Field>
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={supForm.active} onChange={(e) => setSupForm({ ...supForm, active: e.target.checked })} /> Aktif</label>
            <Field label="Not"><input value={supForm.note} onChange={(e) => setSupForm({ ...supForm, note: e.target.value })} className={inputCls} /></Field>
            {supErr && <p className="text-sm text-red-600">{supErr}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setSupOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submitSup} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Fatura modal */}
      {invOpen && (
        <Modal title={invForm.id ? 'Fatura Düzenle' : 'Fatura Gir'} onClose={() => setInvOpen(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Tedarikçi *">
              <select value={invForm.supplier_id} onChange={(e) => setInvForm({ ...invForm, supplier_id: e.target.value })} className={inputCls}>
                <option value="">— seçin —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fatura No"><input value={invForm.invoice_no} onChange={(e) => setInvForm({ ...invForm, invoice_no: e.target.value })} className={inputCls} /></Field>
              <Field label="Tutar (₺) *"><input value={invForm.amount} onChange={(e) => setInvForm({ ...invForm, amount: e.target.value })} className={inputCls} inputMode="decimal" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fatura Tarihi"><input type="date" value={invForm.invoice_date} onChange={(e) => setInvForm({ ...invForm, invoice_date: e.target.value })} className={inputCls} /></Field>
              <Field label="Vade"><input type="date" value={invForm.due_date} onChange={(e) => setInvForm({ ...invForm, due_date: e.target.value })} className={inputCls} /></Field>
            </div>
            <Field label="Açıklama"><input value={invForm.description} onChange={(e) => setInvForm({ ...invForm, description: e.target.value })} className={inputCls} /></Field>
            {invErr && <p className="text-sm text-red-600">{invErr}</p>}
            <p className="text-xs text-slate-400">Fatura "Onay Bekliyor" olarak kaydedilir; yönetici onayından sonra ödeme kuyruğuna düşer.</p>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setInvOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submitInv} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Ret modalı */}
      {rejectTarget && (
        <Modal title="Faturayı Reddet" onClose={() => setRejectTarget(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold">{rejectTarget.supplier_name}</span>
              {rejectTarget.invoice_no ? ` · ${rejectTarget.invoice_no}` : ''} — {money(Number(rejectTarget.amount), true)} reddedilecek.
            </p>
            <Field label="Ret nedeni (opsiyonel — faturada görünür)">
              <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitReject()} className={inputCls} placeholder="örn. tutar sözleşmeyle uyuşmuyor" autoFocus />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setRejectTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submitReject} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {busy ? '…' : 'Reddet'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Ödeme modalı — ödendi + opsiyonel kasadan düşme */}
      {payTarget && (
        <Modal title="Fatura Ödemesi" onClose={() => setPayTarget(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold">{payTarget.label}</span> — {money(payTarget.amount, true)} ödendi olarak işaretlenecek.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ödeme Tarihi">
                <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Kasadan Düş">
                <select value={payAccount} onChange={(e) => setPayAccount(e.target.value)} className={inputCls}>
                  <option value="">Kasaya işleme (yalnız işaretle)</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.ad} ({a.tur === 'banka' ? 'Banka' : 'Nakit'})</option>)}
                </select>
              </Field>
            </div>
            <p className="text-xs text-slate-400">
              Hesap seçerseniz aynı işlemle kasa defterine "Tedarikçi" gideri yazılır ve faturaya bağlanır — ikinci kez elle girmeyin.
            </p>
            {payErr && <p className="text-sm text-red-600">{payErr}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setPayTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={confirmPay} disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {busy ? 'Kaydediliyor…' : 'Ödendi Olarak Kaydet'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${active ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{children}</button>;
}
function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-medium transition ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{children}</button>;
}
