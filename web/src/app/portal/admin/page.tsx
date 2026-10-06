import Link from 'next/link';

import { EmptyState } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { UsersIcon } from '@/components/icons';
import { PageTitle, SectionCard } from '@/components/portal/primitives';
import { getPortalApi } from '@/lib/portal-api';
import { KIND_LABEL, ROLE_LABEL, isManager } from '@/lib/rbac';
import { TeamPanel } from './team-panel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const api = await getPortalApi();
  const membership = await api.getMembership();
  const role = membership.member.role;

  if (!isManager(role)) {
    return (
      <div>
        <PageTitle title="Team & roles" subtitle="Owner and admin only." />
        <EmptyState
          icon={<UsersIcon width={22} height={22} />}
          title="You don’t manage this account"
          body={`You’re here as ${ROLE_LABEL[role]}. Ask an owner or admin of ${membership.org.name} to give you access.`}
        />
      </div>
    );
  }

  const members = await api.getOrgMembers(membership.org.id);

  return (
    <div>
      <PageTitle
        title="Team & roles"
        subtitle={`${membership.org.name} · ${KIND_LABEL[membership.org.kind]}`}
        actions={
          <Badge tone={membership.org.tier === 'enterprise' ? 'accent' : 'success'}>
            {membership.org.tier.toUpperCase()} · {members.length}/{membership.org.seatLimit} seats
          </Badge>
        }
      />

      <SectionCard title="Members">
        <TeamPanel meRole={role} initial={members} />
      </SectionCard>
    </div>
  );
}
