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

/**
 * Base URL for `new URL(workerPath, base)` when spawning workers from a string specifier.
 *
 * Prefer `WorkerGlobalScope` / `window` URLs so this module stays **`import.meta`-free**.
 * Including `import.meta.url` anywhere in the uniform graph trips Rolldown's `EMPTY_IMPORT_META`
 * when the PWA service worker is built as IIFE (`vite-plugin-pwa` injectManifest).
 *
 * Dedicated worker threads expose `globalThis.location` at the worker script URL; MV3 SW exposes the
 */
export function getWorkerResolveBaseUrl(): string {
    try {
        const href = globalThis.location?.href;
        if (typeof href === "string" && href.length > 0) {
            return href;
        }
    } catch {
        /* uncommon: no location */
    }
    try {
        if (typeof document !== "undefined" && typeof document.baseURI === "string" && document.baseURI.length > 0) {
            return document.baseURI;
        }
    } catch {
        /* no document */
    }
    return "";
}

/** Resolved absolute href for `./x`/`/x`/absolute worker specifiers (delegates trailing `/` normalization to callers). */
export function resolveWorkerSpecifierHref(spec: string): string {
    const base = getWorkerResolveBaseUrl();
    if (!base.length) {
        throw new TypeError("[uniform] No base URL for worker resolution (missing location / document.baseURI)");
    }
    const normalized = spec.startsWith("/") ? spec.replace(/^\//, "./") : spec;
    return new URL(normalized, base).href;
}

