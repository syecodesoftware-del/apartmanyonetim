'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Badge } from '@/components/ui';
import { Field, inputCls } from '@/components/UnitsPanel';
import { Toggle } from '@/components/controls';
import { useReadOnly } from '@/components/ReadOnly';
import { money } from '@/lib/format';

export type DuesPlanRow = {
  id: string;
  name: string;
  amount: number;
  due_day: number | null;
  description: string | null;
  is_active: boolean | null;
};

export function DuesPlansPanel({ plans, siteId, managerId }: { plans: DuesPlanRow[]; siteId: string; managerId: string }) {
  const router = useRouter();
  const ro = useReadOnly();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Plan adı zorunludur.'); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Geçerli bir tutar giriniz.'); return; }
    const day = Number(dueDay);
    setSaving(true);
    const { error } = await supabaseBrowser().from('dues_plans').insert({
      site_id: siteId, name: name.trim(), amount: amt,
      due_day: day >= 1 && day <= 28 ? day : 1,
      description: description.trim() || null, created_by: managerId,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setName(''); setAmount(''); setDueDay('1'); setDescription('');
    router.refresh();
  }

  async function toggle(p: DuesPlanRow) {
    const { error } = await supabaseBrowser().from('dues_plans').update({ is_active: !p.is_active }).eq('id', p.id);
    if (error) { alert('Güncellenemedi: ' + error.message); return; }
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {ro ? (
        <Card title="Aidat Planları" className="lg:col-span-1">
          <p className="text-sm text-slate-500">Denetçi modunda yeni plan oluşturulamaz. Mevcut planları yanda görüntüleyebilirsiniz.</p>
        </Card>
      ) : (
      <Card title="Yeni Plan" className="lg:col-span-1">
        <form onSubmit={create} className="space-y-3">
          <Field label="Plan Adı *"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aylık Aidat 2026" className={inputCls} /></Field>
          <Field label="Tutar (₺) *"><input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" className={inputCls} /></Field>
          <Field label="Son Ödeme Günü (1-28)"><input value={dueDay} onChange={(e) => setDueDay(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={2} className={inputCls} /></Field>
          <Field label="Açıklama"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} /></Field>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{saving ? 'Kaydediliyor…' : 'Planı Kaydet'}</button>
        </form>
      </Card>
      )}

      <div className="lg:col-span-2">
        {plans.length === 0 ? (
          <Card><EmptyState>Henüz aidat planı yok.</EmptyState></Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {plans.map((p) => (
              <div key={p.id} className={`rounded-xl border bg-white p-4 ${p.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{p.name}</p>
                    {p.description && <p className="text-xs text-slate-500">{p.description}</p>}
                  </div>
                  <Badge tone={p.is_active ? 'green' : 'slate'}>{p.is_active ? 'Aktif' : 'Pasif'}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <span className="text-lg font-bold text-blue-600">{money(p.amount)}</span>
                  {p.due_day && <span className="text-xs text-slate-400">Her ayın {p.due_day}. günü</span>}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-xs text-slate-500">Durum</span>
                  {ro
                    ? <span className={`text-xs font-semibold ${p.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>{p.is_active ? 'Aktif' : 'Pasif'}</span>
                    : <Toggle checked={!!p.is_active} onChange={() => toggle(p)} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
