import { redirect } from 'next/navigation';

/** Daire 360 birleşimi: Ödemeyenler = Daireler ekranındaki "Borçlu" filtresi. */
export default function UnpaidPage() {
  redirect('/units?f=borclu');
}
