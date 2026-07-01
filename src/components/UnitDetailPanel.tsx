'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, Table, Th, Td, EmptyState, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';
import { money, date } from '@/lib/format';

export type Tenancy = {
  id: string;
  user_id: string | null;
  relationship: string;
  full_name: string;
  phone: string | null;
  tc_kimlik: string | null;
  start_date: string;
  end_date: string | null;
};
export type ResidentOption = { id: string; full_name: string; phone: string | null; tc_kimlik: string | null };

type FormState = { full_name: string; user_id: string; phone: string; tc: string; move_debt: boolean };
const emptyForm: FormState = { full_name: '', user_id: '', phone: '', tc: '', move_debt: false };

export function UnitDetailPanel({
  unitId,
  unitLabel,
  tenancies,
  totalDebt,
  residents,
}: {
  unitId: string;
  unitLabel: string;
  tenancies: Tenancy[];
  totalDebt: number;
  residents: ResidentOption[];
}) {
  const router = useRouter();
  const ro = useReadOnly();
  const [modal, setModal] = useState<null | 'owner' | 'tenant'>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentOwner = tenancies.find((t) => t.relationship === 'malik' && !t.end_date) ?? null;
  const currentTenant = tenancies.find((t) => t.relationship === 'kiraci' && !t.end_date) ?? null;
  const history = tenancies.filter((t) => t.end_date);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function openModal(kind: 'owner' | 'tenant') {
    setForm({ ...emptyForm });
    setError(null);
    setModal(kind);
  }
  function pickResident(id: string) {
    const r = residents.find((x) => x.id === id);
    if (!r) {
      setForm((f) => ({ ...f, user_id: '' }));
      return;
    }
    setForm((f) => ({ ...f, user_id: r.id, full_name: r.full_name, phone: r.phone ?? '', tc: r.tc_kimlik ?? '' }));
  }

  async function saveOccupant(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.full_name.trim()) {
      setError('Ad Soyad zorunludur.');
      return;
    }
    setBusy(true);
    const sb = supabaseBrowser();
    const common = {
      p_unit_id: unitId,
      p_phone: form.phone.trim() || null,
    };
    const { error } =
      modal === 'owner' && currentOwner
        ? await sb.rpc('transfer_unit_ownership', {
            ...common,
            p_new_full_name: form.full_name.trim(),
            p_new_user_id: form.user_id || null,
            p_new_phone: form.phone.trim() || null,
            p_new_tc: form.tc.trim() || null,
            p_move_owner_debt: form.move_debt,
          })
        : await sb.rpc('set_unit_occupant', {
            ...common,
            p_relationship: modal === 'owner' ? 'malik' : 'kiraci',
            p_full_name: form.full_name.trim(),
            p_user_id: form.user_id || null,
            p_tc_kimlik: form.tc.trim() || null,
          });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setModal(null);
    router.refresh();
  }

  async function transferTenantDebt() {
    if (!currentTenant) return;
    if (!window.confirm('Kiracının açık borcu mülk sahibine aktarılacak. Onaylıyor musunuz?')) return;
    setBusy(true);
    const sb = supabaseBrowser();
    const { data, error } = await sb.rpc('transfer_tenant_debt_to_owner', { p_unit_id: unitId });
    setBusy(false);
    if (error) {
      window.alert('Hata: ' + error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    window.alert(`${row?.moved_count ?? 0} kayıt aktarıldı (${money(Number(row?.moved_amount ?? 0), true)}).`);
    router.refresh();
  }

  async function removeOccupant(t: Tenancy) {
    const label = t.relationship === 'malik' ? 'mülk sahibini' : 'kiracıyı';
    if (!window.confirm(`Bu ${label} çıkarmak istediğinize emin misiniz?`)) return;
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.rpc('end_tenancy', { p_tenancy_id: t.id });
    setBusy(false);
    if (error) {
      window.alert(
        error.message.includes('sahipsiz')
          ? 'Daire sahipsiz bırakılamaz: önce yeni mülk sahibi atayın.'
          : 'Hata: ' + error.message,
      );
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* MÜLK SAHİBİ */}
        <Card
          title="Mülk Sahibi"
          action={
            ro ? undefined : (
              <button
                onClick={() => openModal('owner')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                {currentOwner ? 'Değiştir' : 'Ata'}
              </button>
            )
          }
        >
          {currentOwner ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">{currentOwner.full_name}</p>
              <p className="text-xs text-slate-500">{currentOwner.phone ?? 'Telefon yok'}</p>
              <p className="text-xs text-slate-400">Başlangıç: {date(currentOwner.start_date)}</p>
              {currentOwner.user_id && <Badge tone="green">Uygulama kullanıcısı</Badge>}
            </div>
          ) : (
            <p className="text-sm text-red-600">⚠ Mülk sahibi atanmamış — daire sahipsiz olamaz.</p>
          )}
        </Card>

        {/* KİRACI */}
        <Card
          title="Kiracı"
          action={
            ro ? undefined : (
              <button
                onClick={() => openModal('tenant')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                {currentTenant ? 'Değiştir' : 'Ekle'}
              </button>
            )
          }
        >
          {currentTenant ? (
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">{currentTenant.full_name}</p>
                <p className="text-xs text-slate-500">{currentTenant.phone ?? 'Telefon yok'}</p>
                <p className="text-xs text-slate-400">Başlangıç: {date(currentTenant.start_date)}</p>
                {currentTenant.user_id && <Badge tone="green">Uygulama kullanıcısı</Badge>}
              </div>
              {!ro && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {totalDebt > 0.005 && (
                    <button
                      onClick={transferTenantDebt}
                      disabled={busy}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                    >
                      Mülk Sahibine Aktar
                    </button>
                  )}
                  <button
                    onClick={() => removeOccupant(currentTenant)}
                    disabled={busy}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Kiracıyı Çıkar
                  </button>
                </div>
              )}
              {totalDebt > 0.005 && (
                <p className="text-xs text-amber-600">Bu dairenin açık borcu var: {money(totalDebt, true)}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Kiracı yok (daire mülk sahibi tarafından kullanılıyor).</p>
          )}
        </Card>
      </div>

      {/* GEÇMİŞ */}
      <Card title="Geçmiş Sakinler">
        {history.length === 0 ? (
          <EmptyState>Geçmiş kayıt yok.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Ad Soyad</Th>
                <Th>İlişki</Th>
                <Th>Telefon</Th>
                <Th>Başlangıç</Th>
                <Th>Bitiş</Th>
              </tr>
            </thead>
            <tbody>
              {history.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-800">{t.full_name}</Td>
                  <Td>
                    <Badge tone={t.relationship === 'malik' ? 'blue' : 'slate'}>
                      {t.relationship === 'malik' ? 'Mülk Sahibi' : 'Kiracı'}
                    </Badge>
                  </Td>
                  <Td className="text-slate-600">{t.phone ?? '—'}</Td>
                  <Td>{date(t.start_date)}</Td>
                  <Td>{t.end_date ? date(t.end_date) : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {modal && (
        <Modal
          title={
            modal === 'owner'
              ? currentOwner
                ? `Mülk Sahibini Değiştir — ${unitLabel}`
                : `Mülk Sahibi Ata — ${unitLabel}`
              : `Kiracı ${currentTenant ? 'Değiştir' : 'Ekle'} — ${unitLabel}`
          }
          onClose={() => setModal(null)}
        >
          <form onSubmit={saveOccupant} className="space-y-3">
            {residents.length > 0 && (
              <Field label="Mevcut sakinden seç (opsiyonel)">
                <select value={form.user_id} onChange={(e) => pickResident(e.target.value)} className={inputCls}>
                  <option value="">Manuel gir</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Ad Soyad *">
              <input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Telefon">
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" className={inputCls} />
              </Field>
              <Field label="TC Kimlik">
                <input value={form.tc} onChange={(e) => set('tc', e.target.value)} inputMode="numeric" maxLength={11} className={inputCls} />
              </Field>
            </div>
            {modal === 'owner' && currentOwner && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.move_debt} onChange={(e) => set('move_debt', e.target.checked)} />
                Eski mülk sahibinin açık borçlarını yeni sahibe aktar
              </label>
            )}
            {modal === 'owner' && currentOwner && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Mevcut mülk sahibi ({currentOwner.full_name}) geçmişe taşınır, yeni sahip güncel olur. Daire bir an bile sahipsiz kalmaz.
              </p>
            )}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
