import { createHostChannel, createOrUseExistingChannel, SELF_CHANNEL } from "./next/Channels";
import { wrapChannel } from "./next/RequestProxy";
import type { WorkerChannel } from "./next/Queued";
import { detectExecutionContext } from "./next/Env";

export * from "./next/Env";
export * from "./next/Interface";
export * from "./next/Queued";
export * from "./next/Utils";
export * from "./next/Wrappers";
export * from "./next/Channels";
export { makeRequestProxy, wrapChannel } from "./next/RequestProxy";

export interface BroadcastLike {
    addEventListener: (type: "message" | "error", listener: (...args: any[]) => any) => void;
    removeEventListener?: (type: "message" | "error", listener: (...args: any[]) => any) => void;
    postMessage: (message: any, transfer?: any) => void;
    close?: () => void;
    start?: () => void;
}

/**
 * Ensure the remote channel is created and ready to accept requests.
 */
export const sync = async (channel: string, options: any = {}, broadcast: BroadcastLike | Worker | BroadcastChannel | MessagePort | null = null) => {
    const remote = await createOrUseExistingChannel(channel, options, (broadcast ?? (typeof self !== "undefined" ? (self as any) : null)) as any);
    return remote;
};

export const importModuleInChannel = async (
    channel: string,
    url: string,
    options: any = {},
    broadcast: BroadcastLike | Worker | BroadcastChannel | MessagePort | null = (typeof self !== "undefined" ? (self as any) : null)
) => {
    const remote = await createOrUseExistingChannel(channel, options?.channelOptions, broadcast as any);
    const module = await remote?.doImportModule?.(url, options?.importOptions);
    return module;
};

/**
 * Connect to a uniform channel and expose it as a proxied module (reflect-based).
 *
 * NOTE: This returns a proxy that dispatches calls over the selected transport.
 */
export const connectToChannelAsModule = async (
    channel: string,
    options: any = {},
    broadcast: BroadcastLike | Worker | BroadcastChannel | MessagePort | null = (typeof self !== "undefined" ? (self as any) : null),
    hostChannel: string | null = "$host$"
) => {
    const host = createHostChannel(hostChannel ?? "$host$");
    await host?.createRemoteChannel(channel, options, broadcast as any);
    return wrapChannel(channel, host ?? SELF_CHANNEL?.instance);
};

/**
 * WorkerChannel adapter using chrome.runtime.sendMessage (CRX messaging).
 *
 * This is a lightweight helper for extension contexts that want a `WorkerChannel`-like API
 * without relying on DedicatedWorkers or BroadcastChannel.
 */
export const createChromeExtensionRuntimeChannel = (channelName: string, options: any = {}): WorkerChannel => {
    const context = detectExecutionContext();
    if (context !== "chrome-extension") {
        return {
            async request(method: string, args: any[] = []) {
                throw new Error(`Chrome extension messaging is not available in this context (${context}): ${method}(${(args ?? []).length})`);
            },
            close() {
                // no-op
            }
        };
    }

    return {
        async request(method: string, args: any[] = []) {
            const message = {
                id: `crx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                type: method,
                source: context,
                target: channelName,
                data: (args ?? []).length === 1 ? (args ?? [])[0] : (args ?? []),
                metadata: { timestamp: Date.now(), ...(options?.metadata ?? {}) }
            };

            return await new Promise((resolve, reject) => {
                try {
                    chrome.runtime.sendMessage(message, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    });
                } catch (error) {
                    reject(error);
                }
            });
        },
        close() {
            // CRX runtime channels don't need explicit close
        }
    };
};
