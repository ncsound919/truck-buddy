import { PageTitle, SectionCard } from '@/components/portal/primitives';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { ShieldIcon } from '@/components/icons';
import { portalApi } from '@/lib/mock-api';
import { runsOwnAuthority } from '@/lib/perspective';
import type {
  ComplianceCategory,
  ComplianceItem,
  ComplianceStatus,
  DossierVerdict,
} from '@/lib/domain';
import { cn } from '@/lib/cn';

export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<ComplianceCategory, string> = {
  credential: 'Credentials',
  filing: 'Filings',
  program: 'Programs',
};

const STATUS_TONE: Record<ComplianceStatus, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  due_soon: 'warning',
  overdue: 'danger',
  info_needed: 'warning',
};

const STATUS_LABEL: Record<ComplianceStatus, string> = {
  active: 'Active',
  due_soon: 'Due soon',
  overdue: 'Overdue',
  info_needed: 'Needs proof',
};

const VERDICT_BANNER: Record<
  DossierVerdict,
  { tone: 'success' | 'warning' | 'danger'; label: string; body: string }
> = {
  legal: {
    tone: 'success',
    label: 'You’re in good standing',
    body: 'Nothing is due in the next 30 days and your required documents are on file.',
  },
  attention: {
    tone: 'warning',
    label: 'Action needed soon',
    body: 'Something is due in the next 30 days or is missing from your file. Fix it before it bites.',
  },
  at_risk: {
    tone: 'danger',
    label: 'At risk — not legal to run',
    body: 'An item is overdue or your file is missing proof you must carry. Do not dispatch until this is cleared.',
  },
};

export default async function CompliancePage() {
  const [dossier, profile] = await Promise.all([
    portalApi.getCompliance(),
    portalApi.getOperatingProfile(),
  ]);

  if (!runsOwnAuthority(profile)) {
    return (
      <div>
        <PageTitle
          title="Compliance"
          subtitle="What you must keep current to run legal."
        />
        <EmptyState
          icon={<ShieldIcon width={22} height={22} />}
          title="Your employer or carrier holds the compliance file"
          body="As a leased or company driver, the operating authority, filings, and insurance certificates belong to the carrier you run under. Truck Buddy only tracks compliance for independents with their own authority."
        />
      </div>
    );
  }

  const banner = VERDICT_BANNER[dossier.verdict];
  const categories: ComplianceCategory[] = ['credential', 'filing', 'program'];

  return (
    <div>
      <PageTitle
        title="Compliance"
        subtitle="What you must keep current to run legal — reminders only, Truck Buddy never files or pays."
      />

      <div
        className={cn(
          'mb-6 flex items-start gap-3 rounded-2xl border px-5 py-4',
          banner.tone === 'success' && 'border-success-soft bg-success-soft/40',
          banner.tone === 'warning' && 'border-warning-soft bg-warning-soft/50',
          banner.tone === 'danger' && 'border-danger-soft bg-danger-soft/40',
        )}
      >
        <ShieldIcon
          width={22}
          height={22}
          className={
            banner.tone === 'success'
              ? 'text-success'
              : banner.tone === 'warning'
                ? 'text-warning'
                : 'text-danger'
          }
        />
        <div>
          <div
            className={cn(
              'text-[15px] font-extrabold',
              banner.tone === 'success'
                ? 'text-success'
                : banner.tone === 'warning'
                  ? 'text-warning'
                  : 'text-danger',
            )}
          >
            {banner.label}
          </div>
          <p className="mt-0.5 text-sm text-muted">{banner.body}</p>
        </div>
      </div>

      <div className="space-y-6">
        {categories.map((cat) => {
          const items = dossier.items.filter((i) => i.category === cat);
          if (items.length === 0) return null;
          return (
            <SectionCard
              key={cat}
              title={CATEGORY_LABEL[cat]}
              action={
                <Badge tone="neutral">
                  {items.filter((i) => i.status === 'active').length}/{items.length} good
                </Badge>
              }
            >
              <ul className="divide-y divide-line">
                {items.map((item) => (
                  <ComplianceRow key={item.id} item={item} />
                ))}
              </ul>
            </SectionCard>
          );
        })}

        <SectionCard title="Docs on file" action={<Badge tone="success">{dossier.docsOnFile.length} stored</Badge>}>
          <p className="mb-3 text-sm text-muted">
            These are the stored files your carrier packet draws from when you formalize a new client.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {dossier.docsOnFile.map((doc) => (
              <li key={doc.key} className="rounded-xl border border-line bg-bg-alt/40 px-3.5 py-2.5">
                <div className="text-sm font-bold text-ink">{doc.label}</div>
                <div className="text-xs text-faint">{doc.issuer}</div>
                {doc.expires ? (
                  <div className="mt-1 text-xs font-semibold text-warning">
                    Expires {new Date(doc.expires).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionCard>

        <p className="text-xs text-faint">
          Reminders only — Truck Buddy does not file, renew, or pay anything. Renewal dates are
          estimates for this demo and are not sourced from FMCSA, the IRS, or your insurer.
        </p>
      </div>
    </div>
  );
}

function ComplianceRow({ item }: { item: ComplianceItem }) {
  const tone = STATUS_TONE[item.status];
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold text-ink">{item.title}</span>
          <Badge tone={tone} dot>
            {STATUS_LABEL[item.status]}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-faint">
          {item.issuer} · {item.frequency}
          {item.daysUntilDue !== undefined
            ? ` · ${item.daysUntilDue <= 0 ? 'due now' : `due in ${item.daysUntilDue} day${item.daysUntilDue === 1 ? '' : 's'}`}`
            : ''}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'hidden rounded-full px-2.5 py-1 text-xs font-bold sm:inline',
            item.docOnFile ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning',
          )}
        >
          {item.docOnFile ? 'On file' : 'Missing proof'}
        </span>
        <span className="max-w-[220px] text-right text-xs text-muted">{item.nextAction}</span>
      </div>
    </li>
  );
}
