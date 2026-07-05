/** Yasal metinler (gizlilik / KVKK) — login GEREKTİRMEZ.
 *  Mağaza başvurularındaki "privacy policy hosting URL" gereksinimi bu sayfalarla karşılanır. */
export default function LegalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <article className="space-y-4 text-sm leading-relaxed text-slate-700 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </article>
      <footer className="mt-12 border-t border-slate-200 pt-4 text-xs text-slate-400">
        Komşu Asistanı · Oblivetech Development Lab
      </footer>
    </div>
  );
}
