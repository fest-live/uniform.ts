/**
 * Unified protocol envelope for transport/invocation/messaging.
 * Keeps a single canonical payload while remaining backward compatible
 * with the legacy UnifiedMessage shape used by app code.
 */

export type UniformPurpose = "invoke" | "mail" | "attach" | "deliver" | "defer";
export type UniformEnvelopeType = "request" | "response" | "invoke" | "ack" | "act" | "ask";
export type UniformDeferMode = "none" | "cache" | "idb" | "storage" | "promise" | "allowed";

export type UniformProtocolName =
    | "worker"
    | "chrome"
    | "socket"
    | "service"
    | "broadcast"
    | "window"
    | "pwa"
    | "crx"
    | "sw"
    | "unknown"
    | (string & {});

export type UniformOperation =
    | "get"
    | "set"
    | "apply"
    | "deleteProperty"
    | "import"
    | "attach"
    | "write"
    | "render"
    | "deliver"
    | "mail"
    | "invoke"
    | (string & {});

export interface LegacyUnifiedMessage<T = unknown> {
    id?: string;
    type?: string;
    source?: string;
    destination?: string;
    contentType?: string;
    data?: T;
    metadata?: Record<string, unknown>;
}

export interface UniformProtocolEnvelope<T = unknown> {
    purpose: UniformPurpose[];
    protocol: UniformProtocolName;
    redirect: boolean;
    flags: Record<string, unknown>;
    type: UniformEnvelopeType;
    path?: string[];
    result?: unknown;
    args?: unknown[];
    op?: UniformOperation;
    error?: string;
    timestamp: number;
    where?: string;
    uuid: string;
    bridges: string[];
    payload?: T;
    transfer?: unknown[];
    extension?: unknown;
    defer?: UniformDeferMode;
    srcChannel: string;
    dstChannel?: string | string[];
    // Legacy aliases for consumer compatibility.
    id: string;
    source: string;
    destination?: string;
    data: T;
    contentType?: string;
    metadata: Record<string, unknown>;
}

export interface CreateEnvelopeInput<T = unknown> extends LegacyUnifiedMessage<T> {
    purpose?: UniformPurpose | UniformPurpose[];
    protocol?: UniformProtocolName;
    redirect?: boolean;
    flags?: Record<string, unknown>;
    path?: string | string[];
    result?: unknown;
    args?: unknown | unknown[];
    op?: UniformOperation;
    error?: string;
    timestamp?: number;
    where?: string;
    uuid?: string;
    bridges?: string[];
    payload?: T;
    transfer?: unknown | unknown[];
    extension?: unknown;
    defer?: UniformDeferMode;
    srcChannel?: string;
    dstChannel?: string | string[];
}

const PURPOSES = new Set<UniformPurpose>(["invoke", "mail", "attach", "deliver", "defer"]);
const TYPES = new Set<UniformEnvelopeType>(["request", "response", "invoke", "ack", "act", "ask"]);
const DEFAULT_PURPOSE: UniformPurpose = "mail";

const asString = (value: unknown): string => String(value ?? "").trim();

const normalizePath = (path?: string | string[]): string[] | undefined => {
    if (!path) return undefined;
    const parts = Array.isArray(path) ? path : [path];
    const normalized = parts.map(asString).filter(Boolean);
    return normalized.length > 0 ? normalized : undefined;
};

const normalizeArgs = (args?: unknown | unknown[]): unknown[] | undefined => {
    if (args == null) return undefined;
    return Array.isArray(args) ? args : [args];
};

const normalizeTransfer = (transfer?: unknown | unknown[]): unknown[] | undefined => {
    if (transfer == null) return undefined;
    return Array.isArray(transfer) ? transfer : [transfer];
};

const normalizePurpose = (purpose?: UniformPurpose | UniformPurpose[]): UniformPurpose[] => {
    const input = Array.isArray(purpose) ? purpose : purpose ? [purpose] : [DEFAULT_PURPOSE];
    const deduped: UniformPurpose[] = [];
    for (const entry of input) {
        if (PURPOSES.has(entry) && !deduped.includes(entry)) deduped.push(entry);
    }
    return deduped.length > 0 ? deduped : [DEFAULT_PURPOSE];
};

const inferType = (input: CreateEnvelopeInput): UniformEnvelopeType => {
    const explicit = asString(input.type);
    if (TYPES.has(explicit as UniformEnvelopeType)) return explicit as UniformEnvelopeType;
    const op = asString(input.op);
    if (op === "get" || op === "set" || op === "apply" || op === "import") return "invoke";
    if (input.error) return "response";
    return "request";
};

const inferOperation = (input: CreateEnvelopeInput, resolvedType: UniformEnvelopeType): UniformOperation | undefined => {
    if (input.op) return input.op;
    if (resolvedType === "invoke") return "invoke";
    if (resolvedType === "act") return "deliver";
    return "mail";
};

const inferProtocol = (protocol?: UniformProtocolName): UniformProtocolName => {
    const value = asString(protocol).toLowerCase();
    if (!value) return "unknown";
    return value as UniformProtocolName;
};

const randomId = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `uniform_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const createProtocolEnvelope = <T = unknown>(input: CreateEnvelopeInput<T>): UniformProtocolEnvelope<T> => {
    const timestamp = Number.isFinite(input.timestamp) ? Number(input.timestamp) : Date.now();
    const source = asString(input.srcChannel ?? input.source) || "uniform";
    const destination = asString(input.destination);
    const dstChannel = input.dstChannel ?? (destination ? destination : undefined);
    const uuid = asString(input.uuid ?? input.id) || randomId();
    const type = inferType(input);
    const payload = (input.payload ?? input.data) as T;
    const metadata = { ...(input.metadata ?? {}) };

    return {
        purpose: normalizePurpose(input.purpose),
        protocol: inferProtocol(input.protocol),
        redirect: Boolean(input.redirect),
        flags: { ...(input.flags ?? {}) },
        type,
        path: normalizePath(input.path),
        result: input.result,
        args: normalizeArgs(input.args),
        op: inferOperation(input, type),
        error: input.error ? String(input.error) : undefined,
        timestamp,
        where: asString(input.where) || undefined,
        uuid,
        bridges: Array.isArray(input.bridges) ? input.bridges.map(asString).filter(Boolean) : [],
        payload,
        transfer: normalizeTransfer(input.transfer),
        extension: input.extension,
        defer: input.defer,
        srcChannel: source,
        dstChannel,
        id: uuid,
        source,
        destination: destination || undefined,
        data: payload,
        contentType: asString(input.contentType) || undefined,
        metadata
    };
};

export const isProtocolEnvelope = (value: unknown): value is UniformProtocolEnvelope => {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.uuid === "string" &&
        typeof candidate.srcChannel === "string" &&
        Array.isArray(candidate.purpose) &&
        typeof candidate.type === "string";
};

export const normalizeProtocolEnvelope = <T = unknown>(value: CreateEnvelopeInput<T> | UniformProtocolEnvelope<T>): UniformProtocolEnvelope<T> =>
    isProtocolEnvelope(value) ? createProtocolEnvelope(value) : createProtocolEnvelope(value);

export class ProtocolReplayGuard {
    private readonly seen = new Map<string, number>();
    private readonly windowMs: number;

    constructor(windowMs = 300) {
        this.windowMs = Math.max(10, windowMs);
    }

    accept(envelope: UniformProtocolEnvelope): boolean {
        const now = Date.now();
        const key = envelope.uuid;
        const previous = this.seen.get(key);
        this.prune(now);
        if (previous && (now - previous) <= this.windowMs) {
            return false;
        }
        this.seen.set(key, now);
        return true;
    }

    private prune(now: number): void {
        for (const [id, ts] of this.seen.entries()) {
            if ((now - ts) > this.windowMs) this.seen.delete(id);
        }
    }
}
