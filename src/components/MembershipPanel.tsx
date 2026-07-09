'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Table, Th, Td, EmptyState, Badge } from '@/components/ui';
import { inputCls, Modal, Field } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';
import { ROLE_LABEL, date } from '@/lib/format';

export type PendingRow = {
  id: string;
  full_name: string;
  apartment_number: string | null;
  block: string | null;
  phone: string | null;
  email: string;
  tc_kimlik: string | null;
  role: string | null;
  created_at: string | null;
};

export type InvitationRow = {
  id: string;
  full_name: string | null;
  tc_kimlik: string | null;
  block: string | null;
  apartment_number: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  status: string;
  token: string | null;
  created_at: string | null;
};

const STATUS_TONE: Record<string, 'amber' | 'green' | 'slate' | 'red'> = {
  pending: 'amber', claimed: 'green', cancelled: 'slate', expired: 'red',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Bekliyor', claimed: 'Kullanıldı', cancelled: 'İptal', expired: 'Süresi doldu',
};

const emptyForm = { tc_kimlik: '', full_name: '', block: '', apartment_number: '', phone: '', email: '', role: 'resident' };

function unitText(block: string | null, apt: string | null) {
  return [block, apt].filter(Boolean).join(' / ') || 'Daire belirtilmemiş';
}

export function MembershipPanel({ pending, invitations, siteId, managerId, autoOpenInvite }: {
  pending: PendingRow[];
  invitations: InvitationRow[];
  siteId: string;
  managerId: string;
  autoOpenInvite?: boolean;
}) {
  const router = useRouter();
  const ro = useReadOnly();

  // Popup durumları
  const [inviteOpen, setInviteOpen] = useState(!ro && !!autoOpenInvite);
  const [reviewing, setReviewing] = useState<PendingRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<InvitationRow | null>(null);

  const [copied, setCopied] = useState<string | null>(null);

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      alert('Davet kodu: ' + token);
    }
  }

  function closeInvite() {
    setInviteOpen(false);
    if (autoOpenInvite) router.replace('/approvals');
  }

  return (
    <div className="space-y-4">
      <Card
        title={`Onay Bekleyen Başvurular (${pending.length})`}
        action={!ro ? (
          <button onClick={() => setInviteOpen(true)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700">
            + Yeni Davet
          </button>
        ) : undefined}
      >
        {pending.length === 0 ? (
          <EmptyState>Bekleyen başvuru yok 🎉</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pending.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setReviewing(r)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 py-3 text-left transition first:pt-0 last:pb-0 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{r.full_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {unitText(r.block, r.apartment_number)}
                      {' · '}{ROLE_LABEL[r.role ?? ''] ?? r.role ?? 'Sakin'}
                      {' · '}{date(r.created_at)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-blue-600">{ro ? 'Detay' : 'İncele'} →</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`Davetler (${invitations.length})`}>
        <p className="mb-3 text-xs text-slate-400">T.C. ile önceden tanımlanan kişi, uygulamaya kayıt olduğunda onay beklemeden otomatik aktifleşir.</p>
        {invitations.length === 0 ? (
          <EmptyState>Henüz davet oluşturulmadı.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Ad Soyad</Th><Th>Daire</Th><Th>Rol</Th><Th>Durum</Th><Th>Tarih</Th><Th className="text-right">İşlem</Th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-800">{inv.full_name ?? '—'}<div className="text-xs font-normal text-slate-400">TC: {inv.tc_kimlik ?? '—'}</div></Td>
                  <Td>{[inv.block, inv.apartment_number].filter(Boolean).join(' / ') || '—'}</Td>
                  <Td>{ROLE_LABEL[inv.role] ?? inv.role}</Td>
                  <Td><Badge tone={STATUS_TONE[inv.status] ?? 'slate'}>{STATUS_LABEL[inv.status] ?? inv.status}</Badge></Td>
                  <Td className="text-slate-500">{date(inv.created_at)}</Td>
                  <Td className="text-right">
                    {inv.status === 'pending' ? (
                      <div className="flex justify-end gap-3">
                        {inv.token && (
                          <button onClick={() => copyToken(inv.token!)} className="text-xs font-semibold text-blue-600 hover:underline">
                            {copied === inv.token ? 'Kopyalandı ✓' : 'Kodu Kopyala'}
                          </button>
                        )}
                        {!ro && <button onClick={() => setCancelTarget(inv)} className="text-xs font-semibold text-red-600 hover:underline">İptal</button>}
                      </div>
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {inviteOpen && <NewInvitationModal siteId={siteId} managerId={managerId} onClose={closeInvite} />}
      {reviewing && <ApplicationReviewModal row={reviewing} readOnly={ro} onClose={() => setReviewing(null)} />}
      {cancelTarget && <CancelInvitationModal invitation={cancelTarget} onClose={() => setCancelTarget(null)} />}
    </div>
  );
}

/* ── Yeni Davet popup'ı — başarıda davet kodunu gösterir ─────────────────── */
function NewInvitationModal({ siteId, managerId, onClose }: { siteId: string; managerId: string; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.tc_kimlik.trim() || !form.full_name.trim() || !form.apartment_number.trim()) {
      setError('T.C. Kimlik, ad soyad ve daire no zorunludur.');
      return;
    }
    setSaving(true);
    const { data, error } = await supabaseBrowser().from('site_invitations').insert({
      site_id: siteId,
      tc_kimlik: form.tc_kimlik.trim(),
      full_name: form.full_name.trim(),
      block: form.block.trim() || null,
      apartment_number: form.apartment_number.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      role: form.role,
      created_by: managerId,
    }).select('token').single();
    setSaving(false);
    if (error) { setError(error.message); return; }
    setCreatedToken(data?.token ?? null);
    router.refresh();
  }

  async function copy() {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* alan zaten görünür, elle kopyalanabilir */ }
  }

  if (createdToken !== null) {
    return (
      <Modal title="Davet Oluşturuldu ✓" onClose={onClose}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {form.full_name} için davet hazır. Kişi uygulamaya kayıt olurken bu kodu girerse onay beklemeden aktifleşir.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <code className="min-w-0 flex-1 break-all text-sm font-semibold text-slate-800">{createdToken || '—'}</code>
            <button onClick={copy} className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700">
              {copied ? 'Kopyalandı ✓' : 'Kopyala'}
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setForm({ ...emptyForm }); setCreatedToken(null); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
              Yeni Davet
            </button>
            <button onClick={onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
              Kapat
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Yeni Davet" onClose={onClose}>
      <form onSubmit={create} className="space-y-3">
        <Field label="T.C. Kimlik No *"><input value={form.tc_kimlik} onChange={(e) => set('tc_kimlik', e.target.value)} inputMode="numeric" maxLength={11} autoFocus className={inputCls} /></Field>
        <Field label="Ad Soyad *"><input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Blok"><input value={form.block} onChange={(e) => set('block', e.target.value)} className={inputCls} /></Field>
          <Field label="Daire No *"><input value={form.apartment_number} onChange={(e) => set('apartment_number', e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Telefon"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" className={inputCls} /></Field>
        <Field label="E-posta"><input value={form.email} onChange={(e) => set('email', e.target.value)} type="email" className={inputCls} /></Field>
        <Field label="Rol">
          <select value={form.role} onChange={(e) => set('role', e.target.value)} className={inputCls}>
            <option value="resident">Sakin</option>
            <option value="manager">Yönetici</option>
            <option value="accountant">Muhasebeci</option>
            <option value="auditor">Denetçi (salt görünüm)</option>
          </select>
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Vazgeç</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Oluşturuluyor…' : 'Davet Oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Başvuru inceleme popup'ı — onay/red tek pencerede ───────────────────── */
function ApplicationReviewModal({ row, readOnly, onClose }: { row: PendingRow; readOnly: boolean; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function decide(action: 'approve' | 'reject') {
    if (action === 'reject' && !reason.trim()) { setError('Lütfen bir red gerekçesi yazın.'); return; }
    setError(null);
    setBusy(true);
    const { error } = await supabaseBrowser().functions.invoke('approve-resident', {
      body: action === 'approve'
        ? { resident_id: row.id, action: 'approve' }
        : { resident_id: row.id, action: 'reject', rejection_reason: reason.trim() },
    });
    setBusy(false);
    if (error) { setError((action === 'approve' ? 'Onaylanamadı: ' : 'Reddedilemedi: ') + error.message); return; }
    onClose();
    router.refresh();
  }

  return (
    <Modal title="Başvuru İnceleme" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-base font-bold text-slate-900">{row.full_name}</p>
          <p className="text-xs text-slate-500">{date(row.created_at)} tarihinde başvurdu</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <InfoItem label="Daire" value={unitText(row.block, row.apartment_number)} />
          <InfoItem label="Rol" value={ROLE_LABEL[row.role ?? ''] ?? row.role ?? 'Sakin'} />
          <InfoItem label="T.C. Kimlik" value={row.tc_kimlik ?? '—'} />
          <InfoItem label="Telefon" value={row.phone ?? '—'} />
          <div className="col-span-2"><InfoItem label="E-posta" value={row.email} /></div>
        </dl>

        {!readOnly && rejecting && (
          <Field label="Red gerekçesi * (başvurana iletilir)">
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="örn. Dairede kayıtlı sakin değil" autoFocus className={inputCls} />
          </Field>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {readOnly ? (
          <p className="text-xs text-slate-400">Denetçi modunda başvuru sonuçlandırılamaz.</p>
        ) : rejecting ? (
          <div className="flex justify-end gap-2">
            <button onClick={() => { setRejecting(false); setReason(''); setError(null); }} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Geri</button>
            <button onClick={() => decide('reject')} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
              {busy ? '…' : 'Reddi Onayla'}
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <button onClick={() => setRejecting(true)} disabled={busy} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60">Reddet</button>
            <button onClick={() => decide('approve')} disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
              {busy ? '…' : 'Onayla'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ── Davet iptali onay popup'ı ────────────────────────────────────────────── */
function CancelInvitationModal({ invitation, onClose }: { invitation: InvitationRow; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    const { error } = await supabaseBrowser().from('site_invitations').update({ status: 'cancelled' }).eq('id', invitation.id);
    setBusy(false);
    if (error) { setError('İptal edilemedi: ' + error.message); return; }
    onClose();
    router.refresh();
  }

  return (
    <Modal title="Davet İptali" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{invitation.full_name ?? 'Bu kişi'}</span>
          {' '}({[invitation.block, invitation.apartment_number].filter(Boolean).join(' / ') || 'daire belirtilmemiş'}) için oluşturulan davet iptal edilsin mi?
          Davet kodu artık kullanılamaz.
        </p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Vazgeç</button>
          <button onClick={cancel} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
            {busy ? '…' : 'Daveti İptal Et'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}
