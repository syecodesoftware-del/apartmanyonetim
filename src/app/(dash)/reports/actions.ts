'use server';

import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { buildReportSheets, type ReportKey } from '@/lib/reports-data';
import { parseRange } from '@/lib/reports';
import type { ExportSheet } from '@/components/ReportControls';

/** Rapor Merkezi popup önizlemesi için: seçilen raporun sheet'lerini üretir (RLS'e tabi). */
export async function fetchReportSheets(key: ReportKey, from: string, to: string): Promise<ExportSheet[]> {
  const manager = await requireManager();
  const sb = await supabaseServer();
  const range = parseRange({ from, to });
  return buildReportSheets(sb, manager.siteId, key, range);
}
