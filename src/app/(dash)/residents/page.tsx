import { redirect } from 'next/navigation';

/** Daire 360 birleşimi: Sakinler artık Daireler & Sakinler ekranında. Eski linkler kırılmasın diye yönlendirilir. */
export default function ResidentsPage() {
  redirect('/units');
}
