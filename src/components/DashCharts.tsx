'use client';

import { useMemo, useRef, useState } from 'react';
import { Card, EmptyState } from '@/components/ui';
import { money } from '@/lib/format';

/** Özet Ekranı grafikleri — veriler sunucudan gelir (force-dynamic), her sayfa
 *  açılışında/refresh'te DB'den yeniden hesaplanır; ekstra senkron gerekmez.
 *  Renkler dataviz doğrulayıcısından geçti (beyaz kart yüzeyi, CVD-ayrımlı):
 *  durum: mavi #2a78d6 / kehribar #c98500 / kırmızı #d03b3b · yaşlandırma: tek-ton mavi rampa. */

export type DonutSlice = { label: string; value: number; color: string };

/* ── Halka grafik ────────────────────────────────────────────────────────── */

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** Halka dilimi path'i (dıştan içe kapalı yüzük parçası). */
function arcPath(cx: number, cy: number, rOut: number, rIn: number, a0: number, a1: number) {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = polar(cx, cy, rOut, a0);
  const [x1, y1] = polar(cx, cy, rOut, a1);
  const [x2, y2] = polar(cx, cy, rIn, a1);
  const [x3, y3] = polar(cx, cy, rIn, a0);
  return `M ${x0} ${y0} A ${rOut} ${rOut} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${rIn} ${rIn} 0 ${large} 0 ${x3} ${y3} Z`;
}

export function DonutCard({ title, slices, centerLabel, centerValue, emptyText, unit }: {
  title: string;
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
  emptyText: string;
  /** Dilim değeri biçimi — server→client'a fonksiyon geçirilemediği için ayırt edici string */
  unit: 'daire' | 'tl';
}) {
  const valueFmt = (v: number) =>
    unit === 'tl' ? `₺${Math.round(v).toLocaleString('tr-TR')}` : `${v} daire`;
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const visible = slices.filter((s) => s.value > 0);

  if (total <= 0) {
    return <Card title={title}><EmptyState>{emptyText}</EmptyState></Card>;
  }

  // Dilim açıları (tek dilimde tam çember çizilebilsin diye 359.999 sınırı)
  let acc = 0;
  const segs = visible.map((s) => {
    const a0 = (acc / total) * 360;
    acc += s.value;
    const a1 = (acc / total) * 360;
    return { ...s, a0, a1: Math.min(a1, a0 + 359.999) };
  });

  return (
    <Card title={title}>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label={title}>
            {segs.map((s, i) => (
              <path
                key={s.label}
                d={arcPath(75, 75, hover === i ? 70 : 67, 44, s.a0, s.a1)}
                fill={s.color}
                stroke="#ffffff"
                strokeWidth="2"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {hover !== null && segs[hover] ? (
              <>
                <span className="max-w-[80px] truncate text-[11px] text-slate-500">{segs[hover].label}</span>
                <span className="text-sm font-bold text-slate-900">{valueFmt(segs[hover].value)}</span>
                <span className="text-[11px] text-slate-400">%{Math.round((segs[hover].value / total) * 100)}</span>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-slate-900">{centerValue}</span>
                <span className="max-w-[84px] text-center text-[11px] leading-tight text-slate-500">{centerLabel}</span>
              </>
            )}
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5">
          {slices.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="min-w-0 flex-1 truncate text-slate-600">{s.label}</span>
              <span className="font-semibold tabular-nums text-slate-800">{valueFmt(s.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/* ── Çizgi grafik: son N ay, 2 seri ──────────────────────────────────────── */

export type TrendPoint = { label: string; tahakkuk: number; tahsilat: number };

const SERIES = [
  { key: 'tahakkuk' as const, label: 'Tahakkuk', color: '#2a78d6' },
  { key: 'tahsilat' as const, label: 'Tahsilat', color: '#1baf7a' },
];

const compactTl = (v: number) =>
  v >= 1_000_000 ? `₺${(v / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M`
  : v >= 1_000 ? `₺${(v / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}b`
  : `₺${Math.round(v).toLocaleString('tr-TR')}`;

export function TrendCard({ title, points }: { title: string; points: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 560, H = 190;
  const pad = { l: 46, r: 12, t: 12, b: 24 };

  const { max, xs, ys } = useMemo(() => {
    const rawMax = Math.max(1, ...points.flatMap((p) => [p.tahakkuk, p.tahsilat]));
    const max = rawMax * 1.15;
    const xs = points.map((_, i) =>
      points.length === 1 ? (pad.l + W - pad.r) / 2 : pad.l + (i * (W - pad.l - pad.r)) / (points.length - 1));
    const ys = (v: number) => H - pad.b - (v / max) * (H - pad.t - pad.b);
    return { max, xs, ys };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  if (points.every((p) => p.tahakkuk === 0 && p.tahsilat === 0)) {
    return <Card title={title}><EmptyState>Henüz tahakkuk/tahsilat verisi yok.</EmptyState></Card>;
  }

  function onMove(e: React.MouseEvent) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0, bestD = Infinity;
    xs.forEach((px, i) => { const d = Math.abs(px - x); if (d < bestD) { bestD = d; best = i; } });
    setHover(best);
  }

  const gridVals = [0.25, 0.5, 0.75, 1].map((f) => max * f);

  return (
    <Card
      title={title}
      action={
        <div className="flex items-center gap-3">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-0.5 w-4 rounded" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      }
    >
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={title}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* yatay kılavuz çizgileri + y etiketleri */}
          {gridVals.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={ys(v)} y2={ys(v)} stroke="#e2e8f0" strokeWidth="1" />
              <text x={pad.l - 6} y={ys(v) + 3.5} textAnchor="end" fontSize="10" fill="#94a3b8">{compactTl(v)}</text>
            </g>
          ))}
          <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="#cbd5e1" strokeWidth="1" />

          {/* x etiketleri */}
          {points.map((p, i) => (
            <text key={p.label} x={xs[i]} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{p.label}</text>
          ))}

          {/* kılavuz (crosshair) */}
          {hover !== null && (
            <line x1={xs[hover]} x2={xs[hover]} y1={pad.t} y2={H - pad.b} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
          )}

          {/* seriler */}
          {SERIES.map((s) => (
            <g key={s.key}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points.map((p, i) => `${xs[i]},${ys(p[s.key])}`).join(' ')}
              />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={xs[i]}
                  cy={ys(p[s.key])}
                  r={hover === i ? 4.5 : 3}
                  fill={s.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              ))}
            </g>
          ))}
        </svg>

        {hover !== null && points[hover] && (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
            style={{
              left: `${(xs[hover] / W) * 100}%`,
              transform: xs[hover] > W * 0.62 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)',
            }}
          >
            <p className="mb-1 font-semibold text-slate-700">{points[hover].label}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
                {s.label}: <span className="font-semibold tabular-nums text-slate-800">{money(points[hover][s.key], true)}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
