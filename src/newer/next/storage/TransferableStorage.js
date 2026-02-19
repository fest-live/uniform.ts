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
import { ChannelSubject } from "../observable/Observable";
// ============================================================================
// TRANSFERABLE STORAGE
// ============================================================================
export class TransferableStorage {
    _db = null;
    _config;
    _changes = new ChannelSubject();
    _state = new ChannelSubject();
    _cleanupTimer = null;
    constructor(config) {
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
    async open() {
        if (this._db)
            return;
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
                const db = event.target.result;
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
    close() {
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
    async put(id, data, options = {}) {
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
        const record = {
            id,
            data,
            buffers: buffers.length > 0 ? buffers : undefined,
            metadata: options.metadata,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            expiresAt: options.expiresIn ? now + options.expiresIn : undefined
        };
        return new Promise((resolve, reject) => {
            const tx = this._db.transaction(this._config.storeName, "readwrite");
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
    async putBuffer(id, buffer, options = {}) {
        return this.put(id, buffer, { buffers: [buffer], ...options });
    }
    /**
     * Store TypedArray
     */
    async putTypedArray(id, array, options = {}) {
        const data = {
            type: array.constructor.name,
            data: Array.from(array)
        };
        return this.put(id, data, {
            buffers: options.transfer ? [array.buffer] : undefined,
            ...options
        });
    }
    /**
     * Get record by ID
     */
    async get(id) {
        await this._ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = this._db.transaction(this._config.storeName, "readonly");
            const store = tx.objectStore(this._config.storeName);
            const request = store.get(id);
            request.onsuccess = () => {
                const record = request.result;
                // Check expiration
                if (record?.expiresAt && record.expiresAt < Date.now()) {
                    this.delete(id); // Async cleanup
                    resolve(null);
                }
                else {
                    resolve(record ?? null);
                }
            };
            request.onerror = () => reject(new Error(`Get failed: ${request.error?.message}`));
        });
    }
    /**
     * Get ArrayBuffer and optionally transfer ownership
     */
    async getBuffer(id, transfer) {
        const record = await this.get(id);
        if (!record)
            return null;
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
    async getTypedArray(id) {
        const record = await this.get(id);
        if (!record || !record.data || typeof record.data !== "object")
            return null;
        const { type, data } = record.data;
        const TypedArrayCtor = globalThis[type];
        if (!TypedArrayCtor)
            return null;
        return new TypedArrayCtor(data);
    }
    /**
     * Delete record
     */
    async delete(id) {
        await this._ensureOpen();
        const existing = this._config.enableChangeTracking ? await this.get(id) : null;
        return new Promise((resolve, reject) => {
            const tx = this._db.transaction(this._config.storeName, "readwrite");
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
    async query(query = {}) {
        await this._ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = this._db.transaction(this._config.storeName, "readonly");
            const store = tx.objectStore(this._config.storeName);
            const source = query.index ? store.index(query.index) : store;
            const results = [];
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
                const record = cursor.value;
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
    async batch(operations) {
        await this._ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = this._db.transaction(this._config.storeName, "readwrite");
            const store = tx.objectStore(this._config.storeName);
            const now = Date.now();
            for (const op of operations) {
                if (op.type === "put") {
                    const record = {
                        id: op.id,
                        data: op.data,
                        metadata: op.options?.metadata,
                        createdAt: now,
                        updatedAt: now,
                        expiresAt: op.options?.expiresIn ? now + op.options.expiresIn : undefined
                    };
                    store.put(record);
                }
                else if (op.type === "delete") {
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
    async clear() {
        await this._ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = this._db.transaction(this._config.storeName, "readwrite");
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
    async count(query) {
        await this._ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = this._db.transaction(this._config.storeName, "readonly");
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
    onChanges(handler) {
        return this._changes.subscribe({ next: handler });
    }
    /**
     * Subscribe to state changes
     */
    onState(handler) {
        return this._state.subscribe({ next: handler });
    }
    /**
     * Cleanup expired records
     */
    async cleanupExpired() {
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
    async _ensureOpen() {
        if (!this._db)
            await this.open();
    }
    _startCleanupTimer() {
        this._cleanupTimer = setInterval(() => {
            this.cleanupExpired().catch(console.error);
        }, this._config.cleanupInterval);
    }
    get isOpen() { return this._db !== null; }
    get state() { return this._state; }
    get changes() { return this._changes; }
}
export class MessageQueueStorage extends TransferableStorage {
    constructor(dbName = "uniform-message-queue") {
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
    async enqueue(message) {
        const now = Date.now();
        const id = UUIDv4();
        const queuedMessage = {
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
    async dequeue(channel) {
        const now = Date.now();
        const messages = await this.query({
            filter: (r) => r.data.channel === channel &&
                r.data.status === "pending" &&
                r.data.scheduledFor <= now &&
                (!r.data.expiresAt || r.data.expiresAt > now),
            limit: 1
        });
        if (messages.length === 0)
            return null;
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
    async complete(id) {
        const record = await this.get(id);
        if (!record)
            return;
        record.data.status = "completed";
        await this.put(id, record.data);
    }
    /**
     * Mark message as failed
     */
    async fail(id, error) {
        const record = await this.get(id);
        if (!record)
            return;
        if (record.data.attempts >= record.data.maxAttempts) {
            record.data.status = "failed";
        }
        else {
            record.data.status = "pending";
        }
        record.data.error = error;
        await this.put(id, record.data);
    }
    /**
     * Get pending count for channel
     */
    async getPendingCount(channel) {
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
    create: (config) => new TransferableStorage(config),
    createMessageQueue: (dbName) => new MessageQueueStorage(dbName)
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJhbnNmZXJhYmxlU3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRyYW5zZmVyYWJsZVN0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7OztHQVNHO0FBRUgsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNuQyxPQUFPLEVBQUUsY0FBYyxFQUFvQyxNQUFNLDBCQUEwQixDQUFDO0FBNkM1RiwrRUFBK0U7QUFDL0UsdUJBQXVCO0FBQ3ZCLCtFQUErRTtBQUUvRSxNQUFNLE9BQU8sbUJBQW1CO0lBQ3BCLEdBQUcsR0FBdUIsSUFBSSxDQUFDO0lBQy9CLE9BQU8sQ0FBc0M7SUFDN0MsUUFBUSxHQUFHLElBQUksY0FBYyxFQUFvQixDQUFDO0lBQ2xELE1BQU0sR0FBRyxJQUFJLGNBQWMsRUFBMkMsQ0FBQztJQUN2RSxhQUFhLEdBQTBDLElBQUksQ0FBQztJQUVwRSxZQUFZLE1BQWlDO1FBQ3pDLElBQUksQ0FBQyxPQUFPLEdBQUc7WUFDWCxTQUFTLEVBQUUsY0FBYztZQUN6QixPQUFPLEVBQUUsQ0FBQztZQUNWLE9BQU8sRUFBRSxFQUFFO1lBQ1gsb0JBQW9CLEVBQUUsSUFBSTtZQUMxQixrQkFBa0IsRUFBRSxJQUFJO1lBQ3hCLGVBQWUsRUFBRSxLQUFLO1lBQ3RCLEdBQUcsTUFBTTtTQUNaLENBQUM7SUFDTixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsSUFBSTtRQUNOLElBQUksSUFBSSxDQUFDLEdBQUc7WUFBRSxPQUFPO1FBQ3JCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTVCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDbkMsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFD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RSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxLQUFLLE9BQU8sSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxTQUFTO1NBQzNFLENBQUMsQ0FBQztRQUNILE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQztJQUMzQixDQUFDO0NBQ0o7QUFFRCwrRUFBK0U7QUFDL0UsVUFBVTtBQUNWLCtFQUErRTtBQUUvRSxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRztJQUN0QyxNQUFNLEVBQUUsQ0FBSSxNQUFpQyxFQUFFLEVBQUUsQ0FDN0MsSUFBSSxtQkFBbUIsQ0FBSSxNQUFNLENBQUM7SUFDdEMsa0JBQWtCLEVBQUUsQ0FBQyxNQUFlLEVBQUUsRUFBRSxDQUNwQyxJQUFJLG1CQUFtQixDQUFDLE1BQU0sQ0FBQztDQUN0QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUcmFuc2ZlcmFibGUgU3RvcmFnZSAtIEluZGV4ZWREQiB3aXRoIFRyYW5zZmVyYWJsZSBTdXBwb3J0XG4gKlxuICogSGlnaC1wZXJmb3JtYW5jZSBzdG9yYWdlIGxheWVyIHdpdGggc3VwcG9ydCBmb3I6XG4gKiAtIEFycmF5QnVmZmVyIGFuZCBUeXBlZEFycmF5IHN0b3JhZ2VcbiAqIC0gQXJyYXlCdWZmZXIudHJhbnNmZXIoKSBmb3IgemVyby1jb3B5IG9wZXJhdGlvbnNcbiAqIC0gU3RydWN0dXJlZCBjbG9uaW5nIGZvciBjb21wbGV4IG9iamVjdHNcbiAqIC0gVHJhbnNhY3Rpb24gYmF0Y2hpbmcgZm9yIGJ1bGsgb3BlcmF0aW9uc1xuICogLSBPYnNlcnZhYmxlIGNoYW5nZSBub3RpZmljYXRpb25zXG4gKi9cblxuaW1wb3J0IHsgVVVJRHY0IH0gZnJvbSBcImZlc3QvY29yZVwiO1xuaW1wb3J0IHsgQ2hhbm5lbFN1YmplY3QsIHR5cGUgU3Vic2NyaXB0aW9uLCB0eXBlIE9ic2VydmVyIH0gZnJvbSBcIi4uL29ic2VydmFibGUvT2JzZXJ2YWJsZVwiO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUWVBFU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgaW50ZXJmYWNlIFRyYW5zZmVyYWJsZVJlY29yZDxUID0gYW55PiB7XG4gICAgaWQ6IHN0cmluZztcbiAgICBkYXRhOiBUO1xuICAgIGJ1ZmZlcnM/OiBBcnJheUJ1ZmZlcltdO1xuICAgIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55PjtcbiAgICBjcmVhdGVkQXQ6IG51bWJlcjtcbiAgICB1cGRhdGVkQXQ6IG51bWJlcjtcbiAgICBleHBpcmVzQXQ/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHJhbnNmZXJhYmxlUXVlcnk8VCA9IGFueT4ge1xuICAgIGluZGV4Pzogc3RyaW5nO1xuICAgIHJhbmdlPzogSURCS2V5UmFuZ2U7XG4gICAgZGlyZWN0aW9uPzogSURCQ3Vyc29yRGlyZWN0aW9uO1xuICAgIGxpbWl0PzogbnVtYmVyO1xuICAgIG9mZnNldD86IG51bWJlcjtcbiAgICBmaWx0ZXI/OiAocmVjb3JkOiBUcmFuc2ZlcmFibGVSZWNvcmQ8VD4pID0+IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHJhbnNmZXJhYmxlU3RvcmFnZUNvbmZpZyB7XG4gICAgZGJOYW1lOiBzdHJpbmc7XG4gICAgc3RvcmVOYW1lPzogc3RyaW5nO1xuICAgIHZlcnNpb24/OiBudW1iZXI7XG4gICAgaW5kZXhlcz86IEFycmF5PHsgbmFtZTogc3RyaW5nOyBrZXlQYXRoOiBzdHJpbmcgfCBzdHJpbmdbXTsgdW5pcXVlPzogYm9vbGVhbiB9PjtcbiAgICBlbmFibGVDaGFuZ2VUcmFja2luZz86IGJvb2xlYW47XG4gICAgYXV0b0NsZWFudXBFeHBpcmVkPzogYm9vbGVhbjtcbiAgICBjbGVhbnVwSW50ZXJ2YWw/OiBudW1iZXI7XG59XG5cbmV4cG9ydCB0eXBlIENoYW5nZVR5cGUgPSBcImFkZFwiIHwgXCJwdXRcIiB8IFwiZGVsZXRlXCIgfCBcImNsZWFyXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RvcmFnZUNoYW5nZTxUID0gYW55PiB7XG4gICAgdHlwZTogQ2hhbmdlVHlwZTtcbiAgICBrZXk6IHN0cmluZztcbiAgICByZWNvcmQ/OiBUcmFuc2ZlcmFibGVSZWNvcmQ8VD47XG4gICAgcHJldmlvdXNSZWNvcmQ/OiBUcmFuc2ZlcmFibGVSZWNvcmQ8VD47XG4gICAgdGltZXN0YW1wOiBudW1iZXI7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFRSQU5TRkVSQUJMRSBTVE9SQUdFXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjbGFzcyBUcmFuc2ZlcmFibGVTdG9yYWdlPFQgPSBhbnk+IHtcbiAgICBwcml2YXRlIF9kYjogSURCRGF0YWJhc2UgfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIF9jb25maWc6IFJlcXVpcmVkPFRyYW5zZmVyYWJsZVN0b3JhZ2VDb25maWc+O1xuICAgIHByaXZhdGUgX2NoYW5nZXMgPSBuZXcgQ2hhbm5lbFN1YmplY3Q8U3RvcmFnZUNoYW5nZTxUPj4oKTtcbiAgICBwcml2YXRlIF9zdGF0ZSA9IG5ldyBDaGFubmVsU3ViamVjdDxcImNsb3NlZFwiIHwgXCJvcGVuaW5nXCIgfCBcIm9wZW5cIiB8IFwiZXJyb3JcIj4oKTtcbiAgICBwcml2YXRlIF9jbGVhbnVwVGltZXI6IFJldHVyblR5cGU8dHlwZW9mIHNldEludGVydmFsPiB8IG51bGwgPSBudWxsO1xuXG4gICAgY29uc3RydWN0b3IoY29uZmlnOiBUcmFuc2ZlcmFibGVTdG9yYWdlQ29uZmlnKSB7XG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IHtcbiAgICAgICAgICAgIHN0b3JlTmFtZTogXCJ0cmFuc2ZlcmFibGVcIixcbiAgICAgICAgICAgIHZlcnNpb246IDEsXG4gICAgICAgICAgICBpbmRleGVzOiBbXSxcbiAgICAgICAgICAgIGVuYWJsZUNoYW5nZVRyYWNraW5nOiB0cnVlLFxuICAgICAgICAgICAgYXV0b0NsZWFudXBFeHBpcmVkOiB0cnVlLFxuICAgICAgICAgICAgY2xlYW51cEludGVydmFsOiA2MDAwMCxcbiAgICAgICAgICAgIC4uLmNvbmZpZ1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE9wZW4gZGF0YWJhc2UgY29ubmVjdGlvblxuICAgICAqL1xuICAgIGFzeW5jIG9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0aGlzLl9kYikgcmV0dXJuO1xuICAgICAgICB0aGlzLl9zdGF0ZS5uZXh0KFwib3BlbmluZ1wiKTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVxdWVzdCA9IGluZGV4ZWREQi5vcGVuKHRoaXMuX2NvbmZpZy5kYk5hbWUsIHRoaXMuX2NvbmZpZy52ZXJzaW9uKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRlLm5leHQoXCJlcnJvclwiKTtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBGYWlsZWQgdG8gb3BlbiBkYXRhYmFzZTogJHtyZXF1ZXN0LmVycm9yPy5tZXNzYWdlfWApKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX2RiID0gcmVxdWVzdC5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGUubmV4dChcIm9wZW5cIik7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fY29uZmlnLmF1dG9DbGVhbnVwRXhwaXJlZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zdGFydENsZWFudXBUaW1lcigpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGIgPSAoZXZlbnQudGFyZ2V0IGFzIElEQk9wZW5EQlJlcXVlc3QpLnJlc3VsdDtcblxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBzdG9yZSBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICBpZiAoIWRiLm9iamVjdFN0b3JlTmFtZXMuY29udGFpbnModGhpcy5fY29uZmlnLnN0b3JlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RvcmUgPSBkYi5jcmVhdGVPYmplY3RTdG9yZSh0aGlzLl9jb25maWcuc3RvcmVOYW1lLCB7IGtleVBhdGg6IFwiaWRcIiB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgaW5kZXhlc1xuICAgICAgICAgICAgICAgICAgICBzdG9yZS5jcmVhdGVJbmRleChcImNyZWF0ZWRBdFwiLCBcImNyZWF0ZWRBdFwiKTtcbiAgICAgICAgICAgICAgICAgICAgc3RvcmUuY3JlYXRlSW5kZXgoXCJ1cGRhdGVkQXRcIiwgXCJ1cGRhdGVkQXRcIik7XG4gICAgICAgICAgICAgICAgICAgIHN0b3JlLmNyZWF0ZUluZGV4KFwiZXhwaXJlc0F0XCIsIFwiZXhwaXJlc0F0XCIpO1xuXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaWR4IG9mIHRoaXMuX2NvbmZpZy5pbmRleGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5jcmVhdGVJbmRleChpZHgubmFtZSwgaWR4LmtleVBhdGgsIHsgdW5pcXVlOiBpZHgudW5pcXVlID8/IGZhbHNlIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2xvc2UgZGF0YWJhc2UgY29ubmVjdGlvblxuICAgICAqL1xuICAgIGNsb3NlKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fY2xlYW51cFRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMuX2NsZWFudXBUaW1lcik7XG4gICAgICAgICAgICB0aGlzLl9jbGVhbnVwVGltZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2RiPy5jbG9zZSgpO1xuICAgICAgICB0aGlzLl9kYiA9IG51bGw7XG4gICAgICAgIHRoaXMuX3N0YXRlLm5leHQoXCJjbG9zZWRcIik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3RvcmUgZGF0YSB3aXRoIG9wdGlvbmFsIEFycmF5QnVmZmVyIHRyYW5zZmVyXG4gICAgICovXG4gICAgYXN5bmMgcHV0KFxuICAgICAgICBpZDogc3RyaW5nLFxuICAgICAgICBkYXRhOiBULFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBidWZmZXJzPzogQXJyYXlCdWZmZXJbXTtcbiAgICAgICAgICAgIHRyYW5zZmVyPzogYm9vbGVhbjtcbiAgICAgICAgICAgIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55PjtcbiAgICAgICAgICAgIGV4cGlyZXNJbj86IG51bWJlcjtcbiAgICAgICAgfSA9IHt9XG4gICAgKTogUHJvbWlzZTxUcmFuc2ZlcmFibGVSZWNvcmQ8VD4+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5fZW5zdXJlT3BlbigpO1xuXG4gICAgICAgIGxldCBidWZmZXJzID0gb3B0aW9ucy5idWZmZXJzID8/IFtdO1xuXG4gICAgICAgIC8vIFVzZSBBcnJheUJ1ZmZlci50cmFuc2ZlcigpIGlmIGF2YWlsYWJsZSBhbmQgcmVxdWVzdGVkIChFUzIwMjQrKVxuICAgICAgICBpZiAob3B0aW9ucy50cmFuc2ZlciAmJiBidWZmZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGJ1ZmZlcnMgPSBidWZmZXJzLm1hcChidWYgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgLSBNb2Rlcm4gQVBJIChFUzIwMjQpXG4gICAgICAgICAgICAgICAgaWYgKFwidHJhbnNmZXJcIiBpbiBidWYgJiYgdHlwZW9mIGJ1Zi50cmFuc2ZlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJ1Zi50cmFuc2ZlcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYnVmO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IHRoaXMuZ2V0KGlkKTtcblxuICAgICAgICBjb25zdCByZWNvcmQ6IFRyYW5zZmVyYWJsZVJlY29yZDxUPiA9IHtcbiAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgZGF0YSxcbiAgICAgICAgICAgIGJ1ZmZlcnM6IGJ1ZmZlcnMubGVuZ3RoID4gMCA/IGJ1ZmZlcnMgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBtZXRhZGF0YTogb3B0aW9ucy5tZXRhZGF0YSxcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogZXhpc3Rpbmc/LmNyZWF0ZWRBdCA/PyBub3csXG4gICAgICAgICAgICB1cGRhdGVkQXQ6IG5vdyxcbiAgICAgICAgICAgIGV4cGlyZXNBdDogb3B0aW9ucy5leHBpcmVzSW4gPyBub3cgKyBvcHRpb25zLmV4cGlyZXNJbiA6IHVuZGVmaW5lZFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0eCA9IHRoaXMuX2RiIS50cmFuc2FjdGlvbih0aGlzLl9jb25maWcuc3RvcmVOYW1lLCBcInJlYWR3cml0ZVwiKTtcbiAgICAgICAgICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUodGhpcy5fY29uZmlnLnN0b3JlTmFtZSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSBzdG9yZS5wdXQocmVjb3JkKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2NvbmZpZy5lbmFibGVDaGFuZ2VUcmFja2luZykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jaGFuZ2VzLm5leHQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogZXhpc3RpbmcgPyBcInB1dFwiIDogXCJhZGRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleTogaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNvcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c1JlY29yZDogZXhpc3RpbmcgPz8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBub3dcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUocmVjb3JkKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHJlamVjdChuZXcgRXJyb3IoYFB1dCBmYWlsZWQ6ICR7cmVxdWVzdC5lcnJvcj8ubWVzc2FnZX1gKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN0b3JlIEFycmF5QnVmZmVyIGRpcmVjdGx5IHdpdGggemVyby1jb3B5IHNlbWFudGljc1xuICAgICAqL1xuICAgIGFzeW5jIHB1dEJ1ZmZlcihcbiAgICAgICAgaWQ6IHN0cmluZyxcbiAgICAgICAgYnVmZmVyOiBBcnJheUJ1ZmZlcixcbiAgICAgICAgb3B0aW9uczogeyB0cmFuc2Zlcj86IGJvb2xlYW47IG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55PjsgZXhwaXJlc0luPzogbnVtYmVyIH0gPSB7fVxuICAgICk6IFByb21pc2U8VHJhbnNmZXJhYmxlUmVjb3JkPEFycmF5QnVmZmVyPj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5wdXQoaWQsIGJ1ZmZlciBhcyBhbnksIHsgYnVmZmVyczogW2J1ZmZlcl0sIC4uLm9wdGlvbnMgfSkgYXMgUHJvbWlzZTxUcmFuc2ZlcmFibGVSZWNvcmQ8QXJyYXlCdWZmZXI+PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdG9yZSBUeXBlZEFycmF5XG4gICAgICovXG4gICAgYXN5bmMgcHV0VHlwZWRBcnJheTxBIGV4dGVuZHMgQXJyYXlCdWZmZXJWaWV3PihcbiAgICAgICAgaWQ6IHN0cmluZyxcbiAgICAgICAgYXJyYXk6IEEsXG4gICAgICAgIG9wdGlvbnM6IHsgdHJhbnNmZXI/OiBib29sZWFuOyBtZXRhZGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT47IGV4cGlyZXNJbj86IG51bWJlciB9ID0ge31cbiAgICApOiBQcm9taXNlPFRyYW5zZmVyYWJsZVJlY29yZDx7IHR5cGU6IHN0cmluZzsgZGF0YTogbnVtYmVyW10gfT4+IHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgICAgIHR5cGU6IGFycmF5LmNvbnN0cnVjdG9yLm5hbWUsXG4gICAgICAgICAgICBkYXRhOiBBcnJheS5mcm9tKGFycmF5IGFzIGFueSlcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gdGhpcy5wdXQoaWQsIGRhdGEgYXMgYW55LCB7XG4gICAgICAgICAgICBidWZmZXJzOiBvcHRpb25zLnRyYW5zZmVyID8gW2FycmF5LmJ1ZmZlcl0gOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAuLi5vcHRpb25zXG4gICAgICAgIH0pIGFzIFByb21pc2U8VHJhbnNmZXJhYmxlUmVjb3JkPHsgdHlwZTogc3RyaW5nOyBkYXRhOiBudW1iZXJbXSB9Pj47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBieSBJRFxuICAgICAqL1xuICAgIGFzeW5jIGdldChpZDogc3RyaW5nKTogUHJvbWlzZTxUcmFuc2ZlcmFibGVSZWNvcmQ8VD4gfCBudWxsPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX2Vuc3VyZU9wZW4oKTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHggPSB0aGlzLl9kYiEudHJhbnNhY3Rpb24odGhpcy5fY29uZmlnLnN0b3JlTmFtZSwgXCJyZWFkb25seVwiKTtcbiAgICAgICAgICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUodGhpcy5fY29uZmlnLnN0b3JlTmFtZSk7XG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0ID0gc3RvcmUuZ2V0KGlkKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkID0gcmVxdWVzdC5yZXN1bHQgYXMgVHJhbnNmZXJhYmxlUmVjb3JkPFQ+IHwgdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZXhwaXJhdGlvblxuICAgICAgICAgICAgICAgIGlmIChyZWNvcmQ/LmV4cGlyZXNBdCAmJiByZWNvcmQuZXhwaXJlc0F0IDwgRGF0ZS5ub3coKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZShpZCk7IC8vIEFzeW5jIGNsZWFudXBcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShudWxsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlY29yZCA/PyBudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QobmV3IEVycm9yKGBHZXQgZmFpbGVkOiAke3JlcXVlc3QuZXJyb3I/Lm1lc3NhZ2V9YCkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgQXJyYXlCdWZmZXIgYW5kIG9wdGlvbmFsbHkgdHJhbnNmZXIgb3duZXJzaGlwXG4gICAgICovXG4gICAgYXN5bmMgZ2V0QnVmZmVyKGlkOiBzdHJpbmcsIHRyYW5zZmVyPzogYm9vbGVhbik6IFByb21pc2U8QXJyYXlCdWZmZXIgfCBudWxsPiB7XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IGF3YWl0IHRoaXMuZ2V0KGlkKTtcbiAgICAgICAgaWYgKCFyZWNvcmQpIHJldHVybiBudWxsO1xuXG4gICAgICAgIGxldCBidWZmZXIgPSByZWNvcmQuYnVmZmVycz8uWzBdID8/IChyZWNvcmQuZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyID8gcmVjb3JkLmRhdGEgOiBudWxsKTtcblxuICAgICAgICBpZiAoYnVmZmVyICYmIHRyYW5zZmVyKSB7XG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIC0gTW9kZXJuIEFQSVxuICAgICAgICAgICAgaWYgKFwidHJhbnNmZXJcIiBpbiBidWZmZXIgJiYgdHlwZW9mIGJ1ZmZlci50cmFuc2ZlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgIGJ1ZmZlciA9IGJ1ZmZlci50cmFuc2ZlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWNvbnN0cnVjdCBUeXBlZEFycmF5IGZyb20gc3RvcmVkIGRhdGFcbiAgICAgKi9cbiAgICBhc3luYyBnZXRUeXBlZEFycmF5PEEgZXh0ZW5kcyBBcnJheUJ1ZmZlclZpZXc+KGlkOiBzdHJpbmcpOiBQcm9taXNlPEEgfCBudWxsPiB7XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IGF3YWl0IHRoaXMuZ2V0KGlkKTtcbiAgICAgICAgaWYgKCFyZWNvcmQgfHwgIXJlY29yZC5kYXRhIHx8IHR5cGVvZiByZWNvcmQuZGF0YSAhPT0gXCJvYmplY3RcIikgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgY29uc3QgeyB0eXBlLCBkYXRhIH0gPSByZWNvcmQuZGF0YSBhcyB7IHR5cGU6IHN0cmluZzsgZGF0YTogbnVtYmVyW10gfTtcbiAgICAgICAgY29uc3QgVHlwZWRBcnJheUN0b3IgPSAoZ2xvYmFsVGhpcyBhcyBhbnkpW3R5cGVdO1xuXG4gICAgICAgIGlmICghVHlwZWRBcnJheUN0b3IpIHJldHVybiBudWxsO1xuICAgICAgICByZXR1cm4gbmV3IFR5cGVkQXJyYXlDdG9yKGRhdGEpIGFzIEE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJlY29yZFxuICAgICAqL1xuICAgIGFzeW5jIGRlbGV0ZShpZDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX2Vuc3VyZU9wZW4oKTtcblxuICAgICAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuX2NvbmZpZy5lbmFibGVDaGFuZ2VUcmFja2luZyA/IGF3YWl0IHRoaXMuZ2V0KGlkKSA6IG51bGw7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gdGhpcy5fZGIhLnRyYW5zYWN0aW9uKHRoaXMuX2NvbmZpZy5zdG9yZU5hbWUsIFwicmVhZHdyaXRlXCIpO1xuICAgICAgICAgICAgY29uc3Qgc3RvcmUgPSB0eC5vYmplY3RTdG9yZSh0aGlzLl9jb25maWcuc3RvcmVOYW1lKTtcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSBzdG9yZS5kZWxldGUoaWQpO1xuXG4gICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fY29uZmlnLmVuYWJsZUNoYW5nZVRyYWNraW5nICYmIGV4aXN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2NoYW5nZXMubmV4dCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImRlbGV0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiBpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZpb3VzUmVjb3JkOiBleGlzdGluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHJlamVjdChuZXcgRXJyb3IoYERlbGV0ZSBmYWlsZWQ6ICR7cmVxdWVzdC5lcnJvcj8ubWVzc2FnZX1gKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFF1ZXJ5IHJlY29yZHMgd2l0aCBjdXJzb3JcbiAgICAgKi9cbiAgICBhc3luYyBxdWVyeShxdWVyeTogVHJhbnNmZXJhYmxlUXVlcnk8VD4gPSB7fSk6IFByb21pc2U8VHJhbnNmZXJhYmxlUmVjb3JkPFQ+W10+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5fZW5zdXJlT3BlbigpO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0eCA9IHRoaXMuX2RiIS50cmFuc2FjdGlvbih0aGlzLl9jb25maWcuc3RvcmVOYW1lLCBcInJlYWRvbmx5XCIpO1xuICAgICAgICAgICAgY29uc3Qgc3RvcmUgPSB0eC5vYmplY3RTdG9yZSh0aGlzLl9jb25maWcuc3RvcmVOYW1lKTtcbiAgICAgICAgICAgIGNvbnN0IHNvdXJjZSA9IHF1ZXJ5LmluZGV4ID8gc3RvcmUuaW5kZXgocXVlcnkuaW5kZXgpIDogc3RvcmU7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdHM6IFRyYW5zZmVyYWJsZVJlY29yZDxUPltdID0gW107XG4gICAgICAgICAgICBsZXQgc2tpcHBlZCA9IDA7XG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSBxdWVyeS5vZmZzZXQgPz8gMDtcbiAgICAgICAgICAgIGNvbnN0IGxpbWl0ID0gcXVlcnkubGltaXQgPz8gSW5maW5pdHk7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSBzb3VyY2Uub3BlbkN1cnNvcihxdWVyeS5yYW5nZSwgcXVlcnkuZGlyZWN0aW9uKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3Vyc29yID0gcmVxdWVzdC5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgaWYgKCFjdXJzb3IgfHwgcmVzdWx0cy5sZW5ndGggPj0gbGltaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHRzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZCA9IGN1cnNvci52YWx1ZSBhcyBUcmFuc2ZlcmFibGVSZWNvcmQ8VD47XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBleHBpcmF0aW9uXG4gICAgICAgICAgICAgICAgaWYgKHJlY29yZC5leHBpcmVzQXQgJiYgcmVjb3JkLmV4cGlyZXNBdCA8IERhdGUubm93KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLmNvbnRpbnVlKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBcHBseSBmaWx0ZXJcbiAgICAgICAgICAgICAgICBpZiAocXVlcnkuZmlsdGVyICYmICFxdWVyeS5maWx0ZXIocmVjb3JkKSkge1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3IuY29udGludWUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBvZmZzZXRcbiAgICAgICAgICAgICAgICBpZiAoc2tpcHBlZCA8IG9mZnNldCkge1xuICAgICAgICAgICAgICAgICAgICBza2lwcGVkKys7XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHJlY29yZCk7XG4gICAgICAgICAgICAgICAgY3Vyc29yLmNvbnRpbnVlKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QobmV3IEVycm9yKGBRdWVyeSBmYWlsZWQ6ICR7cmVxdWVzdC5lcnJvcj8ubWVzc2FnZX1gKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJhdGNoIG9wZXJhdGlvbnMgaW4gc2luZ2xlIHRyYW5zYWN0aW9uXG4gICAgICovXG4gICAgYXN5bmMgYmF0Y2goXG4gICAgICAgIG9wZXJhdGlvbnM6IEFycmF5PFxuICAgICAgICAgICAgfCB7IHR5cGU6IFwicHV0XCI7IGlkOiBzdHJpbmc7IGRhdGE6IFQ7IG9wdGlvbnM/OiBhbnkgfVxuICAgICAgICAgICAgfCB7IHR5cGU6IFwiZGVsZXRlXCI7IGlkOiBzdHJpbmcgfVxuICAgICAgICA+XG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX2Vuc3VyZU9wZW4oKTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHggPSB0aGlzLl9kYiEudHJhbnNhY3Rpb24odGhpcy5fY29uZmlnLnN0b3JlTmFtZSwgXCJyZWFkd3JpdGVcIik7XG4gICAgICAgICAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKHRoaXMuX2NvbmZpZy5zdG9yZU5hbWUpO1xuICAgICAgICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBvcCBvZiBvcGVyYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wLnR5cGUgPT09IFwicHV0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkOiBUcmFuc2ZlcmFibGVSZWNvcmQ8VD4gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogb3AuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBvcC5kYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0YWRhdGE6IG9wLm9wdGlvbnM/Lm1ldGFkYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlZEF0OiBub3csXG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVkQXQ6IG5vdyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cGlyZXNBdDogb3Aub3B0aW9ucz8uZXhwaXJlc0luID8gbm93ICsgb3Aub3B0aW9ucy5leHBpcmVzSW4gOiB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgc3RvcmUucHV0KHJlY29yZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvcC50eXBlID09PSBcImRlbGV0ZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b3JlLmRlbGV0ZShvcC5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0eC5vbmNvbXBsZXRlID0gKCkgPT4gcmVzb2x2ZSgpO1xuICAgICAgICAgICAgdHgub25lcnJvciA9ICgpID0+IHJlamVjdChuZXcgRXJyb3IoYEJhdGNoIGZhaWxlZDogJHt0eC5lcnJvcj8ubWVzc2FnZX1gKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENsZWFyIGFsbCByZWNvcmRzXG4gICAgICovXG4gICAgYXN5bmMgY2xlYXIoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX2Vuc3VyZU9wZW4oKTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHggPSB0aGlzLl9kYiEudHJhbnNhY3Rpb24odGhpcy5fY29uZmlnLnN0b3JlTmFtZSwgXCJyZWFkd3JpdGVcIik7XG4gICAgICAgICAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKHRoaXMuX2NvbmZpZy5zdG9yZU5hbWUpO1xuICAgICAgICAgICAgY29uc3QgcmVxdWVzdCA9IHN0b3JlLmNsZWFyKCk7XG5cbiAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jb25maWcuZW5hYmxlQ2hhbmdlVHJhY2tpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2hhbmdlcy5uZXh0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiY2xlYXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleTogXCIqXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHJlamVjdChuZXcgRXJyb3IoYENsZWFyIGZhaWxlZDogJHtyZXF1ZXN0LmVycm9yPy5tZXNzYWdlfWApKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ291bnQgcmVjb3Jkc1xuICAgICAqL1xuICAgIGFzeW5jIGNvdW50KHF1ZXJ5PzogeyBpbmRleD86IHN0cmluZzsgcmFuZ2U/OiBJREJLZXlSYW5nZSB9KTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5fZW5zdXJlT3BlbigpO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0eCA9IHRoaXMuX2RiIS50cmFuc2FjdGlvbih0aGlzLl9jb25maWcuc3RvcmVOYW1lLCBcInJlYWRvbmx5XCIpO1xuICAgICAgICAgICAgY29uc3Qgc3RvcmUgPSB0eC5vYmplY3RTdG9yZSh0aGlzLl9jb25maWcuc3RvcmVOYW1lKTtcbiAgICAgICAgICAgIGNvbnN0IHNvdXJjZSA9IHF1ZXJ5Py5pbmRleCA/IHN0b3JlLmluZGV4KHF1ZXJ5LmluZGV4KSA6IHN0b3JlO1xuICAgICAgICAgICAgY29uc3QgcmVxdWVzdCA9IHNvdXJjZS5jb3VudChxdWVyeT8ucmFuZ2UpO1xuXG4gICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHJlc29sdmUocmVxdWVzdC5yZXN1bHQpO1xuICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4gcmVqZWN0KG5ldyBFcnJvcihgQ291bnQgZmFpbGVkOiAke3JlcXVlc3QuZXJyb3I/Lm1lc3NhZ2V9YCkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gY2hhbmdlc1xuICAgICAqL1xuICAgIG9uQ2hhbmdlcyhoYW5kbGVyOiAoY2hhbmdlOiBTdG9yYWdlQ2hhbmdlPFQ+KSA9PiB2b2lkKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NoYW5nZXMuc3Vic2NyaWJlKHsgbmV4dDogaGFuZGxlciB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gc3RhdGUgY2hhbmdlc1xuICAgICAqL1xuICAgIG9uU3RhdGUoaGFuZGxlcjogKHN0YXRlOiBcImNsb3NlZFwiIHwgXCJvcGVuaW5nXCIgfCBcIm9wZW5cIiB8IFwiZXJyb3JcIikgPT4gdm9pZCk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0ZS5zdWJzY3JpYmUoeyBuZXh0OiBoYW5kbGVyIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENsZWFudXAgZXhwaXJlZCByZWNvcmRzXG4gICAgICovXG4gICAgYXN5bmMgY2xlYW51cEV4cGlyZWQoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5fZW5zdXJlT3BlbigpO1xuXG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IGV4cGlyZWQgPSBhd2FpdCB0aGlzLnF1ZXJ5KHtcbiAgICAgICAgICAgIGluZGV4OiBcImV4cGlyZXNBdFwiLFxuICAgICAgICAgICAgcmFuZ2U6IElEQktleVJhbmdlLnVwcGVyQm91bmQobm93KVxuICAgICAgICB9KTtcblxuICAgICAgICBmb3IgKGNvbnN0IHJlY29yZCBvZiBleHBpcmVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRlbGV0ZShyZWNvcmQuaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cGlyZWQubGVuZ3RoO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFBSSVZBVEVcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIHByaXZhdGUgYXN5bmMgX2Vuc3VyZU9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICghdGhpcy5fZGIpIGF3YWl0IHRoaXMub3BlbigpO1xuICAgIH1cblxuICAgIHByaXZhdGUgX3N0YXJ0Q2xlYW51cFRpbWVyKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9jbGVhbnVwVGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNsZWFudXBFeHBpcmVkKCkuY2F0Y2goY29uc29sZS5lcnJvcik7XG4gICAgICAgIH0sIHRoaXMuX2NvbmZpZy5jbGVhbnVwSW50ZXJ2YWwpO1xuICAgIH1cblxuICAgIGdldCBpc09wZW4oKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLl9kYiAhPT0gbnVsbDsgfVxuICAgIGdldCBzdGF0ZSgpIHsgcmV0dXJuIHRoaXMuX3N0YXRlOyB9XG4gICAgZ2V0IGNoYW5nZXMoKSB7IHJldHVybiB0aGlzLl9jaGFuZ2VzOyB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE1FU1NBR0UgUVVFVUUgU1RPUkFHRVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgaW50ZXJmYWNlIFF1ZXVlZE1lc3NhZ2U8VCA9IGFueT4ge1xuICAgIGlkOiBzdHJpbmc7XG4gICAgY2hhbm5lbDogc3RyaW5nO1xuICAgIHNlbmRlcjogc3RyaW5nO1xuICAgIHR5cGU6IHN0cmluZztcbiAgICBwYXlsb2FkOiBUO1xuICAgIHByaW9yaXR5OiBudW1iZXI7XG4gICAgYXR0ZW1wdHM6IG51bWJlcjtcbiAgICBtYXhBdHRlbXB0czogbnVtYmVyO1xuICAgIHN0YXR1czogXCJwZW5kaW5nXCIgfCBcInByb2Nlc3NpbmdcIiB8IFwiY29tcGxldGVkXCIgfCBcImZhaWxlZFwiIHwgXCJleHBpcmVkXCI7XG4gICAgY3JlYXRlZEF0OiBudW1iZXI7XG4gICAgc2NoZWR1bGVkRm9yOiBudW1iZXI7XG4gICAgZXhwaXJlc0F0PzogbnVtYmVyO1xuICAgIGxhc3RBdHRlbXB0QXQ/OiBudW1iZXI7XG4gICAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBNZXNzYWdlUXVldWVTdG9yYWdlIGV4dGVuZHMgVHJhbnNmZXJhYmxlU3RvcmFnZTxRdWV1ZWRNZXNzYWdlPiB7XG4gICAgY29uc3RydWN0b3IoZGJOYW1lOiBzdHJpbmcgPSBcInVuaWZvcm0tbWVzc2FnZS1xdWV1ZVwiKSB7XG4gICAgICAgIHN1cGVyKHtcbiAgICAgICAgICAgIGRiTmFtZSxcbiAgICAgICAgICAgIHN0b3JlTmFtZTogXCJtZXNzYWdlc1wiLFxuICAgICAgICAgICAgaW5kZXhlczogW1xuICAgICAgICAgICAgICAgIHsgbmFtZTogXCJjaGFubmVsXCIsIGtleVBhdGg6IFwiY2hhbm5lbFwiIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiBcInN0YXR1c1wiLCBrZXlQYXRoOiBcInN0YXR1c1wiIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiBcInByaW9yaXR5XCIsIGtleVBhdGg6IFwicHJpb3JpdHlcIiB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogXCJzY2hlZHVsZWRGb3JcIiwga2V5UGF0aDogXCJzY2hlZHVsZWRGb3JcIiB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogXCJjaGFubmVsLXN0YXR1c1wiLCBrZXlQYXRoOiBbXCJjaGFubmVsXCIsIFwic3RhdHVzXCJdIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRW5xdWV1ZSBhIG1lc3NhZ2VcbiAgICAgKi9cbiAgICBhc3luYyBlbnF1ZXVlKG1lc3NhZ2U6IHtcbiAgICAgICAgY2hhbm5lbDogc3RyaW5nO1xuICAgICAgICBzZW5kZXI6IHN0cmluZztcbiAgICAgICAgdHlwZTogc3RyaW5nO1xuICAgICAgICBwYXlsb2FkOiBhbnk7XG4gICAgICAgIHByaW9yaXR5PzogbnVtYmVyO1xuICAgICAgICBkZWxheT86IG51bWJlcjtcbiAgICAgICAgZXhwaXJlc0luPzogbnVtYmVyO1xuICAgICAgICBtYXhBdHRlbXB0cz86IG51bWJlcjtcbiAgICB9KTogUHJvbWlzZTxRdWV1ZWRNZXNzYWdlPiB7XG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IGlkID0gVVVJRHY0KCk7XG5cbiAgICAgICAgY29uc3QgcXVldWVkTWVzc2FnZTogUXVldWVkTWVzc2FnZSA9IHtcbiAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgY2hhbm5lbDogbWVzc2FnZS5jaGFubmVsLFxuICAgICAgICAgICAgc2VuZGVyOiBtZXNzYWdlLnNlbmRlcixcbiAgICAgICAgICAgIHR5cGU6IG1lc3NhZ2UudHlwZSxcbiAgICAgICAgICAgIHBheWxvYWQ6IG1lc3NhZ2UucGF5bG9hZCxcbiAgICAgICAgICAgIHByaW9yaXR5OiBtZXNzYWdlLnByaW9yaXR5ID8/IDAsXG4gICAgICAgICAgICBhdHRlbXB0czogMCxcbiAgICAgICAgICAgIG1heEF0dGVtcHRzOiBtZXNzYWdlLm1heEF0dGVtcHRzID8/IDMsXG4gICAgICAgICAgICBzdGF0dXM6IFwicGVuZGluZ1wiLFxuICAgICAgICAgICAgY3JlYXRlZEF0OiBub3csXG4gICAgICAgICAgICBzY2hlZHVsZWRGb3I6IG5vdyArIChtZXNzYWdlLmRlbGF5ID8/IDApLFxuICAgICAgICAgICAgZXhwaXJlc0F0OiBtZXNzYWdlLmV4cGlyZXNJbiA/IG5vdyArIG1lc3NhZ2UuZXhwaXJlc0luIDogdW5kZWZpbmVkXG4gICAgICAgIH07XG5cbiAgICAgICAgYXdhaXQgdGhpcy5wdXQoaWQsIHF1ZXVlZE1lc3NhZ2UpO1xuICAgICAgICByZXR1cm4gcXVldWVkTWVzc2FnZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZXF1ZXVlIG5leHQgbWVzc2FnZSBmb3IgY2hhbm5lbFxuICAgICAqL1xuICAgIGFzeW5jIGRlcXVldWUoY2hhbm5lbDogc3RyaW5nKTogUHJvbWlzZTxRdWV1ZWRNZXNzYWdlIHwgbnVsbD4ge1xuICAgICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuXG4gICAgICAgIGNvbnN0IG1lc3NhZ2VzID0gYXdhaXQgdGhpcy5xdWVyeSh7XG4gICAgICAgICAgICBmaWx0ZXI6IChyKSA9PlxuICAgICAgICAgICAgICAgIHIuZGF0YS5jaGFubmVsID09PSBjaGFubmVsICYmXG4gICAgICAgICAgICAgICAgci5kYXRhLnN0YXR1cyA9PT0gXCJwZW5kaW5nXCIgJiZcbiAgICAgICAgICAgICAgICByLmRhdGEuc2NoZWR1bGVkRm9yIDw9IG5vdyAmJlxuICAgICAgICAgICAgICAgICghci5kYXRhLmV4cGlyZXNBdCB8fCByLmRhdGEuZXhwaXJlc0F0ID4gbm93KSxcbiAgICAgICAgICAgIGxpbWl0OiAxXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChtZXNzYWdlcy5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xuXG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBtZXNzYWdlc1swXS5kYXRhO1xuICAgICAgICBtZXNzYWdlLnN0YXR1cyA9IFwicHJvY2Vzc2luZ1wiO1xuICAgICAgICBtZXNzYWdlLmF0dGVtcHRzKys7XG4gICAgICAgIG1lc3NhZ2UubGFzdEF0dGVtcHRBdCA9IG5vdztcblxuICAgICAgICBhd2FpdCB0aGlzLnB1dChtZXNzYWdlLmlkLCBtZXNzYWdlKTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWFyayBtZXNzYWdlIGFzIGNvbXBsZXRlZFxuICAgICAqL1xuICAgIGFzeW5jIGNvbXBsZXRlKGlkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcmVjb3JkID0gYXdhaXQgdGhpcy5nZXQoaWQpO1xuICAgICAgICBpZiAoIXJlY29yZCkgcmV0dXJuO1xuXG4gICAgICAgIHJlY29yZC5kYXRhLnN0YXR1cyA9IFwiY29tcGxldGVkXCI7XG4gICAgICAgIGF3YWl0IHRoaXMucHV0KGlkLCByZWNvcmQuZGF0YSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWFyayBtZXNzYWdlIGFzIGZhaWxlZFxuICAgICAqL1xuICAgIGFzeW5jIGZhaWwoaWQ6IHN0cmluZywgZXJyb3I6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCByZWNvcmQgPSBhd2FpdCB0aGlzLmdldChpZCk7XG4gICAgICAgIGlmICghcmVjb3JkKSByZXR1cm47XG5cbiAgICAgICAgaWYgKHJlY29yZC5kYXRhLmF0dGVtcHRzID49IHJlY29yZC5kYXRhLm1heEF0dGVtcHRzKSB7XG4gICAgICAgICAgICByZWNvcmQuZGF0YS5zdGF0dXMgPSBcImZhaWxlZFwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVjb3JkLmRhdGEuc3RhdHVzID0gXCJwZW5kaW5nXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmVjb3JkLmRhdGEuZXJyb3IgPSBlcnJvcjtcblxuICAgICAgICBhd2FpdCB0aGlzLnB1dChpZCwgcmVjb3JkLmRhdGEpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBwZW5kaW5nIGNvdW50IGZvciBjaGFubmVsXG4gICAgICovXG4gICAgYXN5bmMgZ2V0UGVuZGluZ0NvdW50KGNoYW5uZWw6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2VzID0gYXdhaXQgdGhpcy5xdWVyeSh7XG4gICAgICAgICAgICBmaWx0ZXI6IChyKSA9PiByLmRhdGEuY2hhbm5lbCA9PT0gY2hhbm5lbCAmJiByLmRhdGEuc3RhdHVzID09PSBcInBlbmRpbmdcIlxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2VzLmxlbmd0aDtcbiAgICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZBQ1RPUllcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNvbnN0IFRyYW5zZmVyYWJsZVN0b3JhZ2VGYWN0b3J5ID0ge1xuICAgIGNyZWF0ZTogPFQ+KGNvbmZpZzogVHJhbnNmZXJhYmxlU3RvcmFnZUNvbmZpZykgPT5cbiAgICAgICAgbmV3IFRyYW5zZmVyYWJsZVN0b3JhZ2U8VD4oY29uZmlnKSxcbiAgICBjcmVhdGVNZXNzYWdlUXVldWU6IChkYk5hbWU/OiBzdHJpbmcpID0+XG4gICAgICAgIG5ldyBNZXNzYWdlUXVldWVTdG9yYWdlKGRiTmFtZSlcbn07XG4iXX0=