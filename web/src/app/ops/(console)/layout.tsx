import { redirect } from 'next/navigation';

import { getOpsUser } from '@/lib/ops/ops-auth';
import { OpsNav } from '../ops-nav';

/**
 * Layout for the authenticated Ops console (route group (console)). Gates every
 * page on an authenticated, allowlisted admin. The sign-in page lives outside
 * this group so it stays reachable pre-auth.
 */
export const dynamic = 'force-dynamic';

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await getOpsUser();
  if (!user || !user.admin) redirect('/ops/sign-in');

  return (
    <div className="min-h-screen bg-bg-alt">
      <OpsNav email={user.email ?? ''} />
      <main className="mx-auto max-w-[1100px] px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
