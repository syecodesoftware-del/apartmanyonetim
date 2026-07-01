'use client';

import { createContext, useContext } from 'react';

/** Denetçi (auditor) oturumunda true → istemci bileşenleri yazma kontrollerini gizler.
 *  Gerçek güvenlik DB'de RLS ile sağlanır; bu yalnız UX katmanıdır. */
const ReadOnlyContext = createContext(false);

export function ReadOnlyProvider({ value, children }: { value: boolean; children: React.ReactNode }) {
  return <ReadOnlyContext.Provider value={value}>{children}</ReadOnlyContext.Provider>;
}

/** Bileşenlerde: const ro = useReadOnly();  ardından {!ro && <YazmaButonu/>} */
export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext);
}

/** Yazma kontrollerini saran kısayol: denetçide hiç render edilmez. */
export function WriteOnly({ children }: { children: React.ReactNode }) {
  const ro = useReadOnly();
  if (ro) return null;
  return <>{children}</>;
}
