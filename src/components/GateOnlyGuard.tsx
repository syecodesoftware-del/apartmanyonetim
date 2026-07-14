'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** Kapı görevlisi hesabı yalnız /gate ekranını kullanır — başka rotaya girerse geri yönlendirilir.
 *  Veri güvenliği UI'a bırakılmaz: diğer modüllerin RPC'leri görevliyi DB seviyesinde zaten reddeder. */
export function GateOnlyGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== '/gate') router.replace('/gate');
  }, [pathname, router]);

  return null;
}
