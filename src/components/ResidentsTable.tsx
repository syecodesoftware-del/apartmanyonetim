'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Table, Th, Td, EmptyState, Badge } from '@/components/ui';
import { money } from '@/lib/format';

export type OccupantRow = {
  tenancy_id: string;
  unit_id: string;
  block: string | null;
  apartment_number: string | null;
  relationship: string; // 'malik' | 'kiraci'
  full_name: string;
  phone: string | null;
  email: string | null;
  account_role: string | null;
  has_account: boolean;
  toplam_borc: number | null;
};

type RelFilter = 'all' | 'malik' | 'kiraci';
type AccFilter = 'all' | 'with' | 'without';

const chip = (active: boolean) =>
  `rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
    active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
  }`;

export function ResidentsTable({ occupants }: { occupants: OccupantRow[] }) {
  const [q, setQ] = useState('');
  const [rel, setRel] = useState<RelFilter>('all');
  const [acc, setAcc] = useState<AccFilter>('all');
  const [debtorOnly, setDebtorOnly] = useState(false);

  const term = q.trim().toLocaleLowerCase('tr');

  const filtered = useMemo(() => {
    return occupants.filter((o) => {
      if (rel !== 'all' && o.relationship !== rel) return false;
      if (acc === 'with' && !o.has_account) return false;
      if (acc === 'without' && o.has_account) return false;
      if (debtorOnly && Number(o.toplam_borc ?? 0) <= 0.005) return false;
      if (term) {
        const hay = [o.full_name, o.apartment_number, o.block, o.phone, o.email]
          .filter(Boolean)
          .some((v) => String(v).toLocaleLowerCase('tr').includes(term));
        if (!hay) return false;
      }
      return true;
    });
  }, [occupants, rel, acc, debtorOnly, term]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="İsim, daire, telefon veya e-posta ara…"
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <button className={chip(rel === 'all')} onClick={() => setRel('all')}>Tümü</button>
          <button className={chip(rel === 'malik')} onClick={() => setRel('malik')}>Malik</button>
          <button className={chip(rel === 'kiraci')} onClick={() => setRel('kiraci')}>Kiracı</button>
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <button className={chip(acc === 'all')} onClick={() => setAcc('all')}>Hepsi</button>
          <button className={chip(acc === 'with')} onClick={() => setAcc('with')}>Uygulamayı Kullanıyor</button>
          <button className={chip(acc === 'without')} onClick={() => setAcc('without')}>Kullanmıyor</button>
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <button className={chip(debtorOnly)} onClick={() => setDebtorOnly((v) => !v)}>Borçlu</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>{occupants.length ? 'Eşleşen sakin yok.' : 'Henüz sakin kaydı yok.'}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Ad Soyad</Th>
              <Th>Daire</Th>
              <Th>İlişki</Th>
              <Th>Mobil Uygulama</Th>
              <Th>Telefon</Th>
              <Th className="text-right">Borç</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const unitLabel = [o.block, o.apartment_number].filter(Boolean).join(' / ') || '—';
              const debt = Number(o.toplam_borc ?? 0);
              return (
                <tr key={o.tenancy_id} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-800">
                    <Link href={`/units/${o.unit_id}`} className="hover:text-blue-600 hover:underline">
                      {o.full_name}
                    </Link>
                  </Td>
                  <Td>
                    <Link href={`/units/${o.unit_id}`} className="text-slate-600 hover:text-blue-600 hover:underline">
                      {unitLabel}
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={o.relationship === 'malik' ? 'blue' : 'slate'}>
                      {o.relationship === 'malik' ? 'Malik' : 'Kiracı'}
                    </Badge>
                  </Td>
                  <Td>
                    {o.has_account ? (
                      <Badge tone="green">Kullanıyor</Badge>
                    ) : (
                      <Badge tone="amber">Kullanmıyor</Badge>
                    )}
                  </Td>
                  <Td className="text-slate-600">{o.phone ?? '—'}</Td>
                  <Td className="text-right">
                    {debt > 0.005 ? (
                      <span className="font-semibold text-red-600">{money(debt, true)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
