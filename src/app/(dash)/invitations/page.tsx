import { redirect } from 'next/navigation';

// Davetler ekranı Başvurular & Davetler altında birleştirildi (2026-07-09).
export default function InvitationsPage() {
  redirect('/approvals');
}
