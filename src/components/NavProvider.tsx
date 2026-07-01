'use client';

import { createContext, useContext, useState } from 'react';

type NavCtx = { open: boolean; setOpen: (v: boolean) => void };
const Ctx = createContext<NavCtx>({ open: false, setOpen: () => {} });

export function useNav() {
  return useContext(Ctx);
}

/** Mobil çekmece (drawer) açık/kapalı durumunu hamburger butonu ile Sidebar arasında paylaşır. */
export function NavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}
