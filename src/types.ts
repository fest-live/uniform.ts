/**
 * Type definitions for fest/uniform
 * Centralized to avoid circular import issues
 */

export interface WorkerChannel {
    request(method: string, args?: any[]): Promise<any>;
    close(): void;
}

export interface WorkerConfig {
    name: string;
    script: string | (() => Worker) | Worker;
    options?: WorkerOptions;
    context?: 'main' | 'service-worker' | 'chrome-extension';
}

export interface QueuedRequest {
    id: string;
    method: string;
    args: any[];
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timestamp: number;
}

export interface MessageEnvelope {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
    replyTo?: string;
}

export interface ProtocolOptions {
    timeout?: number;
    retries?: number;
    compression?: boolean;
    batching?: boolean;
}