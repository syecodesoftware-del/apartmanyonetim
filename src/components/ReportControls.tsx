'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { buildExportBlob, downloadBlob } from '@/lib/excel';

export type ExportSheet = { name: string; rows: Record<string, unknown>[] };

/** Rapor başlığı altında: tarih aralığı filtresi + Excel indir. */
export function ReportControls({
  from,
  to,
  sheets,
  fileName,
  showRange = true,
}: {
  from: string;
  to: string;
  sheets: ExportSheet[];
  fileName: string;
  showRange?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  function apply() {
    const q = new URLSearchParams(params.toString());
    q.set('from', f);
    q.set('to', t);
    router.push(`${pathname}?${q.toString()}`);
  }

  function exportXlsx() {
    const nonEmpty = sheets.filter((s) => s.rows.length > 0);
    if (nonEmpty.length === 0) {
      window.alert('Dışa aktarılacak veri yok.');
      return;
    }
    downloadBlob(buildExportBlob(nonEmpty), fileName);
  }

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      {showRange && (
        <>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Başlangıç
            <input
              type="date"
              value={f}
              onChange={(e) => setF(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Bitiş
            <input
              type="date"
              value={t}
              onChange={(e) => setT(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
            />
          </label>
          <button
            onClick={apply}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Uygula
          </button>
        </>
      )}
      <div className="ml-auto">
        <button
          onClick={exportXlsx}
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          📊 Excel İndir
        </button>
      </div>
    </div>
  );
}
