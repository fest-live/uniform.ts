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
import { UUIDv4 } from "fest/core";
import { ChannelSubject } from "../observable/Observable";
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
};
/**
 * IndexedDB manager for channel storage
 */
export class ChannelStorage {
    _db = null;
    _isOpen = false;
    _openPromise = null;
    _channelName;
    // Observables for real-time updates
    _messageUpdates = new ChannelSubject();
    _exchangeUpdates = new ChannelSubject();
    constructor(channelName) {
        this._channelName = channelName;
    }
    // ========================================================================
    // DATABASE LIFECYCLE
    // ========================================================================
    /**
     * Open database connection
     */
    async open() {
        if (this._db && this._isOpen)
            return this._db;
        if (this._openPromise)
            return this._openPromise;
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
                const db = event.target.result;
                this._createStores(db);
            };
        });
        return this._openPromise;
    }
    /**
     * Close database connection
     */
    close() {
        if (this._db) {
            this._db.close();
            this._db = null;
            this._isOpen = false;
        }
    }
    _createStores(db) {
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
    async defer(message, options = {}) {
        const db = await this.open();
        const storedMessage = {
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
    async getDeferredMessages(channel, options = {}) {
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
    async processNextPending(channel) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.MESSAGES, "readwrite");
            const store = tx.objectStore(STORES.MESSAGES);
            const index = store.index("channel_status");
            const request = index.openCursor(IDBKeyRange.only([channel, "pending"]));
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    const message = cursor.value;
                    message.status = "processing";
                    message.updatedAt = Date.now();
                    cursor.update(message);
                    this._messageUpdates.next(message);
                    resolve(message);
                }
                else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(new Error("Failed to process pending message"));
        });
    }
    /**
     * Mark message as delivered
     */
    async markDelivered(messageId) {
        await this._updateMessageStatus(messageId, "delivered");
    }
    /**
     * Mark message as failed and retry if possible
     */
    async markFailed(messageId) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.MESSAGES, "readwrite");
            const store = tx.objectStore(STORES.MESSAGES);
            const request = store.get(messageId);
            request.onsuccess = () => {
                const message = request.result;
                if (!message) {
                    resolve(false);
                    return;
                }
                message.retryCount++;
                message.updatedAt = Date.now();
                if (message.retryCount < message.maxRetries) {
                    message.status = "pending"; // Retry
                }
                else {
                    message.status = "failed";
                }
                store.put(message);
                this._messageUpdates.next(message);
                resolve(message.status === "pending");
            };
            request.onerror = () => reject(new Error("Failed to mark message as failed"));
        });
    }
    async _updateMessageStatus(messageId, status) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.MESSAGES, "readwrite");
            const store = tx.objectStore(STORES.MESSAGES);
            const request = store.get(messageId);
            request.onsuccess = () => {
                const message = request.result;
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
    async getMailbox(channel, options = {}) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.MAILBOX, "readonly");
            const store = tx.objectStore(STORES.MAILBOX);
            const index = store.index("channel");
            const request = index.getAll(IDBKeyRange.only(channel), options.limit);
            request.onsuccess = () => {
                let results = request.result;
                // Sort
                if (options.sortBy === "priority") {
                    results.sort((a, b) => b.priority - a.priority);
                }
                else {
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
    async getMailboxStats(channel) {
        const messages = await this.getDeferredMessages(channel);
        const stats = {
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
            }
            else {
                stats[msg.status]++;
            }
        }
        return stats;
    }
    /**
     * Clear mailbox for a channel
     */
    async clearMailbox(channel) {
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
    async registerPending(operation) {
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
    async getPendingOperations() {
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
    async completePending(operationId) {
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
    async awaitPending(operationId, options = {}) {
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
                return pending.result;
            }
            await new Promise((r) => setTimeout(r, pollInterval));
        }
        throw new Error(`Pending operation ${operationId} timed out`);
    }
    async _getPendingById(id) {
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
    async exchangePut(key, value, options = {}) {
        const db = await this.open();
        const record = {
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
                const existing = getRequest.result;
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
    async exchangeGet(key) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.EXCHANGE, "readonly");
            const store = tx.objectStore(STORES.EXCHANGE);
            const index = store.index("key");
            const request = index.get(key);
            request.onsuccess = () => {
                const record = request.result;
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
    async exchangeDelete(key) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.EXCHANGE, "readwrite");
            const store = tx.objectStore(STORES.EXCHANGE);
            const index = store.index("key");
            const getRequest = index.get(key);
            getRequest.onsuccess = () => {
                const record = getRequest.result;
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
    async exchangeLock(key, options = {}) {
        const db = await this.open();
        const timeout = options.timeout ?? 30000;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.EXCHANGE, "readwrite");
            const store = tx.objectStore(STORES.EXCHANGE);
            const index = store.index("key");
            const request = index.get(key);
            request.onsuccess = () => {
                const record = request.result;
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
    async exchangeUnlock(key) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.EXCHANGE, "readwrite");
            const store = tx.objectStore(STORES.EXCHANGE);
            const index = store.index("key");
            const request = index.get(key);
            request.onsuccess = () => {
                const record = request.result;
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
    _canAccessExchange(record) {
        if (record.owner === this._channelName)
            return true;
        if (record.sharedWith.includes("*"))
            return true;
        return record.sharedWith.includes(this._channelName);
    }
    // ========================================================================
    // TRANSACTIONS: Batch operations with rollback
    // ========================================================================
    /**
     * Begin a transaction for batch operations
     */
    async beginTransaction() {
        return new ChannelTransaction(this);
    }
    /**
     * Execute operations in transaction
     */
    async executeTransaction(operations) {
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
    onMessageUpdate(handler) {
        return this._messageUpdates.subscribe({ next: handler });
    }
    /**
     * Subscribe to exchange updates
     */
    onExchangeUpdate(handler) {
        return this._exchangeUpdates.subscribe({ next: handler });
    }
    // ========================================================================
    // CLEANUP
    // ========================================================================
    /**
     * Clean up expired messages
     */
    async cleanupExpired() {
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
                    const msg = cursor.value;
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
                    const msg = cursor.value;
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
    _storage;
    _operations = [];
    _isCommitted = false;
    _isRolledBack = false;
    constructor(_storage) {
        this._storage = _storage;
    }
    /**
     * Add put operation
     */
    put(store, value) {
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
    delete(store, key) {
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
    update(store, key, updates) {
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
    async commit() {
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
    rollback() {
        this._operations = [];
        this._isRolledBack = true;
    }
    /**
     * Get operation count
     */
    get operationCount() {
        return this._operations.length;
    }
    _checkState() {
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
const _storageInstances = new Map();
/**
 * Get storage instance for channel
 */
export function getChannelStorage(channelName) {
    if (!_storageInstances.has(channelName)) {
        _storageInstances.set(channelName, new ChannelStorage(channelName));
    }
    return _storageInstances.get(channelName);
}
/**
 * Close all storage instances
 */
export function closeAllStorage() {
    for (const storage of _storageInstances.values()) {
        storage.close();
    }
    _storageInstances.clear();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlN0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7OztHQVNHO0FBRUgsT0FBTyxFQUFFLE1BQU0sRUFBWSxNQUFNLFdBQVcsQ0FBQztBQUM3QyxPQUFPLEVBQXVCLGNBQWMsRUFBcUIsTUFBTSwwQkFBMEIsQ0FBQztBQTREbEcsK0VBQStFO0FBQy9FLHFCQUFxQjtBQUNyQiwrRUFBK0U7QUFFL0UsTUFBTSxPQUFPLEdBQUcsa0JBQWtCLENBQUM7QUFDbkMsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDO0FBRXJCLE1BQU0sTUFBTSxHQUFHO0lBQ1gsUUFBUSxFQUFFLFVBQVU7SUFDcEIsT0FBTyxFQUFFLFNBQVM7SUFDbEIsT0FBTyxFQUFFLFNBQVM7SUFDbEIsUUFBUSxFQUFFLFVBQVU7SUFDcEIsWUFBWSxFQUFFLGNBQWM7Q0FDdEIsQ0FBQztBQUVYOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGNBQWM7SUFDZixHQUFHLEdBQXVCLElBQUksQ0FBQztJQUMvQixPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQ2hCLFlBQVksR0FBZ0MsSUFBSSxDQUFDO0lBQ2pELFlBQVksQ0FBUztJQUU3QixvQ0FBb0M7SUFDNUIsZUFBZSxHQUFHLElBQUksY0FBYyxFQUFpQixDQUFDO0lBQ3RELGdCQUFnQixHQUFHLElBQUksY0FBYyxFQUFrQixDQUFDO0lBRWhFLFlBQVksV0FBbUI7UUFDM0IsSUFBSSxDQUFDLFlBQVksR0FBRyxXQUFXLENBQUM7SUFDcEMsQ0FBQztJQUVELDJFQUEyRTtJQUMzRSxxQkFBcUI7SUFDckIsMkVBQTJFO0lBRTNFOztPQUVHO0lBQ0gsS0FBSyxDQUFDLElBQUk7UUFDTixJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLE9BQU87WUFBRSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDOUMsSUFBSSxJQUFJLENBQUMsWUFBWTtZQUFFLE9BQU8s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O0lBQ0gsSUFBSSxjQUFjO1FBQ2QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQztJQUNuQyxDQUFDO0lBRU8sV0FBVztRQUNmLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUNyRCxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7SUFDTCxDQUFDO0NBQ0o7QUFFRCwrRUFBK0U7QUFDL0UsOEJBQThCO0FBQzlCLCtFQUErRTtBQUUvRSxNQUFNLGlCQUFpQixHQUFHLElBQUksR0FBRyxFQUEwQixDQUFDO0FBRTVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUFDLFdBQW1CO0lBQ2pELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztRQUN0QyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLElBQUksY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDeEUsQ0FBQztJQUNELE9BQU8saUJBQWlCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBRSxDQUFDO0FBQy9DLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxlQUFlO0lBQzNCLEtBQUssTUFBTSxPQUFPLElBQUksaUJBQWlCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztRQUMvQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDcEIsQ0FBQztJQUNELGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDO0FBQzlCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEluZGV4ZWREQiBJbnRlZ3JhdGlvbiBmb3IgQ2hhbm5lbCBTeXN0ZW1cbiAqXG4gKiBQcm92aWRlcyBwZXJzaXN0ZW50IHN0b3JhZ2UgY2FwYWJpbGl0aWVzIGZvciBjaGFubmVsIGNvbW11bmljYXRpb246XG4gKiAtIERlZmVyOiBRdWV1ZSBtZXNzYWdlcyBmb3IgbGF0ZXIgZGVsaXZlcnlcbiAqIC0gUGVuZGluZzogVHJhY2sgcGVuZGluZyBvcGVyYXRpb25zXG4gKiAtIE1haWxib3gvSW5ib3g6IFN0b3JlIG1lc3NhZ2VzIHBlciBjaGFubmVsXG4gKiAtIFRyYW5zYWN0aW9uczogQmF0Y2ggb3BlcmF0aW9ucyB3aXRoIHJvbGxiYWNrXG4gKiAtIEV4Y2hhbmdlOiBDb29yZGluYXRlIGRhdGEgYmV0d2VlbiBjb250ZXh0c1xuICovXG5cbmltcG9ydCB7IFVVSUR2NCwgUHJvbWlzZWQgfSBmcm9tIFwiZmVzdC9jb3JlXCI7XG5pbXBvcnQgeyB0eXBlIENoYW5uZWxNZXNzYWdlLCBDaGFubmVsU3ViamVjdCwgdHlwZSBTdWJzY3JpcHRpb24gfSBmcm9tIFwiLi4vb2JzZXJ2YWJsZS9PYnNlcnZhYmxlXCI7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFRZUEVTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKiBNZXNzYWdlIHN0YXR1cyBpbiBzdG9yYWdlICovXG5leHBvcnQgdHlwZSBNZXNzYWdlU3RhdHVzID0gXCJwZW5kaW5nXCIgfCBcInByb2Nlc3NpbmdcIiB8IFwiZGVsaXZlcmVkXCIgfCBcImZhaWxlZFwiIHwgXCJleHBpcmVkXCI7XG5cbi8qKiBTdG9yZWQgbWVzc2FnZSBlbnZlbG9wZSAqL1xuZXhwb3J0IGludGVyZmFjZSBTdG9yZWRNZXNzYWdlPFQgPSBhbnk+IHtcbiAgICBpZDogc3RyaW5nO1xuICAgIGNoYW5uZWw6IHN0cmluZztcbiAgICBzZW5kZXI6IHN0cmluZztcbiAgICByZWNpcGllbnQ6IHN0cmluZztcbiAgICB0eXBlOiBDaGFubmVsTWVzc2FnZVtcInR5cGVcIl07XG4gICAgcGF5bG9hZDogVDtcbiAgICBzdGF0dXM6IE1lc3NhZ2VTdGF0dXM7XG4gICAgcHJpb3JpdHk6IG51bWJlcjtcbiAgICBjcmVhdGVkQXQ6IG51bWJlcjtcbiAgICB1cGRhdGVkQXQ6IG51bWJlcjtcbiAgICBleHBpcmVzQXQ6IG51bWJlciB8IG51bGw7XG4gICAgcmV0cnlDb3VudDogbnVtYmVyO1xuICAgIG1heFJldHJpZXM6IG51bWJlcjtcbiAgICBtZXRhZGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT47XG59XG5cbi8qKiBUcmFuc2FjdGlvbiBvcGVyYXRpb24gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHJhbnNhY3Rpb25PcDxUID0gYW55PiB7XG4gICAgaWQ6IHN0cmluZztcbiAgICB0eXBlOiBcInB1dFwiIHwgXCJkZWxldGVcIiB8IFwidXBkYXRlXCI7XG4gICAgc3RvcmU6IHN0cmluZztcbiAgICBrZXk/OiBJREJWYWxpZEtleTtcbiAgICB2YWx1ZT86IFQ7XG4gICAgdGltZXN0YW1wOiBudW1iZXI7XG59XG5cbi8qKiBFeGNoYW5nZSByZWNvcmQgKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXhjaGFuZ2VSZWNvcmQ8VCA9IGFueT4ge1xuICAgIGlkOiBzdHJpbmc7XG4gICAga2V5OiBzdHJpbmc7XG4gICAgdmFsdWU6IFQ7XG4gICAgb3duZXI6IHN0cmluZztcbiAgICBzaGFyZWRXaXRoOiBzdHJpbmdbXTtcbiAgICB2ZXJzaW9uOiBudW1iZXI7XG4gICAgY3JlYXRlZEF0OiBudW1iZXI7XG4gICAgdXBkYXRlZEF0OiBudW1iZXI7XG4gICAgbG9jaz86IHsgaG9sZGVyOiBzdHJpbmc7IGFjcXVpcmVkQXQ6IG51bWJlcjsgZXhwaXJlc0F0OiBudW1iZXIgfTtcbn1cblxuLyoqIE1haWxib3ggc3RhdGlzdGljcyAqL1xuZXhwb3J0IGludGVyZmFjZSBNYWlsYm94U3RhdHMge1xuICAgIHRvdGFsOiBudW1iZXI7XG4gICAgcGVuZGluZzogbnVtYmVyO1xuICAgIHByb2Nlc3Npbmc6IG51bWJlcjtcbiAgICBkZWxpdmVyZWQ6IG51bWJlcjtcbiAgICBmYWlsZWQ6IG51bWJlcjtcbiAgICBleHBpcmVkOiBudW1iZXI7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIElOREVYRUQgREIgTUFOQUdFUlxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jb25zdCBEQl9OQU1FID0gXCJ1bmlmb3JtX2NoYW5uZWxzXCI7XG5jb25zdCBEQl9WRVJTSU9OID0gMTtcblxuY29uc3QgU1RPUkVTID0ge1xuICAgIE1FU1NBR0VTOiBcIm1lc3NhZ2VzXCIsXG4gICAgTUFJTEJPWDogXCJtYWlsYm94XCIsXG4gICAgUEVORElORzogXCJwZW5kaW5nXCIsXG4gICAgRVhDSEFOR0U6IFwiZXhjaGFuZ2VcIixcbiAgICBUUkFOU0FDVElPTlM6IFwidHJhbnNhY3Rpb25zXCJcbn0gYXMgY29uc3Q7XG5cbi8qKlxuICogSW5kZXhlZERCIG1hbmFnZXIgZm9yIGNoYW5uZWwgc3RvcmFnZVxuICovXG5leHBvcnQgY2xhc3MgQ2hhbm5lbFN0b3JhZ2Uge1xuICAgIHByaXZhdGUgX2RiOiBJREJEYXRhYmFzZSB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX2lzT3BlbiA9IGZhbHNlO1xuICAgIHByaXZhdGUgX29wZW5Qcm9taXNlOiBQcm9taXNlPElEQkRhdGFiYXNlPiB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgX2NoYW5uZWxOYW1lOiBzdHJpbmc7XG5cbiAgICAvLyBPYnNlcnZhYmxlcyBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICBwcml2YXRlIF9tZXNzYWdlVXBkYXRlcyA9IG5ldyBDaGFubmVsU3ViamVjdDxTdG9yZWRNZXNzYWdlPigpO1xuICAgIHByaXZhdGUgX2V4Y2hhbmdlVXBkYXRlcyA9IG5ldyBDaGFubmVsU3ViamVjdDxFeGNoYW5nZVJlY29yZD4oKTtcblxuICAgIGNvbnN0cnVjdG9yKGNoYW5uZWxOYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5fY2hhbm5lbE5hbWUgPSBjaGFubmVsTmFtZTtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBEQVRBQkFTRSBMSUZFQ1lDTEVcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8qKlxuICAgICAqIE9wZW4gZGF0YWJhc2UgY29ubmVjdGlvblxuICAgICAqL1xuICAgIGFzeW5jIG9wZW4oKTogUHJvbWlzZTxJREJEYXRhYmFzZT4ge1xuICAgICAgICBpZiAodGhpcy5fZGIgJiYgdGhpcy5faXNPcGVuKSByZXR1cm4gdGhpcy5fZGI7XG4gICAgICAgIGlmICh0aGlzLl9vcGVuUHJvbWlzZSkgcmV0dXJuIHRoaXMuX29wZW5Qcm9taXNlO1xuXG4gICAgICAgIHRoaXMuX29wZW5Qcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVxdWVzdCA9IGluZGV4ZWREQi5vcGVuKERCX05BTUUsIERCX1ZFUlNJT04pO1xuXG4gICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fb3BlblByb21pc2UgPSBudWxsO1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoXCJGYWlsZWQgdG8gb3BlbiBJbmRleGVkREJcIikpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZGIgPSByZXF1ZXN0LnJlc3VsdDtcbiAgICAgICAgICAgICAgICB0aGlzLl9pc09wZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuX29wZW5Qcm9taXNlID0gbnVsbDtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHRoaXMuX2RiKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGIgPSAoZXZlbnQudGFyZ2V0IGFzIElEQk9wZW5EQlJlcXVlc3QpLnJlc3VsdDtcbiAgICAgICAgICAgICAgICB0aGlzLl9jcmVhdGVTdG9yZXMoZGIpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX29wZW5Qcm9taXNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENsb3NlIGRhdGFiYXNlIGNvbm5lY3Rpb25cbiAgICAgKi9cbiAgICBjbG9zZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2RiKSB7XG4gICAgICAgICAgICB0aGlzLl9kYi5jbG9zZSgpO1xuICAgICAgICAgICAgdGhpcy5fZGIgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5faXNPcGVuID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF9jcmVhdGVTdG9yZXMoZGI6IElEQkRhdGFiYXNlKTogdm9pZCB7XG4gICAgICAgIC8vIE1lc3NhZ2VzIHN0b3JlXG4gICAgICAgIGlmICghZGIub2JqZWN0U3RvcmVOYW1lcy5jb250YWlucyhTVE9SRVMuTUVTU0FHRVMpKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlc1N0b3JlID0gZGIuY3JlYXRlT2JqZWN0U3RvcmUoU1RPUkVTLk1FU1NBR0VTLCB7IGtleVBhdGg6IFwiaWRcIiB9KTtcbiAgICAgICAgICAgIG1lc3NhZ2VzU3RvcmUuY3JlYXRlSW5kZXgoXCJjaGFubmVsXCIsIFwiY2hhbm5lbFwiLCB7IHVuaXF1ZTogZmFsc2UgfSk7XG4gICAgICAgICAgICBtZXNzYWdlc1N0b3JlLmNyZWF0ZUluZGV4KFwic3RhdHVzXCIsIFwic3RhdHVzXCIsIHsgdW5pcXVlOiBmYWxzZSB9KTtcbiAgICAgICAgICAgIG1lc3NhZ2VzU3RvcmUuY3JlYXRlSW5kZXgoXCJyZWNpcGllbnRcIiwgXCJyZWNpcGllbnRcIiwgeyB1bmlxdWU6IGZhbHNlIH0pO1xuICAgICAgICAgICAgbWVzc2FnZXNTdG9yZS5jcmVhdGVJbmRleChcImNyZWF0ZWRBdFwiLCBcImNyZWF0ZWRBdFwiLCB7IHVuaXF1ZTogZmFsc2UgfSk7XG4gICAgICAgICAgICBtZXNzYWdlc1N0b3JlLmNyZWF0ZUluZGV4KFwiY2hhbm5lbF9zdGF0dXNcIiwgW1wiY2hhbm5lbFwiLCBcInN0YXR1c1wiXSwgeyB1bmlxdWU6IGZhbHNlIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWFpbGJveCBzdG9yZSAocGVyLWNoYW5uZWwgaW5ib3gpXG4gICAgICAgIGlmICghZGIub2JqZWN0U3RvcmVOYW1lcy5jb250YWlucyhTVE9SRVMuTUFJTEJPWCkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1haWxib3hTdG9yZSA9IGRiLmNyZWF0ZU9iamVjdFN0b3JlKFNUT1JFUy5NQUlMQk9YLCB7IGtleVBhdGg6IFwiaWRcIiB9KTtcbiAgICAgICAgICAgIG1haWxib3hTdG9yZS5jcmVhdGVJbmRleChcImNoYW5uZWxcIiwgXCJjaGFubmVsXCIsIHsgdW5pcXVlOiBmYWxzZSB9KTtcbiAgICAgICAgICAgIG1haWxib3hTdG9yZS5jcmVhdGVJbmRleChcInByaW9yaXR5XCIsIFwicHJpb3JpdHlcIiwgeyB1bmlxdWU6IGZhbHNlIH0pO1xuICAgICAgICAgICAgbWFpbGJveFN0b3JlLmNyZWF0ZUluZGV4KFwiZXhwaXJlc0F0XCIsIFwiZXhwaXJlc0F0XCIsIHsgdW5pcXVlOiBmYWxzZSB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFBlbmRpbmcgb3BlcmF0aW9ucyBzdG9yZVxuICAgICAgICBpZiAoIWRiLm9iamVjdFN0b3JlTmFtZXMuY29udGFpbnMoU1RPUkVTLlBFTkRJTkcpKSB7XG4gICAgICAgICAgICBjb25zdCBwZW5kaW5nU3RvcmUgPSBkYi5jcmVhdGVPYmplY3RTdG9yZShTVE9SRVMuUEVORElORywgeyBrZXlQYXRoOiBcImlkXCIgfSk7XG4gICAgICAgICAgICBwZW5kaW5nU3RvcmUuY3JlYXRlSW5kZXgoXCJjaGFubmVsXCIsIFwiY2hhbm5lbFwiLCB7IHVuaXF1ZTogZmFsc2UgfSk7XG4gICAgICAgICAgICBwZW5kaW5nU3RvcmUuY3JlYXRlSW5kZXgoXCJjcmVhdGVkQXRcIiwgXCJjcmVhdGVkQXRcIiwgeyB1bmlxdWU6IGZhbHNlIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXhjaGFuZ2Ugc3RvcmUgKHNoYXJlZCBkYXRhKVxuICAgICAgICBpZiAoIWRiLm9iamVjdFN0b3JlTmFtZXMuY29udGFpbnMoU1RPUkVTLkVYQ0hBTkdFKSkge1xuICAgICAgICAgICAgY29uc3QgZXhjaGFuZ2VTdG9yZSA9IGRiLmNyZWF0ZU9iamVjdFN0b3JlKFNUT1JFUy5FWENIQU5HRSwgeyBrZXlQYXRoOiBcImlkXCIgfSk7XG4gICAgICAgICAgICBleGNoYW5nZVN0b3JlLmNyZWF0ZUluZGV4KFwia2V5XCIsIFwia2V5XCIsIHsgdW5pcXVlOiB0cnVlIH0pO1xuICAgICAgICAgICAgZXhjaGFuZ2VTdG9yZS5jcmVhdGVJbmRleChcIm93bmVyXCIsIFwib3duZXJcIiwgeyB1bmlxdWU6IGZhbHNlIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJhbnNhY3Rpb25zIHN0b3JlIChmb3Igcm9sbGJhY2sgc3VwcG9ydClcbiAgICAgICAgaWYgKCFkYi5vYmplY3RTdG9yZU5hbWVzLmNvbnRhaW5zKFNUT1JFUy5UUkFOU0FDVElPTlMpKSB7XG4gICAgICAgICAgICBjb25zdCB0eFN0b3JlID0gZGIuY3JlYXRlT2JqZWN0U3RvcmUoU1RPUkVTLlRSQU5TQUNUSU9OUywgeyBrZXlQYXRoOiBcImlkXCIgfSk7XG4gICAgICAgICAgICB0eFN0b3JlLmNyZWF0ZUluZGV4KFwiY3JlYXRlZEF0XCIsIFwiY3JlYXRlZEF0XCIsIHsgdW5pcXVlOiBmYWxzZSB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIERFRkVSOiBRdWV1ZSBtZXNzYWdlcyBmb3IgbGF0ZXIgZGVsaXZlcnlcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8qKlxuICAgICAqIERlZmVyIGEgbWVzc2FnZSBmb3IgbGF0ZXIgZGVsaXZlcnlcbiAgICAgKi9cbiAgICBhc3luYyBkZWZlcihcbiAgICAgICAgbWVzc2FnZTogT21pdDxDaGFubmVsTWVzc2FnZSwgXCJpZFwiIHwgXCJ0aW1lc3RhbXBcIj4sXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIHByaW9yaXR5PzogbnVtYmVyO1xuICAgICAgICAgICAgZXhwaXJlc0luPzogbnVtYmVyO1xuICAgICAgICAgICAgbWF4UmV0cmllcz86IG51bWJlcjtcbiAgICAgICAgICAgIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55PjtcbiAgICAgICAgfSA9IHt9XG4gICAgKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAgICAgY29uc3QgZGIgPSBhd2FpdCB0aGlzLm9wZW4oKTtcblxuICAgICAgICBjb25zdCBzdG9yZWRNZXNzYWdlOiBTdG9yZWRNZXNzYWdlID0ge1xuICAgICAgICAgICAgaWQ6IFVVSUR2NCgpLFxuICAgICAgICAgICAgY2hhbm5lbDogbWVzc2FnZS5jaGFubmVsLFxuICAgICAgICAgICAgc2VuZGVyOiBtZXNzYWdlLnNlbmRlciA/PyB0aGlzLl9jaGFubmVsTmFtZSxcbiAgICAgICAgICAgIHJlY2lwaWVudDogbWVzc2FnZS5jaGFubmVsLFxuICAgICAgICAgICAgdHlwZTogbWVzc2FnZS50eXBlLFxuICAgICAgICAgICAgcGF5bG9hZDogbWVzc2FnZS5wYXlsb2FkLFxuICAgICAgICAgICAgc3RhdHVzOiBcInBlbmRpbmdcIixcbiAgICAgICAgICAgIHByaW9yaXR5OiBvcHRpb25zLnByaW9yaXR5ID8/IDAsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgICAgICB1cGRhdGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgICAgICBleHBpcmVzQXQ6IG9wdGlvbnMuZXhwaXJlc0luID8gRGF0ZS5ub3coKSArIG9wdGlvbnMuZXhwaXJlc0luIDogbnVsbCxcbiAgICAgICAgICAgIHJldHJ5Q291bnQ6IDAsXG4gICAgICAgICAgICBtYXhSZXRyaWVzOiBvcHRpb25zLm1heFJldHJpZXMgPz8gMyxcbiAgICAgICAgICAgIG1ldGFkYXRhOiBvcHRpb25zLm1ldGFkYXRhXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24oW1NUT1JFUy5NRVNTQUdFUywgU1RPUkVTLk1BSUxCT1hdLCBcInJlYWR3cml0ZVwiKTtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzU3RvcmUgPSB0eC5vYmplY3RTdG9yZShTVE9SRVMuTUVTU0FHRVMpO1xuICAgICAgICAgICAgY29uc3QgbWFpbGJveFN0b3JlID0gdHgub2JqZWN0U3RvcmUoU1RPUkVTLk1BSUxCT1gpO1xuXG4gICAgICAgICAgICBtZXNzYWdlc1N0b3JlLmFkZChzdG9yZWRNZXNzYWdlKTtcbiAgICAgICAgICAgIG1haWxib3hTdG9yZS5hZGQoc3RvcmVkTWVzc2FnZSk7XG5cbiAgICAgICAgICAgIHR4Lm9uY29tcGxldGUgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbWVzc2FnZVVwZGF0ZXMubmV4dChzdG9yZWRNZXNzYWdlKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHN0b3JlZE1lc3NhZ2UuaWQpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdHgub25lcnJvciA9ICgpID0+IHJlamVjdChuZXcgRXJyb3IoXCJGYWlsZWQgdG8gZGVmZXIgbWVzc2FnZVwiKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBkZWZlcnJlZCBtZXNzYWdlcyBmb3IgYSBjaGFubmVsXG4gICAgICovXG4gICAgYXN5bmMgZ2V0RGVmZXJyZWRNZXNzYWdlcyhcbiAgICAgICAgY2hhbm5lbDogc3RyaW5nLFxuICAgICAgICBvcHRpb25zOiB7IHN0YXR1cz86IE1lc3NhZ2VTdGF0dXM7IGxpbWl0PzogbnVtYmVyOyBvZmZzZXQ/OiBudW1iZXIgfSA9IHt9XG4gICAgKTogUHJvbWlzZTxTdG9yZWRNZXNzYWdlW10+IHtcbiAgICAgICAgY29uc3QgZGIgPSBhd2FpdCB0aGlzLm9wZW4oKTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbihTVE9SRVMuTUVTU0FHRVMsIFwicmVhZG9ubHlcIik7XG4gICAgICAgICAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKFNUT1JFUy5NRVNTQUdFUyk7XG5cbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gb3B0aW9ucy5zdGF0dXNcbiAgICAgICAgICAgICAgICA/IHN0b3JlLmluZGV4KFwiY2hhbm5lbF9zdGF0dXNcIilcbiAgICAgICAgICAgICAgICA6IHN0b3JlLmluZGV4KFwiY2hhbm5lbFwiKTtcblxuICAgICAgICAgICAgY29uc3QgcXVlcnkgPSBvcHRpb25zLnN0YXR1c1xuICAgICAgICAgICAgICAgID8gSURCS2V5UmFuZ2Uub25seShbY2hhbm5lbCwgb3B0aW9ucy5zdGF0dXNdKVxuICAgICAgICAgICAgICAgIDogSURCS2V5UmFuZ2Uub25seShjaGFubmVsKTtcblxuICAgICAgICAgICAgY29uc3QgcmVxdWVzdCA9IGluZGV4LmdldEFsbChxdWVyeSwgb3B0aW9ucy5saW1pdCk7XG5cbiAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZXN1bHRzID0gcmVxdWVzdC5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMub2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMgPSByZXN1bHRzLnNsaWNlKG9wdGlvbnMub2Zmc2V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHRzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHJlamVjdChuZXcgRXJyb3IoXCJGYWlsZWQgdG8gZ2V0IGRlZmVycmVkIG1lc3NhZ2VzXCIpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBuZXh0IHBlbmRpbmcgbWVzc2FnZVxuICAgICAqL1xuICAgIGFzeW5jIHByb2Nlc3NOZXh0UGVuZGluZyhjaGFubmVsOiBzdHJpbmcpOiBQcm9taXNlPFN0b3JlZE1lc3NhZ2UgfCBudWxsPiB7XG4gICAgICAgIGNvbnN0IGRiID0gYXdhaXQgdGhpcy5vcGVuKCk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24oU1RPUkVTLk1FU1NBR0VTLCBcInJlYWR3cml0ZVwiKTtcbiAgICAgICAgICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUoU1RPUkVTLk1FU1NBR0VTKTtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gc3RvcmUuaW5kZXgoXCJjaGFubmVsX3N0YXR1c1wiKTtcblxuICAgICAgICAgICAgY29uc3QgcmVxdWVzdCA9IGluZGV4Lm9wZW5DdXJzb3IoSURCS2V5UmFuZ2Uub25seShbY2hhbm5lbCwgXCJwZW5kaW5nXCJdKSk7XG5cbiAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnNvciA9IHJlcXVlc3QucmVzdWx0O1xuICAgICAgICAgICAgICAgIGlmIChjdXJzb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGN1cnNvci52YWx1ZSBhcyBTdG9yZWRNZXNzYWdlO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnN0YXR1cyA9IFwicHJvY2Vzc2luZ1wiO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnVwZGF0ZWRBdCA9IERhdGUubm93KCk7XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci51cGRhdGUobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX21lc3NhZ2VVcGRhdGVzLm5leHQobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QobmV3IEVycm9yKFwiRmFpbGVkIHRvIHByb2Nlc3MgcGVuZGluZyBtZXNzYWdlXCIpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWFyayBtZXNzYWdlIGFzIGRlbGl2ZXJlZFxuICAgICAqL1xuICAgIGFzeW5jIG1hcmtEZWxpdmVyZWQobWVzc2FnZUlkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlTWVzc2FnZVN0YXR1cyhtZXNzYWdlSWQsIFwiZGVsaXZlcmVkXCIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1hcmsgbWVzc2FnZSBhcyBmYWlsZWQgYW5kIHJldHJ5IGlmIHBvc3NpYmxlXG4gICAgICovXG4gICAgYXN5bmMgbWFya0ZhaWxlZChtZXNzYWdlSWQ6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgICAgICBjb25zdCBkYiA9IGF3YWl0IHRoaXMub3BlbigpO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKFNUT1JFUy5NRVNTQUdFUywgXCJyZWFkd3JpdGVcIik7XG4gICAgICAgICAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKFNUT1JFUy5NRVNTQUdFUyk7XG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0ID0gc3RvcmUuZ2V0KG1lc3NhZ2VJZCk7XG5cbiAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSByZXF1ZXN0LnJlc3VsdCBhcyBTdG9yZWRNZXNzYWdlO1xuICAgICAgICAgICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG1lc3NhZ2UucmV0cnlDb3VudCsrO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UudXBkYXRlZEF0ID0gRGF0ZS5ub3coKTtcblxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLnJldHJ5Q291bnQgPCBtZXNzYWdlLm1heFJldHJpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5zdGF0dXMgPSBcInBlbmRpbmdcIjsgLy8gUmV0cnlcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnN0YXR1cyA9IFwiZmFpbGVkXCI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc3RvcmUucHV0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIHRoaXMuX21lc3NhZ2VVcGRhdGVzLm5leHQobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShtZXNzYWdlLnN0YXR1cyA9PT0gXCJwZW5kaW5nXCIpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4gcmVqZWN0KG5ldyBFcnJvcihcIkZhaWxlZCB0byBtYXJrIG1lc3NhZ2UgYXMgZmFpbGVkXCIpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBfdXBkYXRlTWVzc2FnZVN0YXR1cyhtZXNzYWdlSWQ6IHN0cmluZywgc3RhdHVzOiBNZXNzYWdlU3RhdHVzKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IGRiID0gYXdhaXQgdGhpcy5vcGVuKCk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24oU1RPUkVTLk1FU1NBR0VTLCBcInJlYWR3cml0ZVwiKTtcbiAgICAgICAgICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUoU1RPUkVTLk1FU1NBR0VTKTtcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSBzdG9yZS5nZXQobWVzc2FnZUlkKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHJlcXVlc3QucmVzdWx0IGFzIFN0b3JlZE1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5zdGF0dXMgPSBzdGF0dXM7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudXBkYXRlZEF0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgICAgICAgICAgc3RvcmUucHV0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9tZXNzYWdlVXBkYXRlcy5uZXh0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QobmV3IEVycm9yKFwiRmFpbGVkIHRvIHVwZGF0ZSBtZXNzYWdlIHN0YXR1c1wiKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIE1BSUxCT1ggLyBJTkJPWDogUGVyLWNoYW5uZWwgbWVzc2FnZSBzdG9yYWdlXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbWFpbGJveCBmb3IgYSBjaGFubmVsXG4gICAgICovXG4gICAgYXN5bmMgZ2V0TWFpbGJveChcbiAgICAgICAgY2hhbm5lbDogc3RyaW5nLFxuICAgICAgICBvcHRpb25zOiB7IGxpbWl0PzogbnVtYmVyOyBzb3J0Qnk/OiBcInByaW9yaXR5XCIgfCBcImNyZWF0ZWRBdFwiIH0gPSB7fVxuICAgICk6IFByb21pc2U8U3RvcmVkTWVzc2FnZVtdPiB7XG4gICAgICAgIGNvbnN0IGRiID0gYXdhaXQgdGhpcy5vcGVuKCk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24oU1RPUkVTLk1BSUxCT1gsIFwicmVhZG9ubHlcIik7XG4gICAgICAgICAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKFNUT1JFUy5NQUlMQk9YKTtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gc3RvcmUuaW5kZXgoXCJjaGFubmVsXCIpO1xuXG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0ID0gaW5kZXguZ2V0QWxsKElEQktleVJhbmdlLm9ubHkoY2hhbm5lbCksIG9wdGlvbnMubGltaXQpO1xuXG4gICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVzdWx0cyA9IHJlcXVlc3QucmVzdWx0IGFzIFN0b3JlZE1lc3NhZ2VbXTtcblxuICAgICAgICAgICAgICAgIC8vIFNvcnRcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5zb3J0QnkgPT09IFwicHJpb3JpdHlcIikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnNvcnQoKGEsIGIpID0+IGIucHJpb3JpdHkgLSBhLnByaW9yaXR5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnNvcnQoKGEsIGIpID0+IGIuY3JlYXRlZEF0IC0gYS5jcmVhdGVkQXQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0cyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QobmV3IEVycm9yKFwiRmFpbGVkIHRvIGdldCBtYWlsYm94XCIpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IG1haWxib3ggc3RhdGlzdGljc1xuICAgICAqL1xuICAgIGFzeW5jIGdldE1haWxib3hTdGF0cyhjaGFubmVsOiBzdHJpbmcpOiBQcm9taXNlPE1haWxib3hTdGF0cz4ge1xuICAgICAgICBjb25zdCBtZXNzYWdlcyA9IGF3YWl0IHRoaXMuZ2V0RGVmZXJyZWRNZXNzYWdlcyhjaGFubmVsKTtcblxuICAgICAgICBjb25zdCBzdGF0czogTWFpbGJveFN0YXRzID0ge1xuICAgICAgICAgICAgdG90YWw6IG1lc3NhZ2VzLmxlbmd0aCxcbiAgICAgICAgICAgIHBlbmRpbmc6IDAsXG4gICAgICAgICAgICBwcm9jZXNzaW5nOiAwLFxuICAgICAgICAgICAgZGVsaXZlcmVkOiAwLFxuICAgICAgICAgICAgZmFpbGVkOiAwLFxuICAgICAgICAgICAgZXhwaXJlZDogMFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGZvciAoY29uc3QgbXNnIG9mIG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBpZiAobXNnLmV4cGlyZXNBdCAmJiBtc2cuZXhwaXJlc0F0IDwgbm93KSB7XG4gICAgICAgICAgICAgICAgc3RhdHMuZXhwaXJlZCsrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdGF0c1ttc2cuc3RhdHVzIGFzIGtleW9mIE9taXQ8TWFpbGJveFN0YXRzLCBcInRvdGFsXCIgfCBcImV4cGlyZWRcIj5dKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3RhdHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgbWFpbGJveCBmb3IgYSBjaGFubmVsXG4gICAgICovXG4gICAgYXN5bmMgY2xlYXJNYWlsYm94KGNoYW5uZWw6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IGRiID0gYXdhaXQgdGhpcy5vcGVuKCk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24oU1RPUkVTLk1BSUxCT1gsIFwicmVhZHdyaXRlXCIpO1xuICAgICAgICAgICAgY29uc3Qgc3RvcmUgPSB0eC5vYmplY3RTdG9yZShTVE9SRVMuTUFJTEJPWCk7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHN0b3JlLmluZGV4KFwiY2hhbm5lbFwiKTtcblxuICAgICAgICAgICAgbGV0IGRlbGV0ZWRDb3VudCA9IDA7XG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0ID0gaW5kZXgub3BlbkN1cnNvcihJREJLZXlSYW5nZS5vbmx5KGNoYW5uZWwpKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3Vyc29yID0gcmVxdWVzdC5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnNvcikge1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3IuZGVsZXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZWRDb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3IuY29udGludWUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0eC5vbmNvbXBsZXRlID0gKCkgPT4gcmVzb2x2ZShkZWxldGVkQ291bnQpO1xuICAgICAgICAgICAgdHgub25lcnJvciA9ICgpID0+IHJlamVjdChuZXcgRXJyb3IoXCJGYWlsZWQgdG8gY2xlYXIgbWFpbGJveFwiKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFBFTkRJTkc6IFRyYWNrIHBlbmRpbmcgb3BlcmF0aW9uc1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXIgYSBwZW5kaW5nIG9wZXJhdGlvblxuICAgICAqL1xuICAgIGFzeW5jIHJlZ2lzdGVyUGVuZGluZzxUID0gYW55PihcbiAgICAgICAgb3BlcmF0aW9uOiB7IHR5cGU6IHN0cmluZzsgZGF0YTogVDsgbWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+IH1cbiAgICApOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBjb25zdCBkYiA9IGF3YWl0IHRoaXMub3BlbigpO1xuXG4gICAgICAgIGNvbnN0IHBlbmRpbmcgPSB7XG4gICAgICAgICAgICBpZDogVVVJRHY0KCksXG4gICAgICAgICAgICBjaGFubmVsOiB0aGlzLl9jaGFubmVsTmFtZSxcbiAgICAgICAgICAgIHR5cGU6IG9wZXJhdGlvbi50eXBlLFxuICAgICAgICAgICAgZGF0YTogb3BlcmF0aW9uLmRhdGEsXG4gICAgICAgICAgICBtZXRhZGF0YTogb3BlcmF0aW9uLm1ldGFkYXRhLFxuICAgICAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgICAgICAgc3RhdHVzOiBcInBlbmRpbmdcIlxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKFNUT1JFUy5QRU5ESU5HLCBcInJlYWR3cml0ZVwiKTtcbiAgICAgICAgICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUoU1RPUkVTLlBFTkRJTkcpO1xuICAgICAgICAgICAgc3RvcmUuYWRkKHBlbmRpbmcpO1xuXG4gICAgICAgICAgICB0eC5vbmNvbXBsZXRlID0gKCkgPT4gcmVzb2x2ZShwZW5kaW5nLmlkKTtcbiAgICAgICAgICAgIHR4Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QobmV3IEVycm9yKFwiRmFpbGVkIHRvIHJlZ2lzdGVyIHBlbmRpbmcgb3BlcmF0aW9uXCIpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBwZW5kaW5nIG9wZXJhdGlvbnMgZm9yIGNoYW5uZWxcbiAgICAgKi9cbiAgICBhc3luYyBnZXRQZW5kaW5nT3BlcmF0aW9ucygpOiBQcm9taXNlPGFueVtdPiB7XG4gICAgICAgIGNvbnN0IGRiID0gYXdhaXQgdGhpcy5vcGVuKCk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24oU1RPUkVTLlBFTkRJTkcsIFwicmVhZG9ubHlcIik7XG4gICAgICAgICAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKFNUT1JFUy5QRU5ESU5HKTtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gc3RvcmUuaW5kZXgoXCJjaGFubmVsXCIpO1xuXG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0ID0gaW5kZXguZ2V0QWxsKElEQktleVJhbmdlLm9ubHkodGhpcy5fY2hhbm5lbE5hbWUpKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiByZXNvbHZlKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHJlamVjdChuZXcgRXJyb3IoXCJGYWlsZWQgdG8gZ2V0IHBlbmRpbmcgb3BlcmF0aW9uc1wiKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbXBsZXRlIGEgcGVuZGluZyBvcGVyYXRpb25cbiAgICAgKi9cbiAgICBhc3luYyBjb21wbGV0ZVBlbmRpbmcob3BlcmF0aW9uSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBkYiA9IGF3YWl0IHRoaXMub3BlbigpO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKFNUT1JFUy5QRU5ESU5HLCBcInJlYWR3cml0ZVwiKTtcbiAgICAgICAgICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUoU1RPUkVTLlBFTkRJTkcpO1xuICAgICAgICAgICAgc3RvcmUuZGVsZXRlKG9wZXJhdGlvbklkKTtcblxuICAgICAgICAgICAgdHgub25jb21wbGV0ZSA9ICgpID0+IHJlc29sdmUoKTtcbiAgICAgICAgICAgIHR4Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QobmV3IEVycm9yKFwiRmFpbGVkIHRvIGNvbXBsZXRlIHBlbmRpbmcgb3BlcmF0aW9uXCIpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXdhaXQgYSBwZW5kaW5nIG9wZXJhdGlvbiAocG9sbCB1bnRpbCBjb21wbGV0ZSBvciB0aW1lb3V0KVxuICAgICAqL1xuICAgIGFzeW5jIGF3YWl0UGVuZGluZzxUID0gYW55PihcbiAgICAgICAgb3BlcmF0aW9uSWQ6IHN0cmluZyxcbiAgICAgICAgb3B0aW9uczogeyB0aW1lb3V0PzogbnVtYmVyOyBwb2xsSW50ZXJ2YWw/OiBudW1iZXIgfSA9IHt9XG4gICAgKTogUHJvbWlzZTxUIHwgbnVsbD4ge1xuICAgICAgICBjb25zdCB0aW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0ID8/IDMwMDAwO1xuICAgICAgICBjb25zdCBwb2xsSW50ZXJ2YWwgPSBvcHRpb25zLnBvbGxJbnRlcnZhbCA/PyAxMDA7XG4gICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICAgICAgd2hpbGUgKERhdGUubm93KCkgLSBzdGFydFRpbWUgPCB0aW1lb3V0KSB7XG4gICAgICAgICAgICBjb25zdCBwZW5kaW5nID0gYXdhaXQgdGhpcy5fZ2V0UGVuZGluZ0J5SWQob3BlcmF0aW9uSWQpO1xuXG4gICAgICAgICAgICBpZiAoIXBlbmRpbmcpIHtcbiAgICAgICAgICAgICAgICAvLyBPcGVyYXRpb24gY29tcGxldGVkIChkZWxldGVkKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocGVuZGluZy5zdGF0dXMgPT09IFwiY29tcGxldGVkXCIpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmNvbXBsZXRlUGVuZGluZyhvcGVyYXRpb25JZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBlbmRpbmcucmVzdWx0IGFzIFQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyKSA9PiBzZXRUaW1lb3V0KHIsIHBvbGxJbnRlcnZhbCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQZW5kaW5nIG9wZXJhdGlvbiAke29wZXJhdGlvbklkfSB0aW1lZCBvdXRgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIF9nZXRQZW5kaW5nQnlJZChpZDogc3RyaW5nKTogUHJvbWlzZTxhbnkgfCBudWxsPiB7XG4gICAgICAgIGNvbnN0IGRiID0gYXdhaXQgdGhpcy5vcGVuKCk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24oU1RPUkVTLlBFTkRJTkcsIFwicmVhZG9ubHlcIik7XG4gICAgICAgICAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKFNUT1JFUy5QRU5ESU5HKTtcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSBzdG9yZS5nZXQoaWQpO1xuXG4gICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHJlc29sdmUocmVxdWVzdC5yZXN1bHQgPz8gbnVsbCk7XG4gICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QobmV3IEVycm9yKFwiRmFpbGVkIHRvIGdldCBwZW5kaW5nIG9wZXJhdGlvblwiKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEVYQ0hBTkdFOiBTaGFyZWQgZGF0YSBiZXR3ZWVuIGNvbnRleHRzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBQdXQgZGF0YSBpbiBleGNoYW5nZSAoc2hhcmVkIHN0b3JhZ2UpXG4gICAgICovXG4gICAgYXN5bmMgZXhjaGFuZ2VQdXQ8VCA9IGFueT4oXG4gICAgICAgIGtleTogc3RyaW5nLFxuICAgICAgICB2YWx1ZTogVCxcbiAgICAgICAgb3B0aW9uczogeyBzaGFyZWRXaXRoPzogc3RyaW5nW107IHR0bD86IG51bWJlciB9ID0ge31cbiAgICApOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBjb25zdCBkYiA9IGF3YWl0IHRoaXMub3BlbigpO1xuXG4gICAgICAgIGNvbnN0IHJlY29yZDogRXhjaGFuZ2VSZWNvcmQ8VD4gPSB7XG4gICAgICAgICAgICBpZDogVVVJRHY0KCksXG4gICAgICAgICAgICBrZXksXG4gICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgIG93bmVyOiB0aGlzLl9jaGFubmVsTmFtZSxcbiAgICAgICAgICAgIHNoYXJlZFdpdGg6IG9wdGlvbnMuc2hhcmVkV2l0aCA/PyBbXCIqXCJdLFxuICAgICAgICAgICAgdmVyc2lvbjogMSxcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgICAgIHVwZGF0ZWRBdDogRGF0ZS5ub3coKVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKFNUT1JFUy5FWENIQU5HRSwgXCJyZWFkd3JpdGVcIik7XG4gICAgICAgICAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKFNUT1JFUy5FWENIQU5HRSk7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHN0b3JlLmluZGV4KFwia2V5XCIpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBrZXkgZXhpc3RzXG4gICAgICAgICAgICBjb25zdCBnZXRSZXF1ZXN0ID0gaW5kZXguZ2V0KGtleSk7XG5cbiAgICAgICAgICAgIGdldFJlcXVlc3Qub25zdWNjZXNzID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nID0gZ2V0UmVxdWVzdC5yZXN1bHQgYXMgRXhjaGFuZ2VSZWNvcmQ8VD4gfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGV4aXN0aW5nXG4gICAgICAgICAgICAgICAgICAgIHJlY29yZC5pZCA9IGV4aXN0aW5nLmlkO1xuICAgICAgICAgICAgICAgICAgICByZWNvcmQudmVyc2lvbiA9IGV4aXN0aW5nLnZlcnNpb24gKyAxO1xuICAgICAgICAgICAgICAgICAgICByZWNvcmQuY3JlYXRlZEF0ID0gZXhpc3RpbmcuY3JlYXRlZEF0O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHN0b3JlLnB1dChyZWNvcmQpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdHgub25jb21wbGV0ZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9leGNoYW5nZVVwZGF0ZXMubmV4dChyZWNvcmQpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUocmVjb3JkLmlkKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHR4Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QobmV3IEVycm9yKFwiRmFpbGVkIHRvIHB1dCBleGNoYW5nZSBkYXRhXCIpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGRhdGEgZnJvbSBleGNoYW5nZVxuICAgICAqL1xuICAgIGFzeW5jIGV4Y2hhbmdlR2V0PFQgPSBhbnk+KGtleTogc3RyaW5nKTogUHJvbWlzZTxUIHwgbnVsbD4ge1xuICAgICAgICBjb25zdCBkYiA9IGF3YWl0IHRoaXMub3BlbigpO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKFNUT1JFUy5FWENIQU5HRSwgXCJyZWFkb25seVwiKTtcbiAgICAgICAgICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUoU1RPUkVTLkVYQ0hBTkdFKTtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gc3RvcmUuaW5kZXgoXCJrZXlcIik7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSBpbmRleC5nZXQoa2V5KTtcblxuICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkID0gcmVxdWVzdC5yZXN1bHQgYXMgRXhjaGFuZ2VSZWNvcmQ8VD4gfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICBpZiAoIXJlY29yZCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgYWNjZXNzXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9jYW5BY2Nlc3NFeGNoYW5nZShyZWNvcmQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlY29yZC52YWx1ZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QobmV3IEVycm9yKFwiRmFpbGVkIHRvIGdldCBleGNoYW5nZSBkYXRhXCIpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIGRhdGEgZnJvbSBleGNoYW5nZVxuICAgICAqL1xuICAgIGFzeW5jIGV4Y2hhbmdlRGVsZXRlKGtleTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIGNvbnN0IGRiID0gYXdhaXQgdGhpcy5vcGVuKCk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24oU1RPUkVTLkVYQ0hBTkdFLCBcInJlYWR3cml0ZVwiKTtcbiAgICAgICAgICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUoU1RPUkVTLkVYQ0hBTkdFKTtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gc3RvcmUuaW5kZXgoXCJrZXlcIik7XG5cbiAgICAgICAgICAgIGNvbnN0IGdldFJlcXVlc3QgPSBpbmRleC5nZXQoa2V5KTtcblxuICAgICAgICAgICAgZ2V0UmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkID0gZ2V0UmVxdWVzdC5yZXN1bHQgYXMgRXhjaGFuZ2VSZWNvcmQgfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICBpZiAoIXJlY29yZCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIE9ubHkgb3duZXIgY2FuIGRlbGV0ZVxuICAgICAgICAgICAgICAgIGlmIChyZWNvcmQub3duZXIgIT09IHRoaXMuX2NoYW5uZWxOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc3RvcmUuZGVsZXRlKHJlY29yZC5pZCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0eC5vbmNvbXBsZXRlID0gKCkgPT4gcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgIHR4Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QobmV3IEVycm9yKFwiRmFpbGVkIHRvIGRlbGV0ZSBleGNoYW5nZSBkYXRhXCIpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWNxdWlyZSBsb2NrIG9uIGV4Y2hhbmdlIGtleVxuICAgICAqL1xuICAgIGFzeW5jIGV4Y2hhbmdlTG9jayhcbiAgICAgICAga2V5OiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM6IHsgdGltZW91dD86IG51bWJlciB9ID0ge31cbiAgICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgY29uc3QgZGIgPSBhd2FpdCB0aGlzLm9wZW4oKTtcbiAgICAgICAgY29uc3QgdGltZW91dCA9IG9wdGlvbnMudGltZW91dCA/PyAzMDAwMDtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbihTVE9SRVMuRVhDSEFOR0UsIFwicmVhZHdyaXRlXCIpO1xuICAgICAgICAgICAgY29uc3Qgc3RvcmUgPSB0eC5vYmplY3RTdG9yZShTVE9SRVMuRVhDSEFOR0UpO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBzdG9yZS5pbmRleChcImtleVwiKTtcblxuICAgICAgICAgICAgY29uc3QgcmVxdWVzdCA9IGluZGV4LmdldChrZXkpO1xuXG4gICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmQgPSByZXF1ZXN0LnJlc3VsdCBhcyBFeGNoYW5nZVJlY29yZCB8IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgICAgIGlmICghcmVjb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgbG9ja2VkIGJ5IHNvbWVvbmUgZWxzZVxuICAgICAgICAgICAgICAgIGlmIChyZWNvcmQubG9jayAmJiByZWNvcmQubG9jay5ob2xkZXIgIT09IHRoaXMuX2NoYW5uZWxOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWNvcmQubG9jay5leHBpcmVzQXQgPiBEYXRlLm5vdygpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGZhbHNlKTsgLy8gU3RpbGwgbG9ja2VkXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBY3F1aXJlIGxvY2tcbiAgICAgICAgICAgICAgICByZWNvcmQubG9jayA9IHtcbiAgICAgICAgICAgICAgICAgICAgaG9sZGVyOiB0aGlzLl9jaGFubmVsTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgYWNxdWlyZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgICAgICAgICAgICAgZXhwaXJlc0F0OiBEYXRlLm5vdygpICsgdGltZW91dFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVjb3JkLnVwZGF0ZWRBdCA9IERhdGUubm93KCk7XG5cbiAgICAgICAgICAgICAgICBzdG9yZS5wdXQocmVjb3JkKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHR4Lm9uY29tcGxldGUgPSAoKSA9PiByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgdHgub25lcnJvciA9ICgpID0+IHJlamVjdChuZXcgRXJyb3IoXCJGYWlsZWQgdG8gYWNxdWlyZSBsb2NrXCIpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVsZWFzZSBsb2NrIG9uIGV4Y2hhbmdlIGtleVxuICAgICAqL1xuICAgIGFzeW5jIGV4Y2hhbmdlVW5sb2NrKGtleTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IGRiID0gYXdhaXQgdGhpcy5vcGVuKCk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24oU1RPUkVTLkVYQ0hBTkdFLCBcInJlYWR3cml0ZVwiKTtcbiAgICAgICAgICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUoU1RPUkVTLkVYQ0hBTkdFKTtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gc3RvcmUuaW5kZXgoXCJrZXlcIik7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSBpbmRleC5nZXQoa2V5KTtcblxuICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkID0gcmVxdWVzdC5yZXN1bHQgYXMgRXhjaGFuZ2VSZWNvcmQgfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkICYmIHJlY29yZC5sb2NrPy5ob2xkZXIgPT09IHRoaXMuX2NoYW5uZWxOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZWNvcmQubG9jaztcbiAgICAgICAgICAgICAgICAgICAgcmVjb3JkLnVwZGF0ZWRBdCA9IERhdGUubm93KCk7XG4gICAgICAgICAgICAgICAgICAgIHN0b3JlLnB1dChyZWNvcmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHR4Lm9uY29tcGxldGUgPSAoKSA9PiByZXNvbHZlKCk7XG4gICAgICAgICAgICB0eC5vbmVycm9yID0gKCkgPT4gcmVqZWN0KG5ldyBFcnJvcihcIkZhaWxlZCB0byByZWxlYXNlIGxvY2tcIikpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9jYW5BY2Nlc3NFeGNoYW5nZShyZWNvcmQ6IEV4Y2hhbmdlUmVjb3JkKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChyZWNvcmQub3duZXIgPT09IHRoaXMuX2NoYW5uZWxOYW1lKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgaWYgKHJlY29yZC5zaGFyZWRXaXRoLmluY2x1ZGVzKFwiKlwiKSkgcmV0dXJuIHRydWU7XG4gICAgICAgIHJldHVybiByZWNvcmQuc2hhcmVkV2l0aC5pbmNsdWRlcyh0aGlzLl9jaGFubmVsTmFtZSk7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gVFJBTlNBQ1RJT05TOiBCYXRjaCBvcGVyYXRpb25zIHdpdGggcm9sbGJhY2tcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8qKlxuICAgICAqIEJlZ2luIGEgdHJhbnNhY3Rpb24gZm9yIGJhdGNoIG9wZXJhdGlvbnNcbiAgICAgKi9cbiAgICBhc3luYyBiZWdpblRyYW5zYWN0aW9uKCk6IFByb21pc2U8Q2hhbm5lbFRyYW5zYWN0aW9uPiB7XG4gICAgICAgIHJldHVybiBuZXcgQ2hhbm5lbFRyYW5zYWN0aW9uKHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgb3BlcmF0aW9ucyBpbiB0cmFuc2FjdGlvblxuICAgICAqL1xuICAgIGFzeW5jIGV4ZWN1dGVUcmFuc2FjdGlvbihcbiAgICAgICAgb3BlcmF0aW9uczogVHJhbnNhY3Rpb25PcFtdXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IGRiID0gYXdhaXQgdGhpcy5vcGVuKCk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBhZmZlY3RlZCBzdG9yZXNcbiAgICAgICAgY29uc3Qgc3RvcmVOYW1lcyA9IG5ldyBTZXQob3BlcmF0aW9ucy5tYXAoKG9wKSA9PiBvcC5zdG9yZSkpO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKEFycmF5LmZyb20oc3RvcmVOYW1lcyksIFwicmVhZHdyaXRlXCIpO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IG9wIG9mIG9wZXJhdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKG9wLnN0b3JlKTtcblxuICAgICAgICAgICAgICAgIHN3aXRjaCAob3AudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwicHV0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3AudmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlLnB1dChvcC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImRlbGV0ZVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wLmtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuZGVsZXRlKG9wLmtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInVwZGF0ZVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2V0IGFuZCB1cGRhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcC5rZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGdldFJlcSA9IHN0b3JlLmdldChvcC5rZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldFJlcS5vbnN1Y2Nlc3MgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChnZXRSZXEucmVzdWx0ICYmIG9wLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5wdXQoeyAuLi5nZXRSZXEucmVzdWx0LCAuLi5vcC52YWx1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHR4Lm9uY29tcGxldGUgPSAoKSA9PiByZXNvbHZlKCk7XG4gICAgICAgICAgICB0eC5vbmVycm9yID0gKCkgPT4gcmVqZWN0KG5ldyBFcnJvcihcIlRyYW5zYWN0aW9uIGZhaWxlZFwiKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFNVQlNDUklQVElPTlNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZSB0byBtZXNzYWdlIHVwZGF0ZXNcbiAgICAgKi9cbiAgICBvbk1lc3NhZ2VVcGRhdGUoaGFuZGxlcjogKG1zZzogU3RvcmVkTWVzc2FnZSkgPT4gdm9pZCk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tZXNzYWdlVXBkYXRlcy5zdWJzY3JpYmUoeyBuZXh0OiBoYW5kbGVyIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZSB0byBleGNoYW5nZSB1cGRhdGVzXG4gICAgICovXG4gICAgb25FeGNoYW5nZVVwZGF0ZShoYW5kbGVyOiAocmVjb3JkOiBFeGNoYW5nZVJlY29yZCkgPT4gdm9pZCk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9leGNoYW5nZVVwZGF0ZXMuc3Vic2NyaWJlKHsgbmV4dDogaGFuZGxlciB9KTtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBDTEVBTlVQXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBDbGVhbiB1cCBleHBpcmVkIG1lc3NhZ2VzXG4gICAgICovXG4gICAgYXN5bmMgY2xlYW51cEV4cGlyZWQoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3QgZGIgPSBhd2FpdCB0aGlzLm9wZW4oKTtcbiAgICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbihbU1RPUkVTLk1FU1NBR0VTLCBTVE9SRVMuTUFJTEJPWF0sIFwicmVhZHdyaXRlXCIpO1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZXNTdG9yZSA9IHR4Lm9iamVjdFN0b3JlKFNUT1JFUy5NRVNTQUdFUyk7XG4gICAgICAgICAgICBjb25zdCBtYWlsYm94U3RvcmUgPSB0eC5vYmplY3RTdG9yZShTVE9SRVMuTUFJTEJPWCk7XG5cbiAgICAgICAgICAgIGxldCBkZWxldGVkQ291bnQgPSAwO1xuXG4gICAgICAgICAgICAvLyBDbGVhbiBtZXNzYWdlc1xuICAgICAgICAgICAgY29uc3QgbXNnUmVxdWVzdCA9IG1lc3NhZ2VzU3RvcmUub3BlbkN1cnNvcigpO1xuICAgICAgICAgICAgbXNnUmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3Vyc29yID0gbXNnUmVxdWVzdC5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnNvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBjdXJzb3IudmFsdWUgYXMgU3RvcmVkTWVzc2FnZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1zZy5leHBpcmVzQXQgJiYgbXNnLmV4cGlyZXNBdCA8IG5vdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yLmRlbGV0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlZENvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLmNvbnRpbnVlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gQ2xlYW4gbWFpbGJveFxuICAgICAgICAgICAgY29uc3QgbWFpbFJlcXVlc3QgPSBtYWlsYm94U3RvcmUub3BlbkN1cnNvcigpO1xuICAgICAgICAgICAgbWFpbFJlcXVlc3Qub25zdWNjZXNzID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnNvciA9IG1haWxSZXF1ZXN0LnJlc3VsdDtcbiAgICAgICAgICAgICAgICBpZiAoY3Vyc29yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IGN1cnNvci52YWx1ZSBhcyBTdG9yZWRNZXNzYWdlO1xuICAgICAgICAgICAgICAgICAgICBpZiAobXNnLmV4cGlyZXNBdCAmJiBtc2cuZXhwaXJlc0F0IDwgbm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJzb3IuZGVsZXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGVkQ291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJzb3IuY29udGludWUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0eC5vbmNvbXBsZXRlID0gKCkgPT4gcmVzb2x2ZShkZWxldGVkQ291bnQpO1xuICAgICAgICAgICAgdHgub25lcnJvciA9ICgpID0+IHJlamVjdChuZXcgRXJyb3IoXCJGYWlsZWQgdG8gY2xlYW51cCBleHBpcmVkXCIpKTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUUkFOU0FDVElPTiBIRUxQRVJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBIZWxwZXIgY2xhc3MgZm9yIGJhdGNoIG9wZXJhdGlvbnMgd2l0aCByb2xsYmFjayBzdXBwb3J0XG4gKi9cbmV4cG9ydCBjbGFzcyBDaGFubmVsVHJhbnNhY3Rpb24ge1xuICAgIHByaXZhdGUgX29wZXJhdGlvbnM6IFRyYW5zYWN0aW9uT3BbXSA9IFtdO1xuICAgIHByaXZhdGUgX2lzQ29tbWl0dGVkID0gZmFsc2U7XG4gICAgcHJpdmF0ZSBfaXNSb2xsZWRCYWNrID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9zdG9yYWdlOiBDaGFubmVsU3RvcmFnZSkge31cblxuICAgIC8qKlxuICAgICAqIEFkZCBwdXQgb3BlcmF0aW9uXG4gICAgICovXG4gICAgcHV0PFQ+KHN0b3JlOiBzdHJpbmcsIHZhbHVlOiBUKTogdGhpcyB7XG4gICAgICAgIHRoaXMuX2NoZWNrU3RhdGUoKTtcbiAgICAgICAgdGhpcy5fb3BlcmF0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgIGlkOiBVVUlEdjQoKSxcbiAgICAgICAgICAgIHR5cGU6IFwicHV0XCIsXG4gICAgICAgICAgICBzdG9yZSxcbiAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGQgZGVsZXRlIG9wZXJhdGlvblxuICAgICAqL1xuICAgIGRlbGV0ZShzdG9yZTogc3RyaW5nLCBrZXk6IElEQlZhbGlkS2V5KTogdGhpcyB7XG4gICAgICAgIHRoaXMuX2NoZWNrU3RhdGUoKTtcbiAgICAgICAgdGhpcy5fb3BlcmF0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgIGlkOiBVVUlEdjQoKSxcbiAgICAgICAgICAgIHR5cGU6IFwiZGVsZXRlXCIsXG4gICAgICAgICAgICBzdG9yZSxcbiAgICAgICAgICAgIGtleSxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkIHVwZGF0ZSBvcGVyYXRpb25cbiAgICAgKi9cbiAgICB1cGRhdGU8VD4oc3RvcmU6IHN0cmluZywga2V5OiBJREJWYWxpZEtleSwgdXBkYXRlczogUGFydGlhbDxUPik6IHRoaXMge1xuICAgICAgICB0aGlzLl9jaGVja1N0YXRlKCk7XG4gICAgICAgIHRoaXMuX29wZXJhdGlvbnMucHVzaCh7XG4gICAgICAgICAgICBpZDogVVVJRHY0KCksXG4gICAgICAgICAgICB0eXBlOiBcInVwZGF0ZVwiLFxuICAgICAgICAgICAgc3RvcmUsXG4gICAgICAgICAgICBrZXksXG4gICAgICAgICAgICB2YWx1ZTogdXBkYXRlcyxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tbWl0IHRyYW5zYWN0aW9uXG4gICAgICovXG4gICAgYXN5bmMgY29tbWl0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLl9jaGVja1N0YXRlKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX29wZXJhdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLl9pc0NvbW1pdHRlZCA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLl9zdG9yYWdlLmV4ZWN1dGVUcmFuc2FjdGlvbih0aGlzLl9vcGVyYXRpb25zKTtcbiAgICAgICAgdGhpcy5faXNDb21taXR0ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJvbGxiYWNrIHRyYW5zYWN0aW9uIChqdXN0IGNsZWFyIG9wZXJhdGlvbnMsIGRvbid0IGV4ZWN1dGUpXG4gICAgICovXG4gICAgcm9sbGJhY2soKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX29wZXJhdGlvbnMgPSBbXTtcbiAgICAgICAgdGhpcy5faXNSb2xsZWRCYWNrID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgb3BlcmF0aW9uIGNvdW50XG4gICAgICovXG4gICAgZ2V0IG9wZXJhdGlvbkNvdW50KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vcGVyYXRpb25zLmxlbmd0aDtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9jaGVja1N0YXRlKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5faXNDb21taXR0ZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRyYW5zYWN0aW9uIGFscmVhZHkgY29tbWl0dGVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9pc1JvbGxlZEJhY2spIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRyYW5zYWN0aW9uIGFscmVhZHkgcm9sbGVkIGJhY2tcIik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNJTkdMRVRPTiBTVE9SQUdFIElOU1RBTkNFU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jb25zdCBfc3RvcmFnZUluc3RhbmNlcyA9IG5ldyBNYXA8c3RyaW5nLCBDaGFubmVsU3RvcmFnZT4oKTtcblxuLyoqXG4gKiBHZXQgc3RvcmFnZSBpbnN0YW5jZSBmb3IgY2hhbm5lbFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2hhbm5lbFN0b3JhZ2UoY2hhbm5lbE5hbWU6IHN0cmluZyk6IENoYW5uZWxTdG9yYWdlIHtcbiAgICBpZiAoIV9zdG9yYWdlSW5zdGFuY2VzLmhhcyhjaGFubmVsTmFtZSkpIHtcbiAgICAgICAgX3N0b3JhZ2VJbnN0YW5jZXMuc2V0KGNoYW5uZWxOYW1lLCBuZXcgQ2hhbm5lbFN0b3JhZ2UoY2hhbm5lbE5hbWUpKTtcbiAgICB9XG4gICAgcmV0dXJuIF9zdG9yYWdlSW5zdGFuY2VzLmdldChjaGFubmVsTmFtZSkhO1xufVxuXG4vKipcbiAqIENsb3NlIGFsbCBzdG9yYWdlIGluc3RhbmNlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gY2xvc2VBbGxTdG9yYWdlKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3Qgc3RvcmFnZSBvZiBfc3RvcmFnZUluc3RhbmNlcy52YWx1ZXMoKSkge1xuICAgICAgICBzdG9yYWdlLmNsb3NlKCk7XG4gICAgfVxuICAgIF9zdG9yYWdlSW5zdGFuY2VzLmNsZWFyKCk7XG59XG4iXX0=