export type ExecutionContext =
    | "main"
    | "service-worker"
    | "chrome-extension"
    | "unknown";

export const isServiceWorkerContext = (): boolean => {
    try {
        const SWGS = (globalThis as any)?.ServiceWorkerGlobalScope;
        return typeof SWGS !== "undefined" && (globalThis as any) instanceof SWGS;
    } catch {
        return false;
    }
};

export const isChromeExtensionContext = (): boolean => {
    try {
        // eslint-disable-next-line no-undef
        return typeof chrome !== "undefined" && !!chrome?.runtime?.id;
    } catch {
        return false;
    }
};

/**
 * Detect the current runtime context.
 *
 * NOTE: In MV3, the background is a Service Worker but still part of the
 * extension runtime. We treat it as "chrome-extension" for API compatibility.
 */
export const detectExecutionContext = (): ExecutionContext => {
    if (isChromeExtensionContext()) return "chrome-extension";
    if (isServiceWorkerContext()) return "service-worker";

    // best-effort heuristic: if we have DOM, call it "main"
    try {
        if (typeof document !== "undefined") return "main";
    } catch {
        // ignore
    }

    return "unknown";
};

export const supportsDedicatedWorkers = (): boolean => {
    if (isServiceWorkerContext()) return false;
    try {
        return typeof Worker !== "undefined";
    } catch {
        return false;
    }
};

