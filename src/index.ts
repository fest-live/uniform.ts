import { createOrUseExistingChannel } from "./next/Channels";

//
export const sync = async (channel: string, options: any = {}) => {
    const remote = createOrUseExistingChannel(channel, options);
    await remote?.sync?.();
};

//
export const importModuleInChannel = async (channel: string, url: string, options: any = {}) => {
    const remote = await createOrUseExistingChannel(channel, options?.channelOptions);
    const module = await remote?.doImportModule?.(url, options?.importOptions);
    return module;
};

// Export types
export * from "./types";

// Export app-specific adapter
export * from "./app-adapter";

// Export optimized protocol
export * from "./optimized-protocol";
