import type { Metadata, Viewport } from 'next';
import { requireResident } from '@/lib/session';
import { LogoutButton } from '@/components/LogoutButton';
import { PortalNav } from '@/components/PortalNav';
import { PwaRegister } from '@/components/PwaRegister';

export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Komşu Portal', statusBarStyle: 'default' },
};

export const viewport: Viewport = { themeColor: '#2563eb' };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const resident = await requireResident();
  const unitLabel = `${resident.block ? resident.block + ' ' : ''}${resident.apartmentNumber ?? ''}`.trim();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{resident.siteName}</p>
            <p className="truncate text-xs text-slate-400">
              {resident.fullName ?? resident.email}{unitLabel ? ` · ${unitLabel}` : ''}
            </p>
          </div>
          <LogoutButton />
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-3">
          <PortalNav />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
      <PwaRegister />
    </div>
  );
}
