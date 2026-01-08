/**
 * Example: Chrome Extension Integration with Fest/Uniform
 *
 * This example shows how to use fest/uniform in Chrome extensions
 * with automatic extension URL resolution and context detection.
 */

/// <reference lib="chrome-types" />

import {
    detectExecutionContext,
    createChromeExtensionChannel,
    createQueuedWorkerChannel
} from 'fest/uniform';

// Detect chrome extension context
const isChromeExtension = detectExecutionContext() === 'chrome-extension';

// Chrome extension worker API
const extensionAPI = {
    async processTabContent(tabId: number, action: string) {
        // Use chrome extension APIs
        try {
            const tab = await chrome.tabs.get(tabId);
            const result = await chrome.scripting.executeScript({
                target: { tabId },
                func: (action) => {
                    // Content script logic
                    if (action === 'extract-text') {
                        return document.body.innerText;
                    }
                    return { error: 'Unknown action' };
                },
                args: [action]
            });

            return result[0].result;
        } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
        }
    },

    async storageOperation(key: string, value?: any) {
        if (value !== undefined) {
            // Set storage
            await chrome.storage.local.set({ [key]: value });
            return { stored: true, key };
        } else {
            // Get storage
            const result = await chrome.storage.local.get(key);
            return result[key];
        }
    },

    async createNotification(title: string, message: string) {
        const notificationId = `uniform-${Date.now()}`;

        chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon128.png'),
            title,
            message
        });

        return { notificationId, created: true };
    }
};

// Background script setup
if (isChromeExtension) {
    console.log('[Extension] Fest/Uniform chrome extension integration ready');

    // Create extension worker channel
    createChromeExtensionChannel({
        name: 'extension-processor',
        script: 'workers/processor.js' // Will be resolved with chrome.runtime.getURL()
    }).then(channel => {
        console.log('[Extension] Processor channel ready');

        // Example: Process current tab content
        chrome.action.onClicked.addListener(async (tab) => {
            if (tab.id) {
                const result = await channel.request('processTabContent', [tab.id, 'extract-text']);
                console.log('Extracted content:', result);
            }
        });

    }).catch(error => {
        console.error('[Extension] Failed to create processor channel:', error);
    });

    // Listen for messages from content scripts or popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'uniform-request') {
            // Handle uniform requests from other extension contexts
            handleExtensionMessage(message, sender, sendResponse);
            return true; // Keep channel open for async response
        }
    });
}

async function handleExtensionMessage(message: any, sender: any, sendResponse: Function) {
    try {
        const { method, args } = message;
        let result;

        if (extensionAPI[method as keyof typeof extensionAPI]) {
            const apiMethod = extensionAPI[method as keyof typeof extensionAPI] as any;
            result = await apiMethod(...args);
        } else {
            result = { error: `Unknown method: ${method}` };
        }

        sendResponse({ success: true, result });
    } catch (error) {
        sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

// Usage from popup or content script:
/*
// In popup.js or content.js
import { createQueuedWorkerChannel } from 'fest/uniform';

// Create queued channel for background script communication
const bgChannel = new QueuedWorkerChannel({
    name: 'extension-bg',
    script: 'background.js',
    context: 'chrome-extension'
}, (channel) => {
    console.log('Background channel ready');
});

// Use extension APIs through uniform channel
const tabContent = await bgChannel.request('processTabContent', [currentTabId, 'extract-text']);
const stored = await bgChannel.request('storageOperation', ['user-preference', 'dark-mode']);
await bgChannel.request('createNotification', ['Process Complete', 'Your content has been processed']);
*/

export { extensionAPI };