/**
 * Lightweight message envelope shape used by worker entrypoints (e.g. OPFS).
 * Kept separate from Queued.ts to avoid pulling channel/storage runtime into workers.
 */
export interface MessageEnvelope {
    id?: string;
    type: string;
    payload: any;
    timestamp?: number;
    replyTo?: string;
}
