import { redirect } from 'next/navigation';

/** Daire 360 birleşimi: Borç & Tahsilat artık Daireler & Sakinler ekranında (Tahsilat Al satır aksiyonu). */
export default function BalancesPage() {
  redirect('/units?f=borclu');
}
