/**
 * Example: Service Worker Integration with Fest/Uniform
 *
 * This example shows how to integrate fest/uniform channels
 * in a service worker context where dedicated workers aren't available.
 */

/// <reference lib="webworker" />

import {
    detectExecutionContext,
    createServiceWorkerChannel,
    registerWorkerAPI
} from 'fest/uniform';

// Detect if we're in service worker context
const isServiceWorker = detectExecutionContext() === 'service-worker';

// Service Worker API that can be called from main thread
const swAPI = {
    async cacheResource(url: string, data: any) {
        // Service worker specific caching logic
        const cache = await caches.open('uniform-cache-v1');
        const response = new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });
        await cache.put(url, response);
        return { cached: true, url };
    },

    async getCachedResource(url: string) {
        const cache = await caches.open('uniform-cache-v1');
        const response = await cache.match(url);
        if (response) {
            return await response.json();
        }
        return null;
    },

    async broadcastToClients(message: any) {
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage(message);
        });
        return { broadcasted: true, clientCount: clients.length };
    }
};

// Register the API if in service worker context
if (isServiceWorker) {
    registerWorkerAPI(swAPI);

    // Set up BroadcastChannel listener for SW communication
    const swChannel = new BroadcastChannel('sw-uniform-channel');

    swChannel.onmessage = async (event) => {
        const { id, type, method, args } = event.data;

        try {
            let result;
            if (method && swAPI[method as keyof typeof swAPI]) {
                const apiMethod = swAPI[method as keyof typeof swAPI] as any;
                result = await apiMethod(...args);
            } else {
                result = { error: `Unknown method: ${method}` };
            }

            swChannel.postMessage({
                id,
                result,
                type: 'response'
            });
        } catch (error) {
            swChannel.postMessage({
                id,
                error: error instanceof Error ? error.message : String(error),
                type: 'response'
            });
        }
    };

    console.log('[SW] Fest/Uniform service worker integration ready');
}

// Usage from main thread:
/*
// In main thread, create service worker channel
import { createServiceWorkerChannel } from 'fest/uniform';

const swChannel = await createServiceWorkerChannel({
    name: 'sw-cache-worker',
    script: 'sw.js' // Not used in SW context, but required for config
});

// Cache data through service worker
const result = await swChannel.request('cacheResource', ['/api/data', { important: 'data' }]);

// Get cached data
const cached = await swChannel.request('getCachedResource', ['/api/data']);

// Broadcast to all clients
await swChannel.request('broadcastToClients', [{ type: 'update', data: 'new version' }]);
*/

export { swAPI };