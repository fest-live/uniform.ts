/**
 * IndexedDB Integration for Channel System
 *
 * Provides persistent storage capabilities for channel communication:
 * - Defer: Queue messages for later delivery
 * - Pending: Track pending operations
 * - Mailbox/Inbox: Store messages per channel
 * - Transactions: Batch operations with rollback
 * - Exchange: Coordinate data between contexts
 */

import { UUIDv4, Promised } from "fest/core";
import { type ChannelMessage, ChannelSubject, type Subscription } from "../observable/Observable";

// ============================================================================
// TYPES
// ============================================================================

/** Message status in storage */
export type MessageStatus = "pending" | "processing" | "delivered" | "failed" | "expired";

/** Stored message envelope */
export interface StoredMessage<T = any> {
    id: string;
    channel: string;
    sender: string;
    recipient: string;
    type: ChannelMessage["type"];
    payload: T;
    status: MessageStatus;
    priority: number;
    createdAt: number;
    updatedAt: number;
    expiresAt: number | null;
    retryCount: number;
    maxRetries: number;
    metadata?: Record<string, any>;
}

/** Transaction operation */
export interface TransactionOp<T = any> {
    id: string;
    type: "put" | "delete" | "update";
    store: string;
    key?: IDBValidKey;
    value?: T;
    timestamp: number;
}

/** Exchange record */
export interface ExchangeRecord<T = any> {
    id: string;
    key: string;
    value: T;
    owner: string;
    sharedWith: string[];
    version: number;
    createdAt: number;
    updatedAt: number;
    lock?: { holder: string; acquiredAt: number; expiresAt: number };
}

/** Mailbox statistics */
export interface MailboxStats {
    total: number;
    pending: number;
    processing: number;
    delivered: number;
    failed: number;
    expired: number;
}

// ============================================================================
// INDEXED DB MANAGER
// ============================================================================

const DB_NAME = "uniform_channels";
const DB_VERSION = 1;

const STORES = {
    MESSAGES: "messages",
    MAILBOX: "mailbox",
    PENDING: "pending",
    EXCHANGE: "exchange",
    TRANSACTIONS: "transactions"
} as const;

/**
 * IndexedDB manager for channel storage
 */
export class ChannelStorage {
    private _db: IDBDatabase | null = null;
    private _isOpen = false;
    private _openPromise: Promise<IDBDatabase> | null = null;
    private _channelName: string;

    // Observables for real-time updates
    private _messageUpdates = new ChannelSubject<StoredMessage>();
    private _exchangeUpdates = new ChannelSubject<ExchangeRecord>();

    constructor(channelName: string) {
        this._channelName = channelName;
    }

    // ========================================================================
    // DATABASE LIFECYCLE
    // ========================================================================

    /**
     * Open database connection
     */
    async open(): Promise<IDBDatabase> {
        if (this._db && this._isOpen) return this._db;
        if (this._openPromise) return this._openPromise;

        this._openPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                this._openPromise = null;
                reject(new Error("Failed to open IndexedDB"));
            };

            request.onsuccess = () => {
                this._db = request.result;
                this._isOpen = true;
                this._openPromise = null;
                resolve(this._db);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                this._createStores(db);
            };
        });

        return this._openPromise;
    }

    /**
     * Close database connection
     */
    close(): void {
        if (this._db) {
            this._db.close();
            this._db = null;
            this._isOpen = false;
        }
    }

    private _createStores(db: IDBDatabase): void {
        // Messages store
        if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
            const messagesStore = db.createObjectStore(STORES.MESSAGES, { keyPath: "id" });
            messagesStore.createIndex("channel", "channel", { unique: false });
            messagesStore.createIndex("status", "status", { unique: false });
            messagesStore.createIndex("recipient", "recipient", { unique: false });
            messagesStore.createIndex("createdAt", "createdAt", { unique: false });
            messagesStore.createIndex("channel_status", ["channel", "status"], { unique: false });
        }

        // Mailbox store (per-channel inbox)
        if (!db.objectStoreNames.contains(STORES.MAILBOX)) {
            const mailboxStore = db.createObjectStore(STORES.MAILBOX, { keyPath: "id" });
            mailboxStore.createIndex("channel", "channel", { unique: false });
            mailboxStore.createIndex("priority", "priority", { unique: false });
            mailboxStore.createIndex("expiresAt", "expiresAt", { unique: false });
        }

        // Pending operations store
        if (!db.objectStoreNames.contains(STORES.PENDING)) {
            const pendingStore = db.createObjectStore(STORES.PENDING, { keyPath: "id" });
            pendingStore.createIndex("channel", "channel", { unique: false });
            pendingStore.createIndex("createdAt", "createdAt", { unique: false });
        }

        // Exchange store (shared data)
        if (!db.objectStoreNames.contains(STORES.EXCHANGE)) {
            const exchangeStore = db.createObjectStore(STORES.EXCHANGE, { keyPath: "id" });
            exchangeStore.createIndex("key", "key", { unique: true });
            exchangeStore.createIndex("owner", "owner", { unique: false });
        }

        // Transactions store (for rollback support)
        if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
            const txStore = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: "id" });
            txStore.createIndex("createdAt", "createdAt", { unique: false });
        }
    }

    // ========================================================================
    // DEFER: Queue messages for later delivery
    // ========================================================================

    /**
     * Defer a message for later delivery
     */
    async defer(
        message: Omit<ChannelMessage, "id" | "timestamp">,
        options: {
            priority?: number;
            expiresIn?: number;
            maxRetries?: number;
            metadata?: Record<string, any>;
        } = {}
    ): Promise<string> {
        const db = await this.open();

        const storedMessage: StoredMessage = {
            id: UUIDv4(),
            channel: message.channel,
            sender: message.sender ?? this._channelName,
            recipient: message.channel,
            type: message.type,
            payload: message.payload,
            status: "pending",
            priority: options.priority ?? 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            expiresAt: options.expiresIn ? Date.now() + options.expiresIn : null,
            retryCount: 0,
            maxRetries: options.maxRetries ?? 3,
            metadata: options.metadata
        };

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORES.MESSAGES, STORES.MAILBOX], "readwrite");
            const messagesStore = tx.objectStore(STORES.MESSAGES);
            const mailboxStore = tx.objectStore(STORES.MAILBOX);

            messagesStore.add(storedMessage);
            mailboxStore.add(storedMessage);

            tx.oncomplete = () => {
                this._messageUpdates.next(storedMessage);
                resolve(storedMessage.id);
            };

            tx.onerror = () => reject(new Error("Failed to defer message"));
        });
    }

    /**
     * Get deferred messages for a channel
     */
    async getDeferredMessages(
        channel: string,
        options: { status?: MessageStatus; limit?: number; offset?: number } = {}
    ): Promise<StoredMessage[]> {
        const db = await this.open();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.MESSAGES, "readonly");
            const store = tx.objectStore(STORES.MESSAGES);

            const index = options.status
                ? store.index("channel_status")
                : store.index("channel");

            const query = options.status
                ? IDBKeyRange.only([channel, options.status])
                : IDBKeyRange.only(channel);

            const request = index.getAll(query, options.limit);

            request.onsuccess = () => {
                let results = request.result;
                if (options.offset) {
                    results = results.slice(options.offset);
                }
                resolve(results);
            };

            request.onerror = () => reject(new Error("Failed to get deferred messages"));
        });
    }

    /**
     * Process next pending message
     */
    async processNextPending(channel: string): Promise<StoredMessage | null> {
        const db = await this.open();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.MESSAGES, "readwrite");
            const store = tx.objectStore(STORES.MESSAGES);
            const index = store.index("channel_status");

            const request = index.openCursor(IDBKeyRange.only([channel, "pending"]));

            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    const message = cursor.value as StoredMessage;
                    message.status = "processing";
                    message.updatedAt = Date.now();
                    cursor.update(message);
                    this._messageUpdates.next(message);
                    resolve(message);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => reject(new Error("Failed to process pending message"));
        });
    }

    /**
     * Mark message as delivered
     */
    async markDelivered(messageId: string): Promise<void> {
        await this._updateMessageStatus(messageId, "delivered");
    }

    /**
     * Mark message as failed and retry if possible
     */
    async markFailed(messageId: string): Promise<boolean> {
        const db = await this.open();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.MESSAGES, "readwrite");
            const store = tx.objectStore(STORES.MESSAGES);
            const request = store.get(messageId);

            request.onsuccess = () => {
                const message = request.result as StoredMessage;
                if (!message) {
                    resolve(false);
                    return;
                }

                message.retryCount++;
                message.updatedAt = Date.now();

                if (message.retryCount < message.maxRetries) {
                    message.status = "pending"; // Retry
                } else {
                    message.status = "failed";
                }

                store.put(message);
                this._messageUpdates.next(message);
                resolve(message.status === "pending");
            };

            request.onerror = () => reject(new Error("Failed to mark message as failed"));
        });
    }

    private async _updateMessageStatus(messageId: string, status: MessageStatus): Promise<void> {
        const db = await this.open();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.MESSAGES, "readwrite");
            const store = tx.objectStore(STORES.MESSAGES);
            const request = store.get(messageId);

            request.onsuccess = () => {
                const message = request.result as StoredMessage;
                if (message) {
                    message.status = status;
                    message.updatedAt = Date.now();
                    store.put(message);
                    this._messageUpdates.next(message);
                }
                resolve();
            };

            request.onerror = () => reject(new Error("Failed to update message status"));
        });
    }

    // ========================================================================
    // MAILBOX / INBOX: Per-channel message storage
    // ========================================================================

    /**
     * Get mailbox for a channel
     */
    async getMailbox(
        channel: string,
        options: { limit?: number; sortBy?: "priority" | "createdAt" } = {}
    ): Promise<StoredMessage[]> {
        const db = await this.open();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.MAILBOX, "readonly");
            const store = tx.objectStore(STORES.MAILBOX);
            const index = store.index("channel");

            const request = index.getAll(IDBKeyRange.only(channel), options.limit);

            request.onsuccess = () => {
                let results = request.result as StoredMessage[];

                // Sort
                if (options.sortBy === "priority") {
                    results.sort((a, b) => b.priority - a.priority);
                } else {
                    results.sort((a, b) => b.createdAt - a.createdAt);
                }

                resolve(results);
            };

            request.onerror = () => reject(new Error("Failed to get mailbox"));
        });
    }

    /**
     * Get mailbox statistics
     */
    async getMailboxStats(channel: string): Promise<MailboxStats> {
        const messages = await this.getDeferredMessages(channel);

        const stats: MailboxStats = {
            total: messages.length,
            pending: 0,
            processing: 0,
            delivered: 0,
            failed: 0,
            expired: 0
        };

        const now = Date.now();
        for (const msg of messages) {
            if (msg.expiresAt && msg.expiresAt < now) {
                stats.expired++;
            } else {
                stats[msg.status as keyof Omit<MailboxStats, "total" | "expired">]++;
            }
        }

        return stats;
    }

    /**
     * Clear mailbox for a channel
     */
    async clearMailbox(channel: string): Promise<number> {
        const db = await this.open();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.MAILBOX, "readwrite");
            const store = tx.objectStore(STORES.MAILBOX);
            const index = store.index("channel");

            let deletedCount = 0;
            const request = index.openCursor(IDBKeyRange.only(channel));

            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                }
            };

            tx.oncomplete = () => resolve(deletedCount);
            tx.onerror = () => reject(new Error("Failed to clear mailbox"));
        });
    }

    // ========================================================================
    // PENDING: Track pending operations
    // ========================================================================

    /**
     * Register a pending operation
     */
    async registerPending<T = any>(
        operation: { type: string; data: T; metadata?: Record<string, any> }
    ): Promise<string> {
        const db = await this.open();

        const pending = {
            id: UUIDv4(),
            channel: this._channelName,
            type: operation.type,
            data: operation.data,
            metadata: operation.metadata,
            createdAt: Date.now(),
            status: "pending"
        };

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.PENDING, "readwrite");
            const store = tx.objectStore(STORES.PENDING);
            store.add(pending);

            tx.oncomplete = () => resolve(pending.id);
            tx.onerror = () => reject(new Error("Failed to register pending operation"));
        });
    }

    /**
     * Get all pending operations for channel
     */
    async getPendingOperations(): Promise<any[]> {
        const db = await this.open();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.PENDING, "readonly");
            const store = tx.objectStore(STORES.PENDING);
            const index = store.index("channel");

            const request = index.getAll(IDBKeyRange.only(this._channelName));

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error("Failed to get pending operations"));
        });
    }

    /**
     * Complete a pending operation
     */
    async completePending(operationId: string): Promise<void> {
        const db = await this.open();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.PENDING, "readwrite");
            const store = tx.objectStore(STORES.PENDING);
            store.delete(operationId);

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(new Error("Failed to complete pending operation"));
        });
    }

    /**
     * Await a pending operation (poll until complete or timeout)
     */
    async awaitPending<T = any>(
        operationId: string,
        options: { timeout?: number; pollInterval?: number } = {}
    ): Promise<T | null> {
        const timeout = options.timeout ?? 30000;
        const pollInterval = options.pollInterval ?? 100;
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const pending = await this._getPendingById(operationId);

            if (!pending) {
                // Operation completed (deleted)
                return null;
            }

            if (pending.status === "completed") {
                await this.completePending(operationId);
                return pending.result as T;
            }

            await new Promise((r) => setTimeout(r, pollInterval));
        }

        throw new Error(`Pending operation ${operationId} timed out`);
    }

    private async _getPendingById(id: string): Promise<any | null> {
        const db = await this.open();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.PENDING, "readonly");
            const store = tx.objectStore(STORES.PENDING);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(new Error("Failed to get pending operation"));
        });
    }

    // ========================================================================
    // EXCHANGE: Shared data between contexts
    // ========================================================================

    /**
     * Put data in exchange (shared storage)
     */
    async exchangePut<T = any>(
        key: string,
        value: T,
        options: { sharedWith?: string[]; ttl?: number } = {}
    ): Promise<string> {
        const db = await this.open();

        const record: ExchangeRecord<T> = {
            id: UUIDv4(),
            key,
            value,
            owner: this._channelName,
            sharedWith: options.sharedWith ?? ["*"],
            version: 1,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.EXCHANGE, "readwrite");
            const store = tx.objectStore(STORES.EXCHANGE);
            const index = store.index("key");

            // Check if key exists
            const getRequest = index.get(key);

            getRequest.onsuccess = () => {
                const existing = getRequest.result as ExchangeRecord<T> | undefined;

                if (existing) {
                    // Update existing
                    record.id = existing.id;
                    record.version = existing.version + 1;
                    record.createdAt = existing.createdAt;
                }

                store.put(record);
            };

            tx.oncomplete = () => {
                this._exchangeUpdates.next(record);
                resolve(record.id);
            };

            tx.onerror = () => reject(new Error("Failed to put exchange data"));
        });
    }

    /**
     * Get data from exchange
     */
    async exchangeGet<T = any>(key: string): Promise<T | null> {
        const db = await this.open();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.EXCHANGE, "readonly");
            const store = tx.objectStore(STORES.EXCHANGE);
            const index = store.index("key");

            const request = index.get(key);

            request.onsuccess = () => {
                const record = request.result as ExchangeRecord<T> | undefined;

                if (!record) {
                    resolve(null);
                    return;
                }

                // Check access
                if (!this._canAccessExchange(record)) {
                    resolve(null);
                    return;
                }

                resolve(record.value);
            };

            request.onerror = () => reject(new Error("Failed to get exchange data"));
        });
    }

    /**
     * Delete data from exchange
     */
    async exchangeDelete(key: string): Promise<boolean> {
        const db = await this.open();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.EXCHANGE, "readwrite");
            const store = tx.objectStore(STORES.EXCHANGE);
            const index = store.index("key");

            const getRequest = index.get(key);

            getRequest.onsuccess = () => {
                const record = getRequest.result as ExchangeRecord | undefined;

                if (!record) {
                    resolve(false);
                    return;
                }

                // Only owner can delete
                if (record.owner !== this._channelName) {
                    resolve(false);
                    return;
                }

                store.delete(record.id);
            };

            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(new Error("Failed to delete exchange data"));
        });
    }

    /**
     * Acquire lock on exchange key
     */
    async exchangeLock(
        key: string,
        options: { timeout?: number } = {}
    ): Promise<boolean> {
        const db = await this.open();
        const timeout = options.timeout ?? 30000;

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.EXCHANGE, "readwrite");
            const store = tx.objectStore(STORES.EXCHANGE);
            const index = store.index("key");

            const request = index.get(key);

            request.onsuccess = () => {
                const record = request.result as ExchangeRecord | undefined;

                if (!record) {
                    resolve(false);
                    return;
                }

                // Check if locked by someone else
                if (record.lock && record.lock.holder !== this._channelName) {
                    if (record.lock.expiresAt > Date.now()) {
                        resolve(false); // Still locked
                        return;
                    }
                }

                // Acquire lock
                record.lock = {
                    holder: this._channelName,
                    acquiredAt: Date.now(),
                    expiresAt: Date.now() + timeout
                };
                record.updatedAt = Date.now();

                store.put(record);
            };

            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(new Error("Failed to acquire lock"));
        });
    }

    /**
     * Release lock on exchange key
     */
    async exchangeUnlock(key: string): Promise<void> {
        const db = await this.open();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.EXCHANGE, "readwrite");
            const store = tx.objectStore(STORES.EXCHANGE);
            const index = store.index("key");

            const request = index.get(key);

            request.onsuccess = () => {
                const record = request.result as ExchangeRecord | undefined;

                if (record && record.lock?.holder === this._channelName) {
                    delete record.lock;
                    record.updatedAt = Date.now();
                    store.put(record);
                }
            };

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(new Error("Failed to release lock"));
        });
    }

    private _canAccessExchange(record: ExchangeRecord): boolean {
        if (record.owner === this._channelName) return true;
        if (record.sharedWith.includes("*")) return true;
        return record.sharedWith.includes(this._channelName);
    }

    // ========================================================================
    // TRANSACTIONS: Batch operations with rollback
    // ========================================================================

    /**
     * Begin a transaction for batch operations
     */
    async beginTransaction(): Promise<ChannelTransaction> {
        return new ChannelTransaction(this);
    }

    /**
     * Execute operations in transaction
     */
    async executeTransaction(
        operations: TransactionOp[]
    ): Promise<void> {
        const db = await this.open();

        // Collect affected stores
        const storeNames = new Set(operations.map((op) => op.store));

        return new Promise((resolve, reject) => {
            const tx = db.transaction(Array.from(storeNames), "readwrite");

            for (const op of operations) {
                const store = tx.objectStore(op.store);

                switch (op.type) {
                    case "put":
                        if (op.value !== undefined) {
                            store.put(op.value);
                        }
                        break;
                    case "delete":
                        if (op.key !== undefined) {
                            store.delete(op.key);
                        }
                        break;
                    case "update":
                        // Get and update
                        if (op.key !== undefined) {
                            const getReq = store.get(op.key);
                            getReq.onsuccess = () => {
                                if (getReq.result && op.value) {
                                    store.put({ ...getReq.result, ...op.value });
                                }
                            };
                        }
                        break;
                }
            }

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(new Error("Transaction failed"));
        });
    }

    // ========================================================================
    // SUBSCRIPTIONS
    // ========================================================================

    /**
     * Subscribe to message updates
     */
    onMessageUpdate(handler: (msg: StoredMessage) => void): Subscription {
        return this._messageUpdates.subscribe({ next: handler });
    }

    /**
     * Subscribe to exchange updates
     */
    onExchangeUpdate(handler: (record: ExchangeRecord) => void): Subscription {
        return this._exchangeUpdates.subscribe({ next: handler });
    }

    // ========================================================================
    // CLEANUP
    // ========================================================================

    /**
     * Clean up expired messages
     */
    async cleanupExpired(): Promise<number> {
        const db = await this.open();
        const now = Date.now();

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORES.MESSAGES, STORES.MAILBOX], "readwrite");
            const messagesStore = tx.objectStore(STORES.MESSAGES);
            const mailboxStore = tx.objectStore(STORES.MAILBOX);

            let deletedCount = 0;

            // Clean messages
            const msgRequest = messagesStore.openCursor();
            msgRequest.onsuccess = () => {
                const cursor = msgRequest.result;
                if (cursor) {
                    const msg = cursor.value as StoredMessage;
                    if (msg.expiresAt && msg.expiresAt < now) {
                        cursor.delete();
                        deletedCount++;
                    }
                    cursor.continue();
                }
            };

            // Clean mailbox
            const mailRequest = mailboxStore.openCursor();
            mailRequest.onsuccess = () => {
                const cursor = mailRequest.result;
                if (cursor) {
                    const msg = cursor.value as StoredMessage;
                    if (msg.expiresAt && msg.expiresAt < now) {
                        cursor.delete();
                        deletedCount++;
                    }
                    cursor.continue();
                }
            };

            tx.oncomplete = () => resolve(deletedCount);
            tx.onerror = () => reject(new Error("Failed to cleanup expired"));
        });
    }
}

// ============================================================================
// TRANSACTION HELPER
// ============================================================================

/**
 * Helper class for batch operations with rollback support
 */
export class ChannelTransaction {
    private _operations: TransactionOp[] = [];
    private _isCommitted = false;
    private _isRolledBack = false;

    constructor(private _storage: ChannelStorage) {}

    /**
     * Add put operation
     */
    put<T>(store: string, value: T): this {
        this._checkState();
        this._operations.push({
            id: UUIDv4(),
            type: "put",
            store,
            value,
            timestamp: Date.now()
        });
        return this;
    }

    /**
     * Add delete operation
     */
    delete(store: string, key: IDBValidKey): this {
        this._checkState();
        this._operations.push({
            id: UUIDv4(),
            type: "delete",
            store,
            key,
            timestamp: Date.now()
        });
        return this;
    }

    /**
     * Add update operation
     */
    update<T>(store: string, key: IDBValidKey, updates: Partial<T>): this {
        this._checkState();
        this._operations.push({
            id: UUIDv4(),
            type: "update",
            store,
            key,
            value: updates,
            timestamp: Date.now()
        });
        return this;
    }

    /**
     * Commit transaction
     */
    async commit(): Promise<void> {
        this._checkState();

        if (this._operations.length === 0) {
            this._isCommitted = true;
            return;
        }

        await this._storage.executeTransaction(this._operations);
        this._isCommitted = true;
    }

    /**
     * Rollback transaction (just clear operations, don't execute)
     */
    rollback(): void {
        this._operations = [];
        this._isRolledBack = true;
    }

    /**
     * Get operation count
     */
    get operationCount(): number {
        return this._operations.length;
    }

    private _checkState(): void {
        if (this._isCommitted) {
            throw new Error("Transaction already committed");
        }
        if (this._isRolledBack) {
            throw new Error("Transaction already rolled back");
        }
    }
}

// ============================================================================
// SINGLETON STORAGE INSTANCES
// ============================================================================

const _storageInstances = new Map<string, ChannelStorage>();

/**
 * Get storage instance for channel
 */
export function getChannelStorage(channelName: string): ChannelStorage {
    if (!_storageInstances.has(channelName)) {
        _storageInstances.set(channelName, new ChannelStorage(channelName));
    }
    return _storageInstances.get(channelName)!;
}

/**
 * Close all storage instances
 */
export function closeAllStorage(): void {
    for (const storage of _storageInstances.values()) {
        storage.close();
    }
    _storageInstances.clear();
}
