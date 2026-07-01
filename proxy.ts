import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabaseMiddleware";

// Next.js 16: 'middleware' → 'proxy' (runtime: nodejs)
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Statik dosyalar ve görseller hariç tüm yollar
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
