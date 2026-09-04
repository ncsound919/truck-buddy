import Link from 'next/link';

import { LoadCard, PageTitle } from '@/components/portal/primitives';
import { ExternalBoards } from '@/components/portal/external-boards';
import { EmptyState } from '@/components/ui/feedback';
import { ChatIcon, TruckIcon } from '@/components/icons';
import { portalApi } from '@/lib/mock-api';
import { compatibleEquipments, EQUIPMENT_LABEL, huntsOwnWork } from '@/lib/perspective';
import { LoadBoard } from './load-board';

export const dynamic = 'force-dynamic';

export default async function LoadsPage() {
  const profile = await portalApi.getOperatingProfile();
  const hunts = huntsOwnWork(profile);
  const [loads, open, sources] = await Promise.all([
    portalApi.getLoads(),
    portalApi.getOpenLoads(),
    portalApi.getBoardSources(),
  ]);
  const sourceNames = sources.map((s) => s.name);
  const mine = loads.filter((l) => l.status !== 'open');

  // Independents see a board matched to their equipment (fall back to all if none).
  let board = open;
  if (hunts) {
    const allowed = compatibleEquipments(profile.equipment);
    const matched = open.filter((l) => allowed.includes(l.equipmentType ?? 'dry_van'));
    if (matched.length > 0) board = matched;
  } else {
    board = [];
  }

  return (
    <div>
      <PageTitle
        title="Loads"
        subtitle={
          hunts
            ? `Your loads and the freight board — matched to ${EQUIPMENT_LABEL[profile.equipment].toLowerCase()}.`
            : 'Your dispatcher assigns your loads here.'
        }
      />

      {!hunts ? (
        <div className="space-y-6">
          {mine.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink-2">Assigned loads</h2>
              <div className="space-y-4">
                {mine.map((l) => (
                  <LoadCard key={l.id} load={l} />
                ))}
              </div>
            </section>
          ) : null}
          <EmptyState
            icon={<ChatIcon width={22} height={22} />}
            title="Waiting on dispatch"
            body="As a company driver your loads come from your dispatcher, not the open board."
            action={
              <Link
                href="/portal/dispatch"
                className="mt-1 inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent-600"
              >
                Open dispatch
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <ExternalBoards />

          {mine.length > 0 ? (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink-2">Your loads</h2>
              <div className="space-y-4">
                {mine.map((l) => (
                  <LoadCard key={l.id} load={l} />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink-2">
                <TruckIcon width={16} height={16} />
                Load board · matched to {EQUIPMENT_LABEL[profile.equipment].toLowerCase()}
              </h2>
            </div>
            <LoadBoard open={board} sources={sourceNames} />
          </section>
        </>
      )}
    </div>
  );
}
