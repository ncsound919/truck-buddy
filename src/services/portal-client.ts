/**
 * Truck Buddy Portal Sync client (mobile -> shared portal store).
 *
 * The website now persists loads/documents/messages in a single server store
 * exposed over REST (GET/POST /api/portal/*). This client lets the mobile app
 * read and mutate that same store, so the two surfaces share one source of
 * truth *when they point at the same host*.
 *
 * Activation: real cross-device sync needs a reachable host + a real database
 * behind it (the backend decision is still open). For local/web development set
 * EXPO_PUBLIC_API_URL (defaults to the local Next dev server) and
 * EXPO_PUBLIC_PORTAL_SYNC=1. When unset, the app keeps using its offline
 * MockTruckBuddyApi and this client is a no-op — nothing in the demo changes.
 *
 * Kept intentionally self-contained: DTOs below mirror the REST JSON only, so
 * this never couples to the app's own domain types.
 */

export interface SyncLoad {
  id: string;
  ref: string;
  origin: string;
  destination: string;
  distanceMi: number;
  payout: number;
  status: string;
  source: string;
  acceptedAt?: string;
}

export interface SyncDoc {
  id: string;
  kind: string;
  loadRef: string;
  bolNumber: string;
  status: string;
  createdAt: string;
}

export interface SyncMessage {
  id: string;
  from: string;
  text: string;
  at: string;
  sender: string;
}

export interface PortalSync {
  enabled: boolean;
  baseUrl: string;
  listLoads(): Promise<SyncLoad[]>;
  listOpen(): Promise<SyncLoad[]>;
  acceptLoad(id: string): Promise<SyncLoad>;
  listDocuments(): Promise<SyncDoc[]>;
  addDocument(kind: string, loadRef: string): Promise<SyncDoc>;
  listMessages(): Promise<SyncMessage[]>;
  sendMessage(text: string): Promise<SyncMessage>;
}

function getBase(): string {
  return (
    process.env.EXPO_PUBLIC_API_URL ??
    // Web target shares the origin; native dev points here via env.
    'http://localhost:3000'
  );
}

function isEnabled(): boolean {
  return process.env.EXPO_PUBLIC_PORTAL_SYNC === '1';
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`portal_sync_${res.status}`);
  return (await res.json()) as T;
}

export const portalSync: PortalSync = {
  get enabled() {
    return isEnabled();
  },
  get baseUrl() {
    return getBase();
  },

  async listLoads() {
    const { loads } = await req<{ loads: SyncLoad[] }>(`${getBase()}/api/portal/loads`);
    return loads;
  },
  async listOpen() {
    const { open } = await req<{ open: SyncLoad[] }>(`${getBase()}/api/portal/loads`);
    return open;
  },
  async acceptLoad(id) {
    const { load } = await req<{ load: SyncLoad }>(`${getBase()}/api/portal/loads`, {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
    return load;
  },
  async listDocuments() {
    const { documents } = await req<{ documents: SyncDoc[] }>(
      `${getBase()}/api/portal/documents`,
    );
    return documents;
  },
  async addDocument(kind, loadRef) {
    const { document } = await req<{ document: SyncDoc }>(
      `${getBase()}/api/portal/documents`,
      { method: 'POST', body: JSON.stringify({ kind, loadRef }) },
    );
    return document;
  },
  async listMessages() {
    const { messages } = await req<{ messages: SyncMessage[] }>(
      `${getBase()}/api/portal/messages`,
    );
    return messages;
  },
  async sendMessage(text) {
    const { message } = await req<{ message: SyncMessage }>(
      `${getBase()}/api/portal/messages`,
      { method: 'POST', body: JSON.stringify({ text }) },
    );
    return message;
  },
};
