import { requireManager } from '@/lib/session';
import { supabaseServer } from '@/lib/supabaseServer';
import { PageHeader } from '@/components/ui';
import { CommunityPanel, type CommunityPost, type Campaign } from '@/components/CommunityPanel';

export const dynamic = 'force-dynamic';

export default async function CommunityPage() {
  const manager = await requireManager();
  const sb = await supabaseServer();

  const [{ data: posts }, { data: campaigns }] = await Promise.all([
    sb.rpc('get_community_posts', { p_kind: undefined }),
    sb.rpc('get_campaigns'),
  ]);

  return (
    <>
      <PageHeader
        title="Topluluk & Kampanya"
        subtitle="Sakinlerin ilan panosunu modere edin, anlaşmalı işletme kampanyalarını yönetin"
      />
      <CommunityPanel
        canModerate={manager.role === 'manager' || manager.role === 'admin'}
        posts={(posts ?? []) as unknown as CommunityPost[]}
        campaigns={(campaigns ?? []) as unknown as Campaign[]}
      />
    </>
  );
}
