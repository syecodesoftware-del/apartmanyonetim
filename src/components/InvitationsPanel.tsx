'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Table, Th, Td, EmptyState, Badge } from '@/components/ui';
import { useReadOnly } from '@/components/ReadOnly';
import { ROLE_LABEL, date } from '@/lib/format';

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

const empty = { tc_kimlik: '', full_name: '', block: '', apartment_number: '', phone: '', email: '', role: 'resident' };

export function InvitationsPanel({ invitations, siteId, managerId }: { invitations: InvitationRow[]; siteId: string; managerId: string }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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
    const { error } = await supabaseBrowser().from('site_invitations').insert({
      site_id: siteId,
      tc_kimlik: form.tc_kimlik.trim(),
      full_name: form.full_name.trim(),
      block: form.block.trim() || null,
      apartment_number: form.apartment_number.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      role: form.role,
      created_by: managerId,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setForm({ ...empty });
    router.refresh();
  }

  async function cancel(id: string) {
    if (!confirm('Bu davet iptal edilsin mi?')) return;
    const { error } = await supabaseBrowser().from('site_invitations').update({ status: 'cancelled' }).eq('id', id);
    if (error) { alert('İptal edilemedi: ' + error.message); return; }
    router.refresh();
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      alert('Davet kodu: ' + token);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {ro ? (
        <Card title="Davet Oluştur" className="lg:col-span-1">
          <p className="text-sm text-slate-500">Denetçi modunda davet oluşturulamaz. Mevcut davetleri yanda görüntüleyebilirsiniz.</p>
        </Card>
      ) : (
      <Card title="Yeni Davet" className="lg:col-span-1">
        <form onSubmit={create} className="space-y-3">
          <Field label="T.C. Kimlik No *"><input value={form.tc_kimlik} onChange={(e) => set('tc_kimlik', e.target.value)} inputMode="numeric" maxLength={11} className={inputCls} /></Field>
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
          <button type="submit" disabled={saving} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Oluşturuluyor…' : 'Davet Oluştur'}
          </button>
        </form>
      </Card>
      )}

      <Card title="Davetler" className="lg:col-span-2">
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
                        {!ro && <button onClick={() => cancel(inv.id)} className="text-xs font-semibold text-red-600 hover:underline">İptal</button>}
                      </div>
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
