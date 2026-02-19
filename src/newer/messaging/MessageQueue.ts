/**
 * Generic Message Queue Utility
 * Provides persistent queuing for cross-context communications using IndexedDB
 * Part of fest/uniform - no app-specific dependencies
 */

// ============================================================================
// TYPES
// ============================================================================

export interface QueuedMessage<T = unknown> {
    id: string;
    type: string;
    data: T;
    timestamp: number;
    priority: MessagePriority;
    retryCount: number;
    maxRetries: number;
    expiresAt?: number;
    destination?: string;
    metadata?: Record<string, unknown>;
}

export type MessagePriority = 'low' | 'normal' | 'high';

export interface MessageQueueOptions {
    dbName?: string;
    storeName?: string;
    maxRetries?: number;
    defaultExpirationMs?: number;
    fallbackStorageKey?: string;
}

export interface QueueMessageOptions {
    priority?: MessagePriority;
    maxRetries?: number;
    expiresAt?: number;
    destination?: string;
    metadata?: Record<string, unknown>;
}

// ============================================================================
// MESSAGE QUEUE CLASS
// ============================================================================

export class MessageQueue {
    private db: IDBDatabase | null = null;
    private dbPromise: Promise<IDBDatabase> | null = null;
    private options: Required<MessageQueueOptions>;

    constructor(options: MessageQueueOptions = {}) {
        this.options = {
            dbName: options.dbName ?? 'UniformMessageQueue',
            storeName: options.storeName ?? 'messages',
            maxRetries: options.maxRetries ?? 3,
            defaultExpirationMs: options.defaultExpirationMs ?? 24 * 60 * 60 * 1000, // 24 hours
            fallbackStorageKey: options.fallbackStorageKey ?? 'uniform_message_queue'
        };
    }

    // ========================================================================
    // DATABASE INITIALIZATION
    // ========================================================================

    /**
     * Initialize IndexedDB database
     */
    private async initDB(): Promise<IDBDatabase | null> {
        if (this.db) return this.db;
        if (this.dbPromise) return this.dbPromise;

        // Check if IndexedDB is available
        if (!MessageQueue.isIndexedDBAvailable()) {
            console.warn('[MessageQueue] IndexedDB not available, using sessionStorage fallback');
            return null;
        }

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.options.dbName, 1);

            request.onerror = () => {
                console.warn('[MessageQueue] IndexedDB open failed, falling back to sessionStorage');
                reject(new Error('IndexedDB not available'));
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.options.storeName)) {
                    const store = db.createObjectStore(this.options.storeName, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('priority', 'priority', { unique: false });
                    store.createIndex('destination', 'destination', { unique: false });
                }
            };
        });

        try {
            this.db = await this.dbPromise;
            return this.db;
        } catch {
            // Fallback to sessionStorage if IndexedDB fails
            return null;
        }
    }

    // ========================================================================
    // QUEUE OPERATIONS
    // ========================================================================

    /**
     * Generate unique message ID
     */
    private generateId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * Queue a message for later processing
     */
    async queueMessage<T>(
        type: string,
        data: T,
        options: QueueMessageOptions = {}
    ): Promise<string> {
        const message: QueuedMessage<T> = {
            id: this.generateId(),
            type,
            data,
            timestamp: Date.now(),
            priority: options.priority ?? 'normal',
            retryCount: 0,
            maxRetries: options.maxRetries ?? this.options.maxRetries,
            expiresAt: options.expiresAt ?? (Date.now() + this.options.defaultExpirationMs),
            destination: options.destination,
            metadata: options.metadata
        };

        try {
            const db = await this.initDB();
            if (db) {
                await this.addToIndexedDB(db, message);
            } else {
                this.addToSessionStorage(message);
            }

            console.log(`[MessageQueue] Queued message: ${type}`, message.id);
            return message.id;
        } catch (error) {
            console.error('[MessageQueue] Failed to queue message:', error);
            throw error;
        }
    }

    /**
     * Get all queued messages
     */
    async getQueuedMessages<T = unknown>(destination?: string): Promise<QueuedMessage<T>[]> {
        try {
            const db = await this.initDB();
            let messages: QueuedMessage<T>[];
            
            if (db) {
                messages = await this.getAllFromIndexedDB<T>(db);
            } else {
                messages = this.getAllFromSessionStorage<T>();
            }

            // Filter by destination if specified
            if (destination) {
                messages = messages.filter(msg => msg.destination === destination);
            }

            // Filter out expired messages
            const now = Date.now();
            return messages.filter(msg => !msg.expiresAt || msg.expiresAt > now);
        } catch (error) {
            console.error('[MessageQueue] Failed to get queued messages:', error);
            return this.getAllFromSessionStorage<T>();
        }
    }

    /**
     * Remove a message from the queue
     */
    async removeMessage(messageId: string): Promise<void> {
        try {
            const db = await this.initDB();
            if (db) {
                await this.deleteFromIndexedDB(db, messageId);
            } else {
                this.deleteFromSessionStorage(messageId);
            }
        } catch (error) {
            console.error('[MessageQueue] Failed to remove message:', error);
        }
    }

    /**
     * Update message retry count
     */
    async updateMessageRetry(messageId: string, retryCount: number): Promise<void> {
        try {
            const db = await this.initDB();
            if (db) {
                await this.updateInIndexedDB(db, messageId, { retryCount });
            } else {
                this.updateInSessionStorage(messageId, { retryCount });
            }
        } catch (error) {
            console.error('[MessageQueue] Failed to update message retry:', error);
        }
    }

    /**
     * Clear all expired messages
     */
    async clearExpiredMessages(): Promise<number> {
        try {
            const messages = await this.getQueuedMessages();
            const now = Date.now();
            const expiredIds = messages
                .filter(msg => msg.expiresAt && msg.expiresAt <= now)
                .map(msg => msg.id);

            for (const id of expiredIds) {
                await this.removeMessage(id);
            }

            if (expiredIds.length > 0) {
                console.log(`[MessageQueue] Cleared ${expiredIds.length} expired messages`);
            }
            
            return expiredIds.length;
        } catch (error) {
            console.error('[MessageQueue] Failed to clear expired messages:', error);
            return 0;
        }
    }

    /**
     * Clear all messages
     */
    async clearAll(): Promise<void> {
        try {
            const db = await this.initDB();
            if (db) {
                await this.clearIndexedDB(db);
            } else {
                sessionStorage.removeItem(this.options.fallbackStorageKey);
            }
            console.log('[MessageQueue] Cleared all messages');
        } catch (error) {
            console.error('[MessageQueue] Failed to clear all messages:', error);
        }
    }

    /**
     * Get queue statistics
     */
    async getStats(): Promise<{
        total: number;
        byPriority: Record<MessagePriority, number>;
        byDestination: Record<string, number>;
        expired: number;
    }> {
        const messages = await this.getQueuedMessages();
        const now = Date.now();
        
        const byPriority: Record<MessagePriority, number> = { low: 0, normal: 0, high: 0 };
        const byDestination: Record<string, number> = {};
        let expired = 0;

        for (const msg of messages) {
            byPriority[msg.priority]++;
            if (msg.destination) {
                byDestination[msg.destination] = (byDestination[msg.destination] || 0) + 1;
            }
            if (msg.expiresAt && msg.expiresAt <= now) {
                expired++;
            }
        }

        return {
            total: messages.length,
            byPriority,
            byDestination,
            expired
        };
    }

    // ========================================================================
    // INDEXEDDB OPERATIONS
    // ========================================================================

    private async addToIndexedDB<T>(db: IDBDatabase, message: QueuedMessage<T>): Promise<void> {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.options.storeName], 'readwrite');
            const store = transaction.objectStore(this.options.storeName);
            const request = store.add(message);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    private async getAllFromIndexedDB<T>(db: IDBDatabase): Promise<QueuedMessage<T>[]> {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.options.storeName], 'readonly');
            const store = transaction.objectStore(this.options.storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result as QueuedMessage<T>[]);
            request.onerror = () => reject(request.error);
        });
    }

    private async deleteFromIndexedDB(db: IDBDatabase, id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.options.storeName], 'readwrite');
            const store = transaction.objectStore(this.options.storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    private async updateInIndexedDB(
        db: IDBDatabase, 
        id: string, 
        updates: Partial<QueuedMessage>
    ): Promise<void> {
        const transaction = db.transaction([this.options.storeName], 'readwrite');
        const store = transaction.objectStore(this.options.storeName);
        
        const message = await new Promise<QueuedMessage | undefined>((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (message) {
            Object.assign(message, updates);
            await new Promise<void>((resolve, reject) => {
                const request = store.put(message);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    }

    private async clearIndexedDB(db: IDBDatabase): Promise<void> {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.options.storeName], 'readwrite');
            const store = transaction.objectStore(this.options.storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ========================================================================
    // SESSION STORAGE FALLBACK
    // ========================================================================

    private getAllFromSessionStorage<T>(): QueuedMessage<T>[] {
        try {
            const stored = sessionStorage.getItem(this.options.fallbackStorageKey);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    private addToSessionStorage<T>(message: QueuedMessage<T>): void {
        const existing = this.getAllFromSessionStorage();
        existing.push(message);
        sessionStorage.setItem(this.options.fallbackStorageKey, JSON.stringify(existing));
    }

    private deleteFromSessionStorage(id: string): void {
        const existing = this.getAllFromSessionStorage();
        const filtered = existing.filter(msg => msg.id !== id);
        sessionStorage.setItem(this.options.fallbackStorageKey, JSON.stringify(filtered));
    }

    private updateInSessionStorage(id: string, updates: Partial<QueuedMessage>): void {
        const existing = this.getAllFromSessionStorage();
        const message = existing.find(msg => msg.id === id);
        if (message) {
            Object.assign(message, updates);
            sessionStorage.setItem(this.options.fallbackStorageKey, JSON.stringify(existing));
        }
    }

    // ========================================================================
    // STATIC UTILITIES
    // ========================================================================

    /**
     * Check if IndexedDB is available
     */
    static isIndexedDBAvailable(): boolean {
        try {
            return typeof indexedDB !== 'undefined' &&
                   typeof IDBTransaction !== 'undefined' &&
                   typeof IDBKeyRange !== 'undefined';
        } catch {
            return false;
        }
    }
}

// ============================================================================
// SINGLETON FACTORY
// ============================================================================

const instances = new Map<string, MessageQueue>();

/**
 * Get or create a MessageQueue instance
 */
export function getMessageQueue(options?: MessageQueueOptions): MessageQueue {
    const key = options?.dbName ?? 'default';
    if (!instances.has(key)) {
        instances.set(key, new MessageQueue(options));
    }
    return instances.get(key)!;
}

/**
 * Create a new MessageQueue instance (not cached)
 */
export function createMessageQueue(options?: MessageQueueOptions): MessageQueue {
    return new MessageQueue(options);
}
