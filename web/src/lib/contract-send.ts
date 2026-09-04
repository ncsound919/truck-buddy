import type { ContractReceipt, PacketDraft } from '@/lib/domain';

/**
 * Packet delivery transport. Offline by default — real email needs the Supabase
 * Edge Function (dispatch-send) + Resend, exactly like the cab app's email path.
 */
export interface ContractSendSeam {
  send(draft: PacketDraft): Promise<ContractReceipt>;
}

export const MOCK_TRANSPORT_LABEL =
  'Mock transport — nothing was emailed. Real packet delivery needs the Supabase Edge Function (dispatch-send) + Resend; see AGENTS.md.';

export class OfflineContractSendSeam implements ContractSendSeam {
  async send(draft: PacketDraft): Promise<ContractReceipt> {
    await new Promise((r) => setTimeout(r, 350));
    return {
      leadId: draft.leadId,
      deliveredTo: 'Demo outbox (not emailed)',
      sourceLabel: MOCK_TRANSPORT_LABEL,
      at: new Date().toISOString(),
    };
  }
}

export const contractSendSeam: ContractSendSeam = new OfflineContractSendSeam();
