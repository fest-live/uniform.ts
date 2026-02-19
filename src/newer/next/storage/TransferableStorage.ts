/**
 * Transferable Storage - IndexedDB with Transferable Support
 *
 * High-performance storage layer with support for:
 * - ArrayBuffer and TypedArray storage
 * - ArrayBuffer.transfer() for zero-copy operations
 * - Structured cloning for complex objects
 * - Transaction batching for bulk operations
 * - Observable change notifications
 */

import { UUIDv4 } from "fest/core";
import { ChannelSubject, type Subscription, type Observer } from "../observable/Observable";

// ============================================================================
// TYPES
// ============================================================================

export interface TransferableRecord<T = any> {
    id: string;
    data: T;
    buffers?: ArrayBuffer[];
    metadata?: Record<string, any>;
    createdAt: number;
    updatedAt: number;
    expiresAt?: number;
}

export interface TransferableQuery<T = any> {
    index?: string;
    range?: IDBKeyRange;
    direction?: IDBCursorDirection;
    limit?: number;
    offset?: number;
    filter?: (record: TransferableRecord<T>) => boolean;
}

export interface TransferableStorageConfig {
    dbName: string;
    storeName?: string;
    version?: number;
    indexes?: Array<{ name: string; keyPath: string | string[]; unique?: boolean }>;
    enableChangeTracking?: boolean;
    autoCleanupExpired?: boolean;
    cleanupInterval?: number;
}

export type ChangeType = "add" | "put" | "delete" | "clear";

export interface StorageChange<T = any> {
    type: ChangeType;
    key: string;
    record?: TransferableRecord<T>;
    previousRecord?: TransferableRecord<T>;
    timestamp: number;
}

// ============================================================================
// TRANSFERABLE STORAGE
// ============================================================================

export class TransferableStorage<T = any> {
    private _db: IDBDatabase | null = null;
    private _config: Required<TransferableStorageConfig>;
    private _changes = new ChannelSubject<StorageChange<T>>();
    private _state = new ChannelSubject<"closed" | "opening" | "open" | "error">();
    private _cleanupTimer: ReturnType<typeof setInterval> | null = null;

    constructor(config: TransferableStorageConfig) {
        this._config = {
            storeName: "transferable",
            version: 1,
            indexes: [],
            enableChangeTracking: true,
            autoCleanupExpired: true,
            cleanupInterval: 60000,
            ...config
        };
    }

    /**
     * Open database connection
     */
    async open(): Promise<void> {
        if (this._db) return;
        this._state.next("opening");

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this._config.dbName, this._config.version);

            request.onerror = () => {
                this._state.next("error");
                reject(new Error(`Failed to open database: ${request.error?.message}`));
            };

            request.onsuccess = () => {
                this._db = request.result;
                this._state.next("open");

                if (this._config.autoCleanupExpired) {
                    this._startCleanupTimer();
                }

                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create store if needed
                if (!db.objectStoreNames.contains(this._config.storeName)) {
                    const store = db.createObjectStore(this._config.storeName, { keyPath: "id" });

                    // Create indexes
                    store.createIndex("createdAt", "createdAt");
                    store.createIndex("updatedAt", "updatedAt");
                    store.createIndex("expiresAt", "expiresAt");

                    for (const idx of this._config.indexes) {
                        store.createIndex(idx.name, idx.keyPath, { unique: idx.unique ?? false });
                    }
                }
            };
        });
    }

    /**
     * Close database connection
     */
    close(): void {
        if (this._cleanupTimer) {
            clearInterval(this._cleanupTimer);
            this._cleanupTimer = null;
        }
        this._db?.close();
        this._db = null;
        this._state.next("closed");
    }

    /**
     * Store data with optional ArrayBuffer transfer
     */
    async put(
        id: string,
        data: T,
        options: {
            buffers?: ArrayBuffer[];
            transfer?: boolean;
            metadata?: Record<string, any>;
            expiresIn?: number;
        } = {}
    ): Promise<TransferableRecord<T>> {
        await this._ensureOpen();

        let buffers = options.buffers ?? [];

        // Use ArrayBuffer.transfer() if available and requested (ES2024+)
        if (options.transfer && buffers.length > 0) {
            buffers = buffers.map(buf => {
                // @ts-ignore - Modern API (ES2024)
                if ("transfer" in buf && typeof buf.transfer === "function") {
                    // @ts-ignore
                    return buf.transfer();
                }
                return buf;
            });
        }

        const now = Date.now();
        const existing = await this.get(id);

        const record: TransferableRecord<T> = {
            id,
            data,
            buffers: buffers.length > 0 ? buffers : undefined,
            metadata: options.metadata,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            expiresAt: options.expiresIn ? now + options.expiresIn : undefined
        };

        return new Promise((resolve, reject) => {
            const tx = this._db!.transaction(this._config.storeName, "readwrite");
            const store = tx.objectStore(this._config.storeName);

            const request = store.put(record);

            request.onsuccess = () => {
                if (this._config.enableChangeTracking) {
                    this._changes.next({
                        type: existing ? "put" : "add",
                        key: id,
                        record,
                        previousRecord: existing ?? undefined,
                        timestamp: now
                    });
                }
                resolve(record);
            };

            request.onerror = () => reject(new Error(`Put failed: ${request.error?.message}`));
        });
    }

    /**
     * Store ArrayBuffer directly with zero-copy semantics
     */
    async putBuffer(
        id: string,
        buffer: ArrayBuffer,
        options: { transfer?: boolean; metadata?: Record<string, any>; expiresIn?: number } = {}
    ): Promise<TransferableRecord<ArrayBuffer>> {
        return this.put(id, buffer as any, { buffers: [buffer], ...options }) as Promise<TransferableRecord<ArrayBuffer>>;
    }

    /**
     * Store TypedArray
     */
    async putTypedArray<A extends ArrayBufferView>(
        id: string,
        array: A,
        options: { transfer?: boolean; metadata?: Record<string, any>; expiresIn?: number } = {}
    ): Promise<TransferableRecord<{ type: string; data: number[] }>> {
        const data = {
            type: array.constructor.name,
            data: Array.from(array as any)
        };

        return this.put(id, data as any, {
            buffers: options.transfer ? [array.buffer] : undefined,
            ...options
        }) as Promise<TransferableRecord<{ type: string; data: number[] }>>;
    }

    /**
     * Get record by ID
     */
    async get(id: string): Promise<TransferableRecord<T> | null> {
        await this._ensureOpen();

        return new Promise((resolve, reject) => {
            const tx = this._db!.transaction(this._config.storeName, "readonly");
            const store = tx.objectStore(this._config.storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                const record = request.result as TransferableRecord<T> | undefined;

                // Check expiration
                if (record?.expiresAt && record.expiresAt < Date.now()) {
                    this.delete(id); // Async cleanup
                    resolve(null);
                } else {
                    resolve(record ?? null);
                }
            };

            request.onerror = () => reject(new Error(`Get failed: ${request.error?.message}`));
        });
    }

    /**
     * Get ArrayBuffer and optionally transfer ownership
     */
    async getBuffer(id: string, transfer?: boolean): Promise<ArrayBuffer | null> {
        const record = await this.get(id);
        if (!record) return null;

        let buffer = record.buffers?.[0] ?? (record.data instanceof ArrayBuffer ? record.data : null);

        if (buffer && transfer) {
            // @ts-ignore - Modern API
            if ("transfer" in buffer && typeof buffer.transfer === "function") {
                // @ts-ignore
                buffer = buffer.transfer();
            }
        }

        return buffer;
    }

    /**
     * Reconstruct TypedArray from stored data
     */
    async getTypedArray<A extends ArrayBufferView>(id: string): Promise<A | null> {
        const record = await this.get(id);
        if (!record || !record.data || typeof record.data !== "object") return null;

        const { type, data } = record.data as { type: string; data: number[] };
        const TypedArrayCtor = (globalThis as any)[type];

        if (!TypedArrayCtor) return null;
        return new TypedArrayCtor(data) as A;
    }

    /**
     * Delete record
     */
    async delete(id: string): Promise<boolean> {
        await this._ensureOpen();

        const existing = this._config.enableChangeTracking ? await this.get(id) : null;

        return new Promise((resolve, reject) => {
            const tx = this._db!.transaction(this._config.storeName, "readwrite");
            const store = tx.objectStore(this._config.storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                if (this._config.enableChangeTracking && existing) {
                    this._changes.next({
                        type: "delete",
                        key: id,
                        previousRecord: existing,
                        timestamp: Date.now()
                    });
                }
                resolve(true);
            };

            request.onerror = () => reject(new Error(`Delete failed: ${request.error?.message}`));
        });
    }

    /**
     * Query records with cursor
     */
    async query(query: TransferableQuery<T> = {}): Promise<TransferableRecord<T>[]> {
        await this._ensureOpen();

        return new Promise((resolve, reject) => {
            const tx = this._db!.transaction(this._config.storeName, "readonly");
            const store = tx.objectStore(this._config.storeName);
            const source = query.index ? store.index(query.index) : store;

            const results: TransferableRecord<T>[] = [];
            let skipped = 0;
            const offset = query.offset ?? 0;
            const limit = query.limit ?? Infinity;

            const request = source.openCursor(query.range, query.direction);

            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor || results.length >= limit) {
                    resolve(results);
                    return;
                }

                const record = cursor.value as TransferableRecord<T>;

                // Check expiration
                if (record.expiresAt && record.expiresAt < Date.now()) {
                    cursor.continue();
                    return;
                }

                // Apply filter
                if (query.filter && !query.filter(record)) {
                    cursor.continue();
                    return;
                }

                // Handle offset
                if (skipped < offset) {
                    skipped++;
                    cursor.continue();
                    return;
                }

                results.push(record);
                cursor.continue();
            };

            request.onerror = () => reject(new Error(`Query failed: ${request.error?.message}`));
        });
    }

    /**
     * Batch operations in single transaction
     */
    async batch(
        operations: Array<
            | { type: "put"; id: string; data: T; options?: any }
            | { type: "delete"; id: string }
        >
    ): Promise<void> {
        await this._ensureOpen();

        return new Promise((resolve, reject) => {
            const tx = this._db!.transaction(this._config.storeName, "readwrite");
            const store = tx.objectStore(this._config.storeName);
            const now = Date.now();

            for (const op of operations) {
                if (op.type === "put") {
                    const record: TransferableRecord<T> = {
                        id: op.id,
                        data: op.data,
                        metadata: op.options?.metadata,
                        createdAt: now,
                        updatedAt: now,
                        expiresAt: op.options?.expiresIn ? now + op.options.expiresIn : undefined
                    };
                    store.put(record);
                } else if (op.type === "delete") {
                    store.delete(op.id);
                }
            }

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(new Error(`Batch failed: ${tx.error?.message}`));
        });
    }

    /**
     * Clear all records
     */
    async clear(): Promise<void> {
        await this._ensureOpen();

        return new Promise((resolve, reject) => {
            const tx = this._db!.transaction(this._config.storeName, "readwrite");
            const store = tx.objectStore(this._config.storeName);
            const request = store.clear();

            request.onsuccess = () => {
                if (this._config.enableChangeTracking) {
                    this._changes.next({
                        type: "clear",
                        key: "*",
                        timestamp: Date.now()
                    });
                }
                resolve();
            };

            request.onerror = () => reject(new Error(`Clear failed: ${request.error?.message}`));
        });
    }

    /**
     * Count records
     */
    async count(query?: { index?: string; range?: IDBKeyRange }): Promise<number> {
        await this._ensureOpen();

        return new Promise((resolve, reject) => {
            const tx = this._db!.transaction(this._config.storeName, "readonly");
            const store = tx.objectStore(this._config.storeName);
            const source = query?.index ? store.index(query.index) : store;
            const request = source.count(query?.range);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(`Count failed: ${request.error?.message}`));
        });
    }

    /**
     * Subscribe to changes
     */
    onChanges(handler: (change: StorageChange<T>) => void): Subscription {
        return this._changes.subscribe({ next: handler });
    }

    /**
     * Subscribe to state changes
     */
    onState(handler: (state: "closed" | "opening" | "open" | "error") => void): Subscription {
        return this._state.subscribe({ next: handler });
    }

    /**
     * Cleanup expired records
     */
    async cleanupExpired(): Promise<number> {
        await this._ensureOpen();

        const now = Date.now();
        const expired = await this.query({
            index: "expiresAt",
            range: IDBKeyRange.upperBound(now)
        });

        for (const record of expired) {
            await this.delete(record.id);
        }

        return expired.length;
    }

    // ========================================================================
    // PRIVATE
    // ========================================================================

    private async _ensureOpen(): Promise<void> {
        if (!this._db) await this.open();
    }

    private _startCleanupTimer(): void {
        this._cleanupTimer = setInterval(() => {
            this.cleanupExpired().catch(console.error);
        }, this._config.cleanupInterval);
    }

    get isOpen(): boolean { return this._db !== null; }
    get state() { return this._state; }
    get changes() { return this._changes; }
}

// ============================================================================
// MESSAGE QUEUE STORAGE
// ============================================================================

export interface QueuedMessage<T = any> {
    id: string;
    channel: string;
    sender: string;
    type: string;
    payload: T;
    priority: number;
    attempts: number;
    maxAttempts: number;
    status: "pending" | "processing" | "completed" | "failed" | "expired";
    createdAt: number;
    scheduledFor: number;
    expiresAt?: number;
    lastAttemptAt?: number;
    error?: string;
}

export class MessageQueueStorage extends TransferableStorage<QueuedMessage> {
    constructor(dbName: string = "uniform-message-queue") {
        super({
            dbName,
            storeName: "messages",
            indexes: [
                { name: "channel", keyPath: "channel" },
                { name: "status", keyPath: "status" },
                { name: "priority", keyPath: "priority" },
                { name: "scheduledFor", keyPath: "scheduledFor" },
                { name: "channel-status", keyPath: ["channel", "status"] }
            ]
        });
    }

    /**
     * Enqueue a message
     */
    async enqueue(message: {
        channel: string;
        sender: string;
        type: string;
        payload: any;
        priority?: number;
        delay?: number;
        expiresIn?: number;
        maxAttempts?: number;
    }): Promise<QueuedMessage> {
        const now = Date.now();
        const id = UUIDv4();

        const queuedMessage: QueuedMessage = {
            id,
            channel: message.channel,
            sender: message.sender,
            type: message.type,
            payload: message.payload,
            priority: message.priority ?? 0,
            attempts: 0,
            maxAttempts: message.maxAttempts ?? 3,
            status: "pending",
            createdAt: now,
            scheduledFor: now + (message.delay ?? 0),
            expiresAt: message.expiresIn ? now + message.expiresIn : undefined
        };

        await this.put(id, queuedMessage);
        return queuedMessage;
    }

    /**
     * Dequeue next message for channel
     */
    async dequeue(channel: string): Promise<QueuedMessage | null> {
        const now = Date.now();

        const messages = await this.query({
            filter: (r) =>
                r.data.channel === channel &&
                r.data.status === "pending" &&
                r.data.scheduledFor <= now &&
                (!r.data.expiresAt || r.data.expiresAt > now),
            limit: 1
        });

        if (messages.length === 0) return null;

        const message = messages[0].data;
        message.status = "processing";
        message.attempts++;
        message.lastAttemptAt = now;

        await this.put(message.id, message);
        return message;
    }

    /**
     * Mark message as completed
     */
    async complete(id: string): Promise<void> {
        const record = await this.get(id);
        if (!record) return;

        record.data.status = "completed";
        await this.put(id, record.data);
    }

    /**
     * Mark message as failed
     */
    async fail(id: string, error: string): Promise<void> {
        const record = await this.get(id);
        if (!record) return;

        if (record.data.attempts >= record.data.maxAttempts) {
            record.data.status = "failed";
        } else {
            record.data.status = "pending";
        }
        record.data.error = error;

        await this.put(id, record.data);
    }

    /**
     * Get pending count for channel
     */
    async getPendingCount(channel: string): Promise<number> {
        const messages = await this.query({
            filter: (r) => r.data.channel === channel && r.data.status === "pending"
        });
        return messages.length;
    }
}

// ============================================================================
// FACTORY
// ============================================================================

export const TransferableStorageFactory = {
    create: <T>(config: TransferableStorageConfig) =>
        new TransferableStorage<T>(config),
    createMessageQueue: (dbName?: string) =>
        new MessageQueueStorage(dbName)
};
