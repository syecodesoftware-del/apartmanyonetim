'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Card, EmptyState, Table, Th, Td, Badge } from '@/components/ui';
import { Modal, Field, inputCls } from '@/components/UnitsPanel';
import { useReadOnly } from '@/components/ReadOnly';
import { date, dateTime } from '@/lib/format';
import { friendlyDbMessage } from '@/lib/error';

export type UnitRow = { id: string; block: string | null; apartment_number: string };
export type VisitorPass = {
  id: string; visitor_name: string; plate: string | null; code: string;
  expected_date: string; status: string; arrived_at: string | null;
  unit_label: string; created_by_name: string | null; created_at: string;
};
export type PackageRow = {
  id: string; carrier: string | null; description: string | null; status: string;
  received_at: string; delivered_at: string | null; delivered_note: string | null;
  unit_label: string; received_by_name: string | null;
};
type PlateHit = { plate: string; label: string | null; active: boolean; unit_label: string; occupants: string | null };

const VP_STATUS: Record<string, { label: string; tone: 'amber' | 'green' | 'slate' }> = {
  bekleniyor: { label: 'Bekleniyor', tone: 'amber' },
  geldi: { label: 'Geldi', tone: 'green' },
  iptal: { label: 'İptal', tone: 'slate' },
};
const PKG_STATUS: Record<string, { label: string; tone: 'amber' | 'green' | 'slate' }> = {
  teslim_alindi: { label: 'Yönetimde', tone: 'amber' },
  sakine_verildi: { label: 'Teslim Edildi', tone: 'green' },
  iade: { label: 'İade', tone: 'slate' },
};

export function GatePanel({ visitors: initV, packages: initP, units }: {
  visitors: VisitorPass[]; packages: PackageRow[]; units: UnitRow[];
}) {
  const router = useRouter();
  const ro = useReadOnly();
  const [tab, setTab] = useState<'visitors' | 'plate' | 'packages'>('visitors');
  const [visitors, setVisitors] = useState<VisitorPass[]>(initV);
  const [packages, setPackages] = useState<PackageRow[]>(initP);
  const [busy, setBusy] = useState(false);

  // kod doğrulama
  const [code, setCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<string>('');
  const [verifyErr, setVerifyErr] = useState('');

  // plaka
  const [plateQuery, setPlateQuery] = useState('');
  const [plateHits, setPlateHits] = useState<PlateHit[] | null>(null);

  // kargo modal
  const [pkgOpen, setPkgOpen] = useState(false);
  const [pkgUnit, setPkgUnit] = useState('');
  const [pkgCarrier, setPkgCarrier] = useState('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgErr, setPkgErr] = useState('');

  async function reloadVisitors() {
    const { data } = await supabaseBrowser().rpc('get_visitor_passes', { p_date: undefined, p_status: undefined });
    setVisitors((data ?? []) as unknown as VisitorPass[]);
  }
  async function reloadPackages() {
    const { data } = await supabaseBrowser().rpc('get_packages', { p_status: undefined });
    setPackages((data ?? []) as unknown as PackageRow[]);
  }

  async function verifyCode() {
    if (!code.trim()) return;
    setBusy(true); setVerifyErr(''); setVerifyResult('');
    const { data, error } = await supabaseBrowser().rpc('verify_visitor_code', { p_code: code.trim() });
    setBusy(false);
    if (error) {
      const m = error.message.includes('CODE_NOT_FOUND') ? 'Kod bulunamadı veya daha önce kullanıldı.'
        : error.message.includes('EXPIRED') ? 'Kodun süresi dolmuş (beklenen tarih geçti).'
        : friendlyDbMessage(error.message);
      setVerifyErr(m); return;
    }
    const r = data as { visitor_name?: string; plate?: string; unit_label?: string } | null;
    setVerifyResult(`✅ ${r?.visitor_name} — ${r?.unit_label}${r?.plate ? ` · Plaka: ${r.plate}` : ''} (giriş kaydedildi)`);
    setCode('');
    await reloadVisitors();
    router.refresh();
  }

  async function searchPlate() {
    if (!plateQuery.trim()) return;
    setBusy(true);
    const { data } = await supabaseBrowser().rpc('lookup_plate', { p_plate: plateQuery.trim() });
    setBusy(false);
    setPlateHits((data ?? []) as unknown as PlateHit[]);
  }

  async function submitPackage() {
    if (!pkgUnit) { setPkgErr('Daire seçin.'); return; }
    setBusy(true); setPkgErr('');
    const { error } = await supabaseBrowser().rpc('register_package', {
      p_unit_id: pkgUnit, p_carrier: pkgCarrier.trim() || undefined, p_description: pkgDesc.trim() || undefined,
    });
    setBusy(false);
    if (error) { setPkgErr(friendlyDbMessage(error.message)); return; }
    setPkgOpen(false); setPkgUnit(''); setPkgCarrier(''); setPkgDesc('');
    await reloadPackages();
    router.refresh();
  }

  async function deliverPackage(p: PackageRow) {
    const note = prompt('Teslim notu (kim aldı, opsiyonel):') ?? undefined;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('mark_package_delivered', { p_id: p.id, p_note: note || undefined });
    setBusy(false);
    if (error) { alert('İşlem başarısız: ' + friendlyDbMessage(error.message)); return; }
    await reloadPackages();
    router.refresh();
  }

  const pendingPkg = packages.filter((p) => p.status === 'teslim_alindi');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5">
        <TabBtn active={tab === 'visitors'} onClick={() => setTab('visitors')}>🎫 Ziyaretçiler</TabBtn>
        <TabBtn active={tab === 'plate'} onClick={() => setTab('plate')}>🚗 Plaka Sorgula</TabBtn>
        <TabBtn active={tab === 'packages'} onClick={() => setTab('packages')}>📦 Kargo {pendingPkg.length > 0 ? `(${pendingPkg.length})` : ''}</TabBtn>
      </div>

      {tab === 'visitors' && (
        <>
          {!ro && (
            <Card title="Ziyaretçi Kodu Doğrula">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                  className={`${inputCls} max-w-44 text-center font-mono text-lg tracking-widest`}
                  placeholder="ABC123"
                  maxLength={6}
                />
                <button onClick={verifyCode} disabled={busy || code.trim().length < 6} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  Doğrula & Giriş Ver
                </button>
              </div>
              {verifyResult && <p className="mt-2 text-sm font-medium text-emerald-600">{verifyResult}</p>}
              {verifyErr && <p className="mt-2 text-sm text-red-600">{verifyErr}</p>}
            </Card>
          )}
          <Card title="Ziyaretçi Kayıtları (son 200)">
            {visitors.length === 0 ? (
              <EmptyState>Ziyaretçi kaydı yok. Sakinler uygulamadan ziyaretçi kodu oluşturabilir.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr><Th>Ziyaretçi</Th><Th>Daire</Th><Th>Plaka</Th><Th>Kod</Th><Th>Beklenen</Th><Th>Durum</Th><Th>Giriş</Th></tr>
                  </thead>
                  <tbody>
                    {visitors.map((v) => (
                      <tr key={v.id}>
                        <Td className="font-medium">{v.visitor_name}</Td>
                        <Td>{v.unit_label}</Td>
                        <Td className="text-slate-500">{v.plate ?? '—'}</Td>
                        <Td className="font-mono text-xs text-slate-400">{v.status === 'bekleniyor' ? v.code : '••••••'}</Td>
                        <Td className="text-slate-500">{date(v.expected_date)}</Td>
                        <Td><Badge tone={VP_STATUS[v.status]?.tone ?? 'slate'}>{VP_STATUS[v.status]?.label ?? v.status}</Badge></Td>
                        <Td className="text-slate-400">{v.arrived_at ? dateTime(v.arrived_at) : '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}

      {tab === 'plate' && (
        <Card title="Plaka Sorgula">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={plateQuery}
              onChange={(e) => setPlateQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && searchPlate()}
              className={`${inputCls} max-w-56 font-mono`}
              placeholder="34ABC123 veya kısmı"
            />
            <button onClick={searchPlate} disabled={busy || !plateQuery.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              Ara
            </button>
          </div>
          {plateHits !== null && (
            plateHits.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Kayıtlı eşleşme yok — bu plaka siteye kayıtlı değil.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {plateHits.map((h, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-mono font-bold">{h.plate}</span>
                    <span className="text-slate-600">🏠 {h.unit_label}</span>
                    {h.label && <span className="text-slate-400">{h.label}</span>}
                    {h.occupants && <span className="text-xs text-slate-500">👥 {h.occupants}</span>}
                    {!h.active && <Badge tone="slate">pasif</Badge>}
                  </div>
                ))}
              </div>
            )
          )}
        </Card>
      )}

      {tab === 'packages' && (
        <>
          <div className="flex justify-end">
            {!ro && (
              <button onClick={() => { setPkgErr(''); setPkgOpen(true); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                + Kargo Kaydet
              </button>
            )}
          </div>
          <Card>
            {packages.length === 0 ? (
              <EmptyState>Kargo kaydı yok. Gelen kargoyu kaydedin — sakine anında bildirim gider.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr><Th>Daire</Th><Th>Firma</Th><Th>Açıklama</Th><Th>Geliş</Th><Th>Durum</Th><Th>Teslim</Th>{!ro && <Th></Th>}</tr>
                  </thead>
                  <tbody>
                    {packages.map((p) => (
                      <tr key={p.id}>
                        <Td className="font-medium">{p.unit_label}</Td>
                        <Td className="text-slate-500">{p.carrier ?? '—'}</Td>
                        <Td className="text-slate-500">{p.description ?? '—'}</Td>
                        <Td className="text-slate-400">{dateTime(p.received_at)}</Td>
                        <Td><Badge tone={PKG_STATUS[p.status]?.tone ?? 'slate'}>{PKG_STATUS[p.status]?.label ?? p.status}</Badge></Td>
                        <Td className="text-slate-400">{p.delivered_at ? `${dateTime(p.delivered_at)}${p.delivered_note ? ` · ${p.delivered_note}` : ''}` : '—'}</Td>
                        {!ro && (
                          <Td className="text-right">
                            {p.status === 'teslim_alindi' && (
                              <button onClick={() => deliverPackage(p)} disabled={busy} className="text-xs font-medium text-green-600 hover:underline disabled:opacity-50">
                                Teslim Et
                              </button>
                            )}
                          </Td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}

      {pkgOpen && (
        <Modal title="Kargo Kaydet" onClose={() => setPkgOpen(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Daire *">
              <select value={pkgUnit} onChange={(e) => setPkgUnit(e.target.value)} className={inputCls}>
                <option value="">— seçin —</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.block ? u.block + ' ' : ''}{u.apartment_number}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kargo Firması"><input value={pkgCarrier} onChange={(e) => setPkgCarrier(e.target.value)} className={inputCls} placeholder="Aras, Yurtiçi…" /></Field>
              <Field label="Açıklama"><input value={pkgDesc} onChange={(e) => setPkgDesc(e.target.value)} className={inputCls} placeholder="koli, zarf…" /></Field>
            </div>
            <p className="text-xs text-slate-400">Kaydedince daire sakinlerine anında bildirim gönderilir.</p>
            {pkgErr && <p className="text-sm text-red-600">{pkgErr}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setPkgOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={submitPackage} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Kaydediliyor…' : 'Kaydet & Bildir'}
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
