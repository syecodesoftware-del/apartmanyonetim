'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { buildExportBlob, downloadBlob } from '@/lib/excel';
import { fetchReportSheets } from '@/app/(dash)/reports/actions';
import type { ReportKey } from '@/lib/reports-data';
import type { ExportSheet } from '@/components/ReportControls';

type ReportMeta = {
  key: ReportKey;
  href: string;
  icon: string;
  title: string;
  desc: string;
  hasRange: boolean;
  file: (from: string, to: string) => string;
};

const REPORTS: ReportMeta[] = [
  { key: 'income-expense', href: '/reports/income-expense', icon: '⚖️', title: 'Gelir–Gider', desc: 'Dönemsel tahsilat ve giderler, kategori kırılımı, net durum.', hasRange: true, file: (f, t) => `gelir-gider-${f}_${t}.xlsx` },
  { key: 'collections', href: '/reports/collections', icon: '💵', title: 'Tahsilat Raporu', desc: 'Dönemdeki tüm tahsilatlar — daire, yöntem ve tarih bazlı döküm.', hasRange: true, file: (f, t) => `tahsilat-${f}_${t}.xlsx` },
  { key: 'aging', href: '/reports/aging', icon: '📅', title: 'Borç Yaşlandırma', desc: 'Güncel borçlar: anapara/gecikme kırılımı, borçlu daireler.', hasRange: false, file: () => 'borc-yaslandirma.xlsx' },
  { key: 'cash', href: '/reports/cash', icon: '🏦', title: 'Kasa & Banka Durumu', desc: 'Hesap bazında güncel bakiye ve dönem hareket özeti.', hasRange: true, file: (f, t) => `kasa-banka-${f}_${t}.xlsx` },
  { key: 'collection-rate', href: '/reports/collection-rate', icon: '🎯', title: 'Tahsilat Oranı', desc: 'Dönem bazında tahakkuk vs tahsil yüzdesi.', hasRange: false, file: () => 'tahsilat-orani.xlsx' },
  { key: 'dues-grid', href: '/reports', icon: '📋', title: 'Aidat Çizelgesi (Yıllık)', desc: 'Daire × 12 ay matrisi: kim hangi ayı ödedi — panoya asılan klasik çizelge. Yıl, başlangıç tarihinden alınır.', hasRange: true, file: (f) => `aidat-cizelgesi-${f.slice(0, 4)}.xlsx` },
];

const PREVIEW_LIMIT = 50;

function cell(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString('tr-TR');
  return String(v);
}

export function ReportsHub({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const [active, setActive] = useState<ReportMeta | null>(null);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [sheets, setSheets] = useState<ExportSheet[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (report: ReportMeta, f: string, t: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReportSheets(report.key, f, t);
      setSheets(data);
    } catch {
      setError('Rapor yüklenemedi. Lütfen tekrar deneyin.');
      setSheets(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) load(active, from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function openReport(report: ReportMeta) {
    setFrom(defaultFrom);
    setTo(defaultTo);
    setSheets(null);
    setActive(report);
  }

  function close() {
    setActive(null);
    setSheets(null);
    setError(null);
  }

  function exportXlsx() {
    if (!active || !sheets) return;
    const nonEmpty = sheets.filter((s) => s.rows.length > 0);
    if (nonEmpty.length === 0) {
      window.alert('Dışa aktarılacak veri yok.');
      return;
    }
    downloadBlob(buildExportBlob(nonEmpty), active.file(from, to));
  }

  const hasData = !!sheets && sheets.some((s) => s.rows.length > 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <button key={r.key} onClick={() => openReport(r)} className="block w-full text-left">
            <Card>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{r.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{r.desc}</p>
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4" onClick={close}>
          <div
            className="my-6 w-full max-w-4xl rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Başlık */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{active.icon}</span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{active.title}</h2>
                  <p className="text-xs text-slate-500">Önizleme — Excel’e aktarabilirsiniz</p>
                </div>
              </div>
              <button onClick={close} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">✕</button>
            </div>

            {/* Kontroller */}
            <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-6 py-3">
              {active.hasRange && (
                <>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                    Başlangıç
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                    Bitiş
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500" />
                  </label>
                  <button onClick={() => active && load(active, from, to)} disabled={loading}
                    className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
                    Uygula
                  </button>
                </>
              )}
              <div className="ml-auto flex items-center gap-2">
                {active.href !== '/reports' && (
                  <Link href={active.href} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                    Tam sayfada aç
                  </Link>
                )}
                <button onClick={exportXlsx} disabled={!hasData || loading}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50">
                  📊 Excel İndir
                </button>
              </div>
            </div>

            {/* Önizleme */}
            <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
              {loading ? (
                <p className="py-12 text-center text-sm text-slate-400">Yükleniyor…</p>
              ) : error ? (
                <p className="py-12 text-center text-sm text-red-600">{error}</p>
              ) : !hasData ? (
                <p className="py-12 text-center text-sm text-slate-400">Bu seçim için gösterilecek veri yok.</p>
              ) : (
                <div className="space-y-6">
                  {sheets!.filter((s) => s.rows.length > 0).map((sheet) => {
                    const headers = Object.keys(sheet.rows[0]);
                    const shown = sheet.rows.slice(0, PREVIEW_LIMIT);
                    return (
                      <div key={sheet.name}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{sheet.name}</p>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                {headers.map((h) => (
                                  <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-slate-500">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {shown.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                  {headers.map((h) => {
                                    const v = (row as Record<string, unknown>)[h];
                                    const num = typeof v === 'number';
                                    return (
                                      <td key={h} className={`whitespace-nowrap px-3 py-1.5 ${num ? 'text-right tabular-nums text-slate-700' : 'text-slate-600'}`}>
                                        {cell(v)}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {sheet.rows.length > PREVIEW_LIMIT && (
                          <p className="mt-1 text-xs text-slate-400">
                            İlk {PREVIEW_LIMIT} satır gösteriliyor · toplam {sheet.rows.length.toLocaleString('tr-TR')} satır. Tümü Excel’de.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
