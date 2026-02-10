export type ConnectionDirection = "incoming" | "outgoing";
export type ConnectionStatus = "active" | "closed";

export interface ConnectionInfo<TTransport extends string = string> {
    id: string;
    localChannel: string;
    remoteChannel: string;
    sender: string;
    transportType: TTransport;
    direction: ConnectionDirection;
    status: ConnectionStatus;
    createdAt: number;
    updatedAt: number;
    lastNotifyAt?: number;
    metadata?: Record<string, any>;
}

export interface ConnectionEvent<TTransport extends string = string> {
    type: "connected" | "notified" | "disconnected";
    connection: ConnectionInfo<TTransport>;
    timestamp: number;
    payload?: any;
}

export interface QueryConnectionsOptions<TTransport extends string = string> {
    channel?: string;
    localChannel?: string;
    remoteChannel?: string;
    sender?: string;
    transportType?: TTransport;
    direction?: ConnectionDirection;
    status?: ConnectionStatus;
    includeClosed?: boolean;
}

export interface RegisterConnectionParams<TTransport extends string = string> {
    localChannel: string;
    remoteChannel: string;
    sender: string;
    transportType: TTransport;
    direction: ConnectionDirection;
    metadata?: Record<string, any>;
}

function createConnectionKey<TTransport extends string = string>(
    params: RegisterConnectionParams<TTransport>
): string {
    return [
        params.localChannel,
        params.remoteChannel,
        params.sender,
        params.transportType,
        params.direction
    ].join("::");
}

export function queryConnections<TTransport extends string = string>(
    connections: Iterable<ConnectionInfo<TTransport>>,
    query: QueryConnectionsOptions<TTransport> = {}
): ConnectionInfo<TTransport>[] {
    const includeClosed = query.includeClosed ?? false;
    const desiredStatus = query.status ?? (includeClosed ? undefined : "active");

    return [...connections]
        .filter((connection) => {
            if (desiredStatus && connection.status !== desiredStatus) return false;
            if (query.channel && connection.localChannel !== query.channel && connection.remoteChannel !== query.channel) return false;
            if (query.localChannel && connection.localChannel !== query.localChannel) return false;
            if (query.remoteChannel && connection.remoteChannel !== query.remoteChannel) return false;
            if (query.sender && connection.sender !== query.sender) return false;
            if (query.transportType && connection.transportType !== query.transportType) return false;
            if (query.direction && connection.direction !== query.direction) return false;
            return true;
        })
        .sort((a, b) => b.updatedAt - a.updatedAt);
}

export class ConnectionRegistry<TTransport extends string = string> {
    private _connections = new Map<string, ConnectionInfo<TTransport>>();

    constructor(
        private _createId: () => string,
        private _emitEvent?: (event: ConnectionEvent<TTransport>) => void
    ) {}

    register(params: RegisterConnectionParams<TTransport>): ConnectionInfo<TTransport> {
        const key = createConnectionKey(params);
        const now = Date.now();
        const existing = this._connections.get(key);

        if (existing) {
            existing.updatedAt = now;
            existing.status = "active";
            existing.metadata = { ...existing.metadata, ...params.metadata };
            return existing;
        }

        const connection: ConnectionInfo<TTransport> = {
            id: this._createId(),
            localChannel: params.localChannel,
            remoteChannel: params.remoteChannel,
            sender: params.sender,
            transportType: params.transportType,
            direction: params.direction,
            status: "active",
            createdAt: now,
            updatedAt: now,
            metadata: params.metadata
        };

        this._connections.set(key, connection);
        this._emitEvent?.({
            type: "connected",
            connection,
            timestamp: now
        });
        return connection;
    }

    markNotified(connection: ConnectionInfo<TTransport>, payload?: any): void {
        const now = Date.now();
        connection.lastNotifyAt = now;
        connection.updatedAt = now;
        this._emitEvent?.({
            type: "notified",
            connection,
            timestamp: now,
            payload
        });
    }

    closeByChannel(channel: string): void {
        const now = Date.now();
        for (const connection of this._connections.values()) {
            if (connection.localChannel !== channel && connection.remoteChannel !== channel) continue;
            if (connection.status === "closed") continue;
            connection.status = "closed";
            connection.updatedAt = now;
            this._emitEvent?.({
                type: "disconnected",
                connection,
                timestamp: now
            });
        }
    }

    closeAll(): void {
        const now = Date.now();
        for (const connection of this._connections.values()) {
            if (connection.status === "closed") continue;
            connection.status = "closed";
            connection.updatedAt = now;
            this._emitEvent?.({
                type: "disconnected",
                connection,
                timestamp: now
            });
        }
    }

    query(query: QueryConnectionsOptions<TTransport> = {}): ConnectionInfo<TTransport>[] {
        return queryConnections(this._connections.values(), query);
    }

    values(): ConnectionInfo<TTransport>[] {
        return [...this._connections.values()];
    }

    clear(): void {
        this._connections.clear();
    }
}
