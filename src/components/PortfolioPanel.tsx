'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, StatCard, Table, Th, Td } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';
import { money } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';

export type Company = {
  company_id: string;
  name: string;
  vkn: string | null;
  role: string;
  is_active_company: boolean;
  site_count: number;
};

export type PortfolioRow = {
  site_id: string;
  site_name: string;
  accrued_total: number;
  collected_total: number;
  open_debt: number;
  cash_balance: number;
  bank_balance: number;
};

function roleLabel(role: string) {
  switch (role) {
    case 'owner': return 'Sahip';
    case 'manager': return 'Yönetici';
    case 'accountant': return 'Muhasebe';
    default: return 'Görüntüleyici';
  }
}

export function PortfolioPanel({
  companies, rows, activeSiteId, activeSiteName,
}: {
  companies: Company[];
  rows: PortfolioRow[];
  activeSiteId: string;
  activeSiteName: string;
}) {
  const router = useRouter();
  const ro = useReadOnly();
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cVkn, setCVkn] = useState('');
  const [cErr, setCErr] = useState('');

  const active = companies.find((c) => c.is_active_company) ?? null;
  const siteInPortfolio = rows.some((r) => r.site_id === activeSiteId);

  const totals = rows.reduce(
    (a, r) => ({
      accrued: a.accrued + Number(r.accrued_total),
      collected: a.collected + Number(r.collected_total),
      debt: a.debt + Number(r.open_debt),
      cash: a.cash + Number(r.cash_balance),
      bank: a.bank + Number(r.bank_balance),
    }),
    { accrued: 0, collected: 0, debt: 0, cash: 0, bank: 0 },
  );

  async function switchCompany(id: string) {
    if (id === active?.company_id || busy) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('switch_active_company', { p_company_id: id });
    setBusy(false);
    if (error) { alert('Değiştirilemedi: ' + friendlyDbMessage(error.message)); return; }
    router.refresh();
  }

  async function createCompany() {
    if (!cName.trim()) { setCErr('Firma adı zorunludur.'); return; }
    setBusy(true); setCErr('');
    const { error } = await supabaseBrowser().rpc('create_company', {
      p_name: cName.trim(),
      p_vkn: cVkn.trim() || undefined,
    });
    setBusy(false);
    if (error) { setCErr(friendlyDbMessage(error.message)); return; }
    setCreateOpen(false); setCName(''); setCVkn('');
    router.refresh();
  }

  async function linkActiveSite() {
    if (!active || busy) return;
    if (!confirm(`“${activeSiteName}” sitesi “${active.name}” firmasına bağlansın mı?`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('link_site_to_company', {
      p_site_id: activeSiteId,
      p_company_id: active.company_id,
    });
    setBusy(false);
    if (error) { alert('Bağlanamadı: ' + friendlyDbMessage(error.message)); return; }
    router.refresh();
  }

  async function unlinkSite(siteId: string, siteName: string) {
    if (busy) return;
    if (!confirm(`“${siteName}” sitesinin firma bağı çözülsün mü?`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('unlink_site_from_company', { p_site_id: siteId });
    setBusy(false);
    if (error) { alert('Çözülemedi: ' + friendlyDbMessage(error.message)); return; }
    router.refresh();
  }

  if (companies.length === 0) {
    return (
      <Card>
        <EmptyState>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-4xl">🏢</span>
            <p className="text-base font-semibold text-slate-700">Henüz firma yok</p>
            <p className="max-w-md text-sm text-slate-500">
              Birden fazla siteyi tek çatı altında yönetmek için bir yönetim firması oluşturun.
              Yönetici olduğunuz siteleri firmaya bağlayarak tüm portföyün mali özetini tek ekranda görün.
            </p>
            {!ro && (
              <button
                onClick={() => setCreateOpen(true)}
                className="mt-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Firma Oluştur
              </button>
            )}
          </div>
        </EmptyState>
        {createOpen && (
          <CreateModal
            cName={cName} cVkn={cVkn} cErr={cErr} busy={busy}
            setCName={setCName} setCVkn={setCVkn}
            onClose={() => setCreateOpen(false)} onSave={createCompany}
          />
        )}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Firma seçici */}
      <div className="flex flex-wrap items-center gap-2">
        {companies.map((c) => (
          <button
            key={c.company_id}
            onClick={() => switchCompany(c.company_id)}
            disabled={busy}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
              c.is_active_company
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400'
            }`}
          >
            🏢 {c.name}
            <span className={`rounded-full px-1.5 text-xs ${c.is_active_company ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>
              {c.site_count}
            </span>
          </button>
        ))}
        {!ro && (
          <button
            onClick={() => setCreateOpen(true)}
            disabled={busy}
            className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-blue-600 hover:border-blue-400"
          >
            + Yeni
          </button>
        )}
      </div>

      {active && (
        <p className="-mt-1 text-xs text-slate-500">
          {active.name} · rolünüz: {roleLabel(active.role)}
          {active.vkn ? ` · VKN ${active.vkn}` : ''}
        </p>
      )}

      {/* Toplam özet */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Toplam Tahakkuk" value={money(totals.accrued, true)} />
        <StatCard label="Toplam Tahsilat" value={money(totals.collected, true)} tone="success" />
        <StatCard label="Açık Borç" value={money(totals.debt, true)} tone={totals.debt > 0 ? 'danger' : 'default'} />
        <StatCard label="Kasa" value={money(totals.cash, true)} />
        <StatCard label="Banka" value={money(totals.bank, true)} />
      </div>

      {/* Aktif site bağlama önerisi */}
      {!siteInPortfolio && !ro && active && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-800">
            Aktif siteniz <b>{activeSiteName}</b> bu firmaya bağlı değil.
          </p>
          <button
            onClick={linkActiveSite}
            disabled={busy}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            🔗 Firmaya Bağla
          </button>
        </div>
      )}

      {/* Site başına tablo */}
      <Card title={`Portföy Detayı (${rows.length} site)`}>
        {rows.length === 0 ? (
          <EmptyState>Bu firmaya bağlı site yok. Yönetici olduğunuz bir siteyi yukarıdan bağlayabilirsiniz.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Site</Th>
                  <Th className="text-right">Tahakkuk</Th>
                  <Th className="text-right">Tahsilat</Th>
                  <Th className="text-right">Açık Borç</Th>
                  <Th className="text-right">Kasa</Th>
                  <Th className="text-right">Banka</Th>
                  {!ro && <Th className="text-right">İşlem</Th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.site_id}>
                    <Td>{r.site_name}</Td>
                    <Td className="text-right tabular-nums">{money(Number(r.accrued_total), true)}</Td>
                    <Td className="text-right tabular-nums text-emerald-600">{money(Number(r.collected_total), true)}</Td>
                    <Td className={`text-right tabular-nums ${Number(r.open_debt) > 0 ? 'text-red-600' : ''}`}>{money(Number(r.open_debt), true)}</Td>
                    <Td className="text-right tabular-nums">{money(Number(r.cash_balance), true)}</Td>
                    <Td className="text-right tabular-nums">{money(Number(r.bank_balance), true)}</Td>
                    {!ro && (
                      <Td className="text-right">
                        <button
                          onClick={() => unlinkSite(r.site_id, r.site_name)}
                          disabled={busy}
                          className="text-xs text-slate-400 hover:text-red-600"
                          title="Firma bağını çöz"
                        >
                          Bağı çöz
                        </button>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {createOpen && (
        <CreateModal
          cName={cName} cVkn={cVkn} cErr={cErr} busy={busy}
          setCName={setCName} setCVkn={setCVkn}
          onClose={() => setCreateOpen(false)} onSave={createCompany}
        />
      )}
    </div>
  );
}

function CreateModal({
  cName, cVkn, cErr, busy, setCName, setCVkn, onClose, onSave,
}: {
  cName: string; cVkn: string; cErr: string; busy: boolean;
  setCName: (v: string) => void; setCVkn: (v: string) => void;
  onClose: () => void; onSave: () => void;
}) {
  return (
    <Modal title="Firma Oluştur" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label="Firma Adı *">
          <input value={cName} onChange={(e) => setCName(e.target.value)} autoFocus className={inputCls} placeholder="Örn. Öz Yönetim A.Ş." />
        </Field>
        <Field label="VKN / TCKN (opsiyonel)">
          <input
            value={cVkn}
            onChange={(e) => setCVkn(e.target.value.replace(/\D/g, '').slice(0, 11))}
            inputMode="numeric"
            className={inputCls}
            placeholder="10 haneli VKN veya 11 haneli TCKN"
          />
        </Field>
        {cErr && <p className="text-sm text-red-600">{cErr}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            İptal
          </button>
          <button onClick={onSave} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? 'Kaydediliyor…' : 'Oluştur'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
