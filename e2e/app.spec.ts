import { expect, test, type Page } from '@playwright/test';

/**
 * End-to-end driver flow against the Expo web build (Metro on :8081).
 * On web, camera / on-device OCR / GPS run on their fallback paths, so this
 * validates the workflow state machine, screens, memory, dispatch and summary —
 * the interaction logic that is platform-agnostic.
 */

const PASSES = 5;

async function startShift(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const btn = page.getByRole('button', { name: /Start Shift/i });
  await expect(btn).toBeVisible({ timeout: 25_000 });
  // The tap occasionally doesn't register if it lands during hydration — retry.
  for (let attempt = 0; attempt < 4; attempt++) {
    await btn.click();
    try {
      await expect(page.getByText('Pass', { exact: true })).toBeVisible({ timeout: 5000 });
      return;
    } catch {
      // still idle — click Start Shift again
    }
  }
}

async function passInspection(page: Page) {
  for (let i = 0; i < PASSES; i++) {
    const pass = page.getByText('Pass', { exact: true });
    await expect(pass).toBeVisible({ timeout: 15_000 });
    await pass.click();
    await page.waitForTimeout(120);
  }
}

async function arriveAtStop(page: Page, which: 0 | 1 | 2 = 0) {
  const names = ['ACME', 'Haley', 'Carolina'];
  const sim = page.getByText(`Simulate arrival at ${names[which]}`);
  await expect(sim).toBeVisible({ timeout: 15_000 });
  await sim.click();
  await expect(page.getByText('You Have Arrived')).toBeVisible();
}

test('landing shows vehicle, route and Start Shift', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /Start Shift/i })).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText(/2023 Freightliner Cascadia/)).toBeVisible();
  await expect(page.getByText(/3 stops/)).toBeVisible();
});

test('full workflow: start -> pre-trip -> navigate -> arrive -> demo scan -> verified', async ({ page }) => {
  await startShift(page);
  await expect(page.getByText('PRE-TRIP INSPECTION')).toBeVisible();
  await passInspection(page);

  // now on the navigate screen: live on-duty / fault / break bar
  await expect(page.getByText('ON DUTY')).toBeVisible();
  await expect(page.getByText('FAULT')).toBeVisible();

  await arriveAtStop(page, 0);
  await page.getByText('Scan Paperwork').click();
  await expect(page.getByText('Scan BOL')).toBeVisible();

  await page.getByText('Capture Document', { exact: true }).click();
  await expect(page.getByText('BOL-882114')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Attach & Complete Stop')).toBeVisible();

  // attach completes the stop and advances to stop 2 navigation
  await page.getByText('Attach & Complete Stop').click();
  await expect(page.getByText(/2 of 3/)).toBeVisible();
});

test('driver aids + GPS memory persist across reload', async ({ page }) => {
  await startShift(page);
  await passInspection(page);
  await arriveAtStop(page, 0);

  // Driver Aids sheet: one-tap contact outreach + remember this stop
  await page.getByText('Driver Aids', { exact: true }).click();
  await expect(page.getByText('One-tap reach')).toBeVisible();
  await expect(page.getByText('Dispatch · HQ')).toBeVisible();
  await expect(page.getByText('Call').first()).toBeVisible();
  await expect(page.getByText('Email').first()).toBeVisible();

  await page.getByText(/Remember this stop/).click();
  await expect(page.getByText(/stop\(s\) in memory/)).toBeVisible();
  await page.getByText('Close', { exact: true }).click();

  // memory survives a full reload (AsyncStorage/localStorage)
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /Start Shift/i })).toBeVisible({ timeout: 25_000 });

  await page.getByText(/My tools/).click();
  await expect(page.getByText('ACME Distribution Center')).toBeVisible();
  await expect(page.getByText('Text on arrival')).toBeVisible();
  await expect(page.getByText(/Remembered stops/)).toBeVisible();
});

test('end a full shift: all stops -> post-trip -> summary -> logged', async ({ page }) => {
  await startShift(page);
  await passInspection(page);

  for (let i = 0; i < 3; i++) {
    await arriveAtStop(page, i as 0 | 1 | 2);
    await page.getByText('Complete Stop', { exact: true }).click();
  }

  await expect(page.getByText('POST-TRIP INSPECTION')).toBeVisible({ timeout: 15_000 });
  await passInspection(page);

  await expect(page.getByText(/Great work today/)).toBeVisible();
  await expect(page.getByText('3/3')).toBeVisible();
  await expect(page.getByText('DETENTION')).toBeVisible();
  await page.getByText('End Shift', { exact: true }).click();
  await expect(page.getByText('Shift Logged', { exact: true })).toBeVisible();
});
