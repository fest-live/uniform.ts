/**
 * Extended Test Suite for uniform.ts
 *
 * Level 1: Tests compatible with both `original` and `newer`
 * Level 2: Tests only for `newer` (Observable-based features)
 */

// Import Level 2 features directly
import {
    Observable,
    ChannelSubject,
    ReplayChannelSubject,
    filter, map, take, takeUntil, debounce,
    fromPromise,
    merge,
    createMessageId
} from "../src/newer/next/observable/Observable.ts";

// Import Level 1 features
import { importModuleInChannel } from "fest/uniform";

// Import Multi-Channel features
import {
    ChannelContext,
    createChannelContext,
    getOrCreateContext,
    getContext,
    deleteContext,
    getContextNames,
    createChannelsInContext,
    // Deferred/Dynamic channel features
    getDefaultContext,
    deferChannel,
    initDeferredChannel,
    getChannelFromDefault,
    addSelfChannelToDefault,
    createDefaultChannelPair,
    type ChannelEndpoint
} from "../src/newer/next/channel/ChannelContext.ts";
import { createMultiChannel } from "../src/index";

// Import Transport & Worker Context features
import {
    TransportAdapter,
    BroadcastChannelTransport,
    SelfTransport,
    createConnectionObserver,
    type TransportIncomingConnection
} from "../src/newer/next/transport/Transport.ts";
import {
    WorkerContext,
    type IncomingConnection,
    type ChannelCreatedEvent
} from "../src/newer/next/transport/Worker.ts";

// ============================================================================
// UTILITIES
// ============================================================================

const log = (msg: string) => console.log(`[TEST] ${msg}`);
const pass = (name: string) => console.log(`✓ ${name}`);
const fail = (name: string, error: any) => console.error(`✗ ${name}:`, error?.message ?? error);

async function test(name: string, fn: () => Promise<void> | void): Promise<boolean> {
    try {
        await fn();
        pass(name);
        return true;
    } catch (e) {
        fail(name, e);
        return false;
    }
}

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) throw new Error(`${message ?? ""}: expected ${expected}, got ${actual}`);
}

function assertArrayEqual<T>(actual: T[], expected: T[], message?: string): void {
    if (actual.length !== expected.length || !actual.every((v, i) => v === expected[i])) {
        throw new Error(`${message ?? ""}: expected [${expected}], got [${actual}]`);
    }
}

// ============================================================================
// LEVEL 1: Compatible with both `original` and `newer`
// ============================================================================

async function runLevel1Tests(): Promise<number> {
    log("=== LEVEL 1: Common API tests ===");

    const moduleUrl = new URL("./module.ts", import.meta.url).href;
    const mod = await importModuleInChannel("test-l1", moduleUrl);

    let passed = 0;

    // Test 1: Basic function call
    passed += await test("remoteFunction(1, 2) = 3", async () => {
        const result = await mod?.remoteFunction(1, 2);
        assertEqual(result, 3);
    }) ? 1 : 0;

    // Test 2: ArrayBuffer transfer
    passed += await test("createArrayBuffer(10).transfer()", async () => {
        const buf = await (await mod?.createArrayBuffer(10))?.transfer?.();
        assertEqual(buf?.byteLength, 10);
    }) ? 1 : 0;

    // Test 3: TypedArray creation
    passed += await test("createTypedArray(5) proxy exists", async () => {
        const proxy = await mod?.createTypedArray(5);
        assert(proxy !== null && proxy !== undefined, "TypedArray proxy exists");
    }) ? 1 : 0;

    // Test 4: Async function call
    passed += await test("asyncFunction('test') returns", async () => {
        const result = await mod?.asyncFunction("test");
        assert(result !== null && result !== undefined, "Async function returns");
    }) ? 1 : 0;

    log(`Level 1: ${passed}/4 passed`);
    return passed;
}

// ============================================================================
// LEVEL 2: Newer-only features (Observable API)
// ============================================================================

async function runLevel2Tests(): Promise<number> {
    log("=== LEVEL 2: Newer Observable API tests ===");

    let passed = 0;

    // Test 1: Basic Observable producer
    passed += await test("Observable producer pattern", () => {
        const values: number[] = [];
        const obs = new Observable<number>((sub) => {
            sub.next(1);
            sub.next(2);
            sub.next(3);
            sub.complete();
        });
        obs.subscribe({ next: (v) => values.push(v) });
        assertArrayEqual(values, [1, 2, 3]);
    }) ? 1 : 0;

    // Test 2: Observable cleanup on unsubscribe
    passed += await test("Observable cleanup on unsubscribe", () => {
        let cleaned = false;
        const obs = new Observable<number>((sub) => {
            sub.next(1);
            // Don't complete - let the subscription handle cleanup
            return () => { cleaned = true; };
        });
        const sub = obs.subscribe({});
        sub.unsubscribe();
        assert(cleaned, "Cleanup should be called after unsubscribe");
    }) ? 1 : 0;

    // Test 3: ChannelSubject push/subscribe
    passed += await test("ChannelSubject push/subscribe", () => {
        const subject = new ChannelSubject<number>({ bufferSize: 10 });
        const received: number[] = [];
        subject.subscribe((v) => received.push(v));
        subject.next(10);
        subject.next(20);
        assertArrayEqual(received, [10, 20]);
    }) ? 1 : 0;

    // Test 4: ReplayChannelSubject replays buffer
    passed += await test("ReplayChannelSubject replays", () => {
        const subject = new ReplayChannelSubject<number>(3);
        subject.next(1);
        subject.next(2);
        subject.next(3);
        const received: number[] = [];
        subject.subscribe((v) => received.push(v));
        assertArrayEqual(received, [1, 2, 3]);
    }) ? 1 : 0;

    // Test 5: Filter operator
    passed += await test("filter operator", () => {
        const subject = new ChannelSubject<number>();
        const filtered: number[] = [];
        filter<number>((v) => v > 5)(subject).subscribe((v) => filtered.push(v));
        [1, 7, 3, 9, 2, 8].forEach((v) => subject.next(v));
        assertArrayEqual(filtered, [7, 9, 8]);
    }) ? 1 : 0;

    // Test 6: Map operator
    passed += await test("map operator", () => {
        const subject = new ChannelSubject<number>();
        const mapped: number[] = [];
        map<number, number>((v) => v * 2)(subject).subscribe((v) => mapped.push(v));
        [1, 2, 3].forEach((v) => subject.next(v));
        assertArrayEqual(mapped, [2, 4, 6]);
    }) ? 1 : 0;

    // Test 7: Take operator limits values
    passed += await test("take operator limits values", () => {
        const subject = new ChannelSubject<number>();
        const taken: number[] = [];
        let completed = false;
        take<number>(2)(subject).subscribe({
            next: (v) => taken.push(v),
            complete: () => { completed = true; }
        });
        [1, 2, 3, 4].forEach((v) => subject.next(v));
        assertArrayEqual(taken, [1, 2]);
        assert(completed, "Should complete after taking 2");
    }) ? 1 : 0;

    // Test 8: fromPromise resolves
    passed += await test("fromPromise resolves", async () => {
        let result: number | undefined;
        let completed = false;
        fromPromise(Promise.resolve(42)).subscribe({
            next: (v) => { result = v; },
            complete: () => { completed = true; }
        });
        await new Promise((r) => setTimeout(r, 10));
        assertEqual(result, 42);
        assert(completed, "Should complete after resolve");
    }) ? 1 : 0;

    // Test 9: Subscription unsubscribe stops values
    passed += await test("Subscription unsubscribe stops values", () => {
        const subject = new ChannelSubject<number>();
        const received: number[] = [];
        const sub = subject.subscribe((v) => received.push(v));
        subject.next(1);
        sub.unsubscribe();
        subject.next(2);
        subject.next(3);
        assertArrayEqual(received, [1]);
    }) ? 1 : 0;

    // Test 10: createMessageId uniqueness
    passed += await test("createMessageId generates unique IDs", () => {
        const ids = new Set<string>();
        for (let i = 0; i < 100; i++) {
            ids.add(createMessageId());
        }
        assertEqual(ids.size, 100, "All IDs should be unique");
    }) ? 1 : 0;

    // Test 11: Observable pipe chain
    passed += await test("Observable pipe chain", () => {
        const values: number[] = [];
        new Observable<number>((sub) => {
            [1, 2, 3, 4, 5, 6].forEach((v) => sub.next(v));
            sub.complete();
        }).pipe(
            filter((v: number) => v % 2 === 0),
            map((v: number) => v * 10),
            take(2)
        ).subscribe((v) => values.push(v));
        assertArrayEqual(values, [20, 40]);
    }) ? 1 : 0;

    // Test 12: ChannelSubject buffer
    passed += await test("ChannelSubject buffer management", () => {
        const subject = new ChannelSubject<number>({ bufferSize: 3 });
        subject.next(1);
        subject.next(2);
        subject.next(3);
        subject.next(4); // Should push out 1
        const buffer = subject.getBuffer();
        assertArrayEqual(buffer, [2, 3, 4]);
    }) ? 1 : 0;

    // Test 13: merge combines observables
    passed += await test("merge combines observables", () => {
        const s1 = new ChannelSubject<number>();
        const s2 = new ChannelSubject<number>();
        const merged: number[] = [];
        merge(s1, s2).subscribe((v) => merged.push(v));
        s1.next(1);
        s2.next(2);
        s1.next(3);
        assertArrayEqual(merged, [1, 2, 3]);
    }) ? 1 : 0;

    // Test 14: takeUntil stops on signal
    passed += await test("takeUntil stops on signal", () => {
        const source = new ChannelSubject<number>();
        const stop = new ChannelSubject<void>();
        const values: number[] = [];
        let completed = false;
        takeUntil<number>(stop)(source).subscribe({
            next: (v) => values.push(v),
            complete: () => { completed = true; }
        });
        source.next(1);
        source.next(2);
        stop.next();
        source.next(3);
        assertArrayEqual(values, [1, 2]);
        assert(completed, "Should complete on stop signal");
    }) ? 1 : 0;

    // Test 15: Subject getValue returns last
    passed += await test("ChannelSubject getValue returns last", () => {
        const subject = new ChannelSubject<number>({ bufferSize: 1 });
        assertEqual(subject.getValue(), undefined, "Initially undefined");
        subject.next(10);
        assertEqual(subject.getValue(), 10);
        subject.next(20);
        assertEqual(subject.getValue(), 20);
    }) ? 1 : 0;

    log(`Level 2: ${passed}/15 passed`);
    return passed;
}

// ============================================================================
// LEVEL 3: Multi-Channel Context tests
// ============================================================================

async function runLevel3Tests(): Promise<number> {
    log("=== LEVEL 3: Multi-Channel Context tests ===");

    let passed = 0;

    // Test 1: Create channel context
    passed += await test("createChannelContext creates isolated context", () => {
        const ctx = createChannelContext({ name: "test-ctx-1" });
        assert(ctx !== null, "Context should be created");
        assert(ctx.id.length > 0, "Context should have ID");
        ctx.close();
    }) ? 1 : 0;

    // Test 2: Create multiple channels in context
    passed += await test("Context can create multiple channels", () => {
        const ctx = createChannelContext({ name: "test-ctx-2" });
        const ch1 = ctx.createChannel("channel-a");
        const ch2 = ctx.createChannel("channel-b");
        const ch3 = ctx.createChannel("channel-c");

        assertEqual(ctx.size, 3, "Context should have 3 channels");
        assert(ctx.hasChannel("channel-a"), "channel-a should exist");
        assert(ctx.hasChannel("channel-b"), "channel-b should exist");
        assert(ctx.hasChannel("channel-c"), "channel-c should exist");

        ctx.close();
    }) ? 1 : 0;

    // Test 3: Get or create channel
    passed += await test("getOrCreateChannel returns existing or creates new", () => {
        const ctx = createChannelContext({ name: "test-ctx-3" });
        const ch1 = ctx.createChannel("existing");
        const ch2 = ctx.getOrCreateChannel("existing");
        const ch3 = ctx.getOrCreateChannel("new-channel");

        assert(ch1 === ch2, "Should return same channel instance");
        assert(ch3 !== ch1, "Should create new channel");
        assertEqual(ctx.size, 2, "Should have 2 unique channels");

        ctx.close();
    }) ? 1 : 0;

    // Test 4: Create channels batch
    passed += await test("createChannels creates multiple at once", () => {
        const ctx = createChannelContext({ name: "test-ctx-4" });
        const channels = ctx.createChannels(["ui", "data", "events", "sync"]);

        assertEqual(channels.size, 4, "Should create 4 channels");
        assertArrayEqual(
            [...channels.keys()].sort(),
            ["data", "events", "sync", "ui"],
            "Channel names should match"
        );

        ctx.close();
    }) ? 1 : 0;

    // Test 5: Channel context isolation
    passed += await test("Contexts are isolated from each other", () => {
        const ctx1 = createChannelContext({ name: "isolated-1" });
        const ctx2 = createChannelContext({ name: "isolated-2" });

        ctx1.createChannel("shared-name");
        ctx2.createChannel("shared-name");

        const ch1 = ctx1.getChannel("shared-name");
        const ch2 = ctx2.getChannel("shared-name");

        assert(ch1 !== undefined, "ctx1 should have channel");
        assert(ch2 !== undefined, "ctx2 should have channel");
        assert(ch1 !== ch2, "Channels should be different instances");
        assert(ch1?.handler !== ch2?.handler, "Handlers should be different");

        ctx1.close();
        ctx2.close();
    }) ? 1 : 0;

    // Test 6: Close specific channel
    passed += await test("closeChannel removes only specific channel", () => {
        const ctx = createChannelContext({ name: "test-ctx-6" });
        ctx.createChannels(["keep-1", "remove", "keep-2"]);

        assertEqual(ctx.size, 3, "Should start with 3 channels");
        ctx.closeChannel("remove");
        assertEqual(ctx.size, 2, "Should have 2 after close");
        assert(!ctx.hasChannel("remove"), "Removed channel should not exist");
        assert(ctx.hasChannel("keep-1"), "keep-1 should still exist");
        assert(ctx.hasChannel("keep-2"), "keep-2 should still exist");

        ctx.close();
    }) ? 1 : 0;

    // Test 7: Context registry
    passed += await test("getOrCreateContext shares named context", () => {
        const ctx1 = getOrCreateContext("shared-context");
        const ctx2 = getOrCreateContext("shared-context");

        assert(ctx1 === ctx2, "Should return same context instance");

        ctx1.createChannel("test-channel");
        assert(ctx2.hasChannel("test-channel"), "Channel should be visible in shared context");

        deleteContext("shared-context");
    }) ? 1 : 0;

    // Test 8: Get context names
    passed += await test("getContextNames returns registered contexts", () => {
        // Clean up first
        for (const name of getContextNames()) {
            deleteContext(name);
        }

        createChannelContext({ name: "ctx-a" });
        createChannelContext({ name: "ctx-b" });
        createChannelContext({ name: "ctx-c" });

        const names = getContextNames().sort();
        assertArrayEqual(names, ["ctx-a", "ctx-b", "ctx-c"], "Should list all context names");

        // Cleanup
        deleteContext("ctx-a");
        deleteContext("ctx-b");
        deleteContext("ctx-c");
    }) ? 1 : 0;

    // Test 9: Delete context
    passed += await test("deleteContext removes and closes context", () => {
        const ctx = createChannelContext({ name: "to-delete" });
        ctx.createChannels(["ch1", "ch2"]);

        assert(getContext("to-delete") !== undefined, "Context should exist");
        deleteContext("to-delete");
        assert(getContext("to-delete") === undefined, "Context should be removed");
        assert(ctx.closed, "Context should be closed");
    }) ? 1 : 0;

    // Test 10: Create multi-channel helper
    passed += await test("createMultiChannel creates context with channels", () => {
        const { context, channels } = createChannelsInContext(["api", "ui", "sync"], { name: "multi-test" });

        assert(context !== null, "Context should be created");
        assertEqual(channels.size, 3, "Should have 3 channels");
        assert(channels.has("api"), "Should have api channel");
        assert(channels.has("ui"), "Should have ui channel");
        assert(channels.has("sync"), "Should have sync channel");

        context.close();
    }) ? 1 : 0;

    // Test 11: Host channel initialization
    passed += await test("initHost creates host channel", () => {
        const ctx = createChannelContext({ name: "host-test" });
        const host = ctx.initHost("my-host");

        assert(host !== null, "Host should be created");
        assertEqual(ctx.hostName, "my-host", "Host name should match");
        assert(ctx.hasChannel("my-host"), "Host channel should be in endpoints");

        ctx.close();
    }) ? 1 : 0;

    // Test 12: Channel endpoint structure
    passed += await test("ChannelEndpoint has required properties", () => {
        const ctx = createChannelContext({ name: "endpoint-test" });
        const endpoint = ctx.createChannel("test-endpoint");

        assert(endpoint.name === "test-endpoint", "Name should match");
        assert(endpoint.handler !== null, "Handler should exist");
        assert(endpoint.connection !== null, "Connection should exist");
        assert(Array.isArray(endpoint.subscriptions), "Subscriptions should be array");
        assert(endpoint.ready instanceof Promise, "Ready should be promise");

        ctx.close();
    }) ? 1 : 0;

    log(`Level 3: ${passed}/12 passed`);
    return passed;
}

// ============================================================================
// LEVEL 4: Deferred/Dynamic Channel tests
// ============================================================================

async function runLevel4Tests(): Promise<number> {
    log("=== LEVEL 4: Deferred/Dynamic Channel tests ===");

    let passed = 0;

    // Test 1: Default context exists
    passed += await test("getDefaultContext returns global context", () => {
        const ctx = getDefaultContext();
        assert(ctx !== null, "Default context should exist");
        assert(ctx.id.length > 0, "Default context should have ID");
        assert(ctx.globalSelf !== null || typeof globalThis === "undefined", "Should have global self reference");
    }) ? 1 : 0;

    // Test 2: Default context is singleton
    passed += await test("getDefaultContext returns same instance", () => {
        const ctx1 = getDefaultContext();
        const ctx2 = getDefaultContext();
        assert(ctx1 === ctx2, "Should return same context instance");
    }) ? 1 : 0;

    // Test 3: Defer channel registration
    passed += await test("defer registers channel for lazy init", () => {
        const ctx = createChannelContext({ name: "defer-test-1" });
        let initCalled = false;

        ctx.defer("lazy-channel", async () => {
            initCalled = true;
            return ctx.createChannel("lazy-channel");
        });

        assert(ctx.isDeferred("lazy-channel"), "Channel should be deferred");
        assert(!ctx.hasChannel("lazy-channel"), "Channel should not exist yet");
        assert(!initCalled, "Init should not be called yet");

        ctx.close();
    }) ? 1 : 0;

    // Test 4: Init deferred channel
    passed += await test("initDeferred initializes lazy channel", async () => {
        const ctx = createChannelContext({ name: "defer-test-2" });
        let initCalled = false;

        ctx.defer("lazy-init", async () => {
            initCalled = true;
            return ctx.createChannel("lazy-init");
        });

        assert(!initCalled, "Init should not be called before initDeferred");

        const endpoint = await ctx.initDeferred("lazy-init");

        assert(initCalled, "Init should be called after initDeferred");
        assert(endpoint !== null, "Endpoint should be returned");
        assert(ctx.hasChannel("lazy-init"), "Channel should exist after init");
        assert(!ctx.isDeferred("lazy-init"), "Channel should no longer be deferred");

        ctx.close();
    }) ? 1 : 0;

    // Test 5: getChannelAsync initializes deferred
    passed += await test("getChannelAsync auto-initializes deferred", async () => {
        const ctx = createChannelContext({ name: "defer-test-3" });

        ctx.defer("auto-init", async () => ctx.createChannel("auto-init"));

        const endpoint = await ctx.getChannelAsync("auto-init");

        assert(endpoint !== null, "Should return endpoint");
        assert(ctx.hasChannel("auto-init"), "Channel should exist");

        ctx.close();
    }) ? 1 : 0;

    // Test 6: getChannelAsync returns existing channel
    passed += await test("getChannelAsync returns existing channel", async () => {
        const ctx = createChannelContext({ name: "defer-test-4" });
        const created = ctx.createChannel("existing-async");

        const fetched = await ctx.getChannelAsync("existing-async");

        assert(fetched === created, "Should return same endpoint");

        ctx.close();
    }) ? 1 : 0;

    // Test 7: Add self channel
    passed += await test("addSelfChannel creates self-referencing channel", () => {
        const ctx = createChannelContext({ name: "self-channel-test" });
        const endpoint = ctx.addSelfChannel("self-ref");

        assert(endpoint !== null, "Endpoint should be created");
        assertEqual(endpoint.name, "self-ref", "Name should match");
        assertEqual(endpoint.transportType, "self", "Transport type should be self");

        ctx.close();
    }) ? 1 : 0;

    // Test 8: Create channel pair
    passed += await test("createChannelPair creates bidirectional channels", () => {
        const ctx = createChannelContext({ name: "pair-test" });
        const { channel1, channel2, messageChannel } = ctx.createChannelPair("side-a", "side-b");

        assert(channel1 !== null, "Channel1 should exist");
        assert(channel2 !== null, "Channel2 should exist");
        assert(messageChannel instanceof MessageChannel, "Should have MessageChannel");
        assertEqual(channel1.name, "side-a", "Channel1 name should match");
        assertEqual(channel2.name, "side-b", "Channel2 name should match");
        assertEqual(channel1.transportType, "message-port", "Should use message-port");
        assertEqual(channel2.transportType, "message-port", "Should use message-port");
        assert(ctx.hasChannel("side-a"), "side-a should be in context");
        assert(ctx.hasChannel("side-b"), "side-b should be in context");

        ctx.close();
    }) ? 1 : 0;

    // Test 9: Add broadcast channel
    passed += await test("addBroadcast creates broadcast channel", async () => {
        const ctx = createChannelContext({ name: "broadcast-test" });
        const endpoint = await ctx.addBroadcast("bc-channel", "test-broadcast");

        assert(endpoint !== null, "Endpoint should be created");
        assertEqual(endpoint.name, "bc-channel", "Name should match");
        assertEqual(endpoint.transportType, "broadcast", "Transport type should be broadcast");

        ctx.close();
    }) ? 1 : 0;

    // Test 10: Add transport with config
    passed += await test("addTransport with self config", async () => {
        const ctx = createChannelContext({ name: "transport-config-test" });
        const endpoint = await ctx.addTransport("config-self", { type: "self" });

        assert(endpoint !== null, "Endpoint should be created");
        assertEqual(endpoint.transportType, "self", "Should be self transport");

        ctx.close();
    }) ? 1 : 0;

    // Test 11: Default context shortcuts
    passed += await test("addSelfChannelToDefault adds to default context", () => {
        const endpoint = addSelfChannelToDefault("default-self-test");

        assert(endpoint !== null, "Endpoint should be created");
        assert(getDefaultContext().hasChannel("default-self-test"), "Channel should be in default context");
    }) ? 1 : 0;

    // Test 12: Defer in default context
    passed += await test("deferChannel/initDeferredChannel work with default", async () => {
        let initCount = 0;

        deferChannel("default-deferred", async () => {
            initCount++;
            return getDefaultContext().createChannel("default-deferred");
        });

        assert(getDefaultContext().isDeferred("default-deferred"), "Should be deferred");
        assertEqual(initCount, 0, "Init should not be called yet");

        const endpoint = await initDeferredChannel("default-deferred");

        assert(endpoint !== null, "Should return endpoint");
        assertEqual(initCount, 1, "Init should be called once");
    }) ? 1 : 0;

    log(`Level 4: ${passed}/12 passed`);
    return passed;
}

// ============================================================================
// LEVEL 5: Transport & Worker Context Connection Observability
// ============================================================================

async function runLevel5Tests(): Promise<number> {
    log("=== LEVEL 5: Transport Connection Observability tests ===");

    let passed = 0;

    // Test 1: WorkerContext creation
    passed += await test("WorkerContext can be created", () => {
        const ctx = new WorkerContext({ name: "test-worker-ctx", autoAcceptChannels: false });

        assert(ctx !== null, "Context should be created");
        assert(ctx.config.name === "test-worker-ctx", "Name should match");
        assertEqual(ctx.config.autoAcceptChannels, false, "autoAcceptChannels should be false");

        ctx.close();
    }) ? 1 : 0;

    // Test 2: WorkerContext channel creation
    passed += await test("WorkerContext can create channels", () => {
        const ctx = new WorkerContext({ name: "worker-channel-test" });
        const endpoint = ctx.createChannel("my-channel");

        assert(endpoint !== null, "Endpoint should be created");
        assertEqual(endpoint.name, "my-channel", "Name should match");
        assert(ctx.hasChannel("my-channel"), "Channel should exist");

        ctx.close();
    }) ? 1 : 0;

    // Test 3: WorkerContext observable streams exist
    passed += await test("WorkerContext has observable streams", () => {
        const ctx = new WorkerContext({ name: "observable-test" });

        assert(ctx.onConnection !== null, "onConnection should exist");
        assert(ctx.onChannelCreated !== null, "onChannelCreated should exist");
        assert(ctx.onChannelClosed !== null, "onChannelClosed should exist");

        ctx.close();
    }) ? 1 : 0;

    // Test 4: Subscribe to channel creation
    passed += await test("Can subscribe to channel creation events", async () => {
        const ctx = new WorkerContext({ name: "creation-sub-test" });
        const events: ChannelCreatedEvent[] = [];

        ctx.subscribeChannelCreated((event) => {
            events.push(event);
        });

        // Create channel should not emit (direct creation doesn't emit)
        ctx.createChannel("test-ch");

        // Events would only come from acceptConnection
        assertEqual(events.length, 0, "No events for direct creation");

        ctx.close();
    }) ? 1 : 0;

    // Test 5: Subscribe to channel closed
    passed += await test("Can observe channel closed events", async () => {
        const ctx = new WorkerContext({ name: "closed-sub-test" });
        const closedChannels: string[] = [];

        ctx.onChannelClosed.subscribe((event) => {
            closedChannels.push(event.channel);
        });

        ctx.createChannel("to-close");
        ctx.closeChannel("to-close");

        assertEqual(closedChannels.length, 1, "Should have one closed event");
        assertEqual(closedChannels[0], "to-close", "Channel name should match");

        ctx.close();
    }) ? 1 : 0;

    // Test 6: BroadcastChannelTransport has incoming connection observable
    passed += await test("BroadcastChannelTransport supports incoming connections", () => {
        const transport = new BroadcastChannelTransport("bc-incoming-test", "test-bc");

        assert(transport.onIncomingConnection !== null, "Should have onIncomingConnection");
        assert(typeof transport.subscribeIncoming === "function", "Should have subscribeIncoming method");

        // Don't attach in test (would require cleanup)
    }) ? 1 : 0;

    // Test 7: SelfTransport has incoming connection observable
    passed += await test("SelfTransport supports incoming connections", () => {
        const transport = new SelfTransport("self-incoming-test");

        assert(transport.onIncomingConnection !== null, "Should have onIncomingConnection");
        assert(typeof transport.subscribeIncoming === "function", "Should have subscribeIncoming method");
    }) ? 1 : 0;

    // Test 8: createConnectionObserver aggregates connections
    passed += await test("createConnectionObserver aggregates multiple transports", () => {
        const t1 = new BroadcastChannelTransport("agg-1", "test-agg-1");
        const t2 = new BroadcastChannelTransport("agg-2", "test-agg-2");

        const observer = createConnectionObserver([t1, t2]);

        assert(observer !== null, "Observer should be created");
        assert(typeof observer.subscribe === "function", "Should have subscribe method");
        assert(typeof observer.getConnections === "function", "Should have getConnections method");
        assertArrayEqual(observer.getConnections(), [], "Should start with no connections");
    }) ? 1 : 0;

    // Test 9: AcceptCallback can be set
    passed += await test("Transport can set accept callback", () => {
        const transport = new SelfTransport("accept-callback-test");
        let callbackCalled = false;

        transport.setAcceptCallback((conn) => {
            callbackCalled = true;
            return true;
        });

        // Callback would be called when connection is received
        assert(!callbackCalled, "Callback not called until connection received");
    }) ? 1 : 0;

    // Test 10: WorkerContext config validation
    passed += await test("WorkerContext validates channel limits", () => {
        const ctx = new WorkerContext({
            name: "limit-test",
            maxChannels: 3,
            autoAcceptChannels: true
        });

        ctx.createChannel("ch1");
        ctx.createChannel("ch2");
        ctx.createChannel("ch3");

        assertEqual(ctx.getChannelNames().length, 3, "Should have 3 channels");

        ctx.close();
    }) ? 1 : 0;

    // Test 11: WorkerContext whitelist
    passed += await test("WorkerContext can use channel whitelist", () => {
        const ctx = new WorkerContext({
            name: "whitelist-test",
            allowedChannels: ["allowed-1", "allowed-2"]
        });

        assertEqual(ctx.config.allowedChannels.length, 2, "Should have 2 allowed channels");
        assert(ctx.config.allowedChannels.includes("allowed-1"), "Should include allowed-1");

        ctx.close();
    }) ? 1 : 0;

    // Test 12: WorkerContext getChannelNames
    passed += await test("WorkerContext getChannelNames returns all channels", () => {
        const ctx = new WorkerContext({ name: "names-test" });
        ctx.createChannel("alpha");
        ctx.createChannel("beta");
        ctx.createChannel("gamma");

        const names = ctx.getChannelNames().sort();
        assertArrayEqual(names, ["alpha", "beta", "gamma"], "Should return all channel names");

        ctx.close();
    }) ? 1 : 0;

    log(`Level 5: ${passed}/12 passed`);
    return passed;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    log("Starting uniform.ts test suite...\n");

    const level1 = await runLevel1Tests();
    console.log("");
    const level2 = await runLevel2Tests();
    console.log("");
    const level3 = await runLevel3Tests();
    console.log("");
    const level4 = await runLevel4Tests();
    console.log("");
    const level5 = await runLevel5Tests();

    console.log("\n" + "=".repeat(40));
    const total = level1 + level2 + level3 + level4 + level5;
    const max = 4 + 15 + 12 + 12 + 12;
    log(`TOTAL: ${total}/${max} tests passed`);

    if (total === max) {
        log("All tests passed! ✓");
    } else {
        log(`${max - total} test(s) failed. ✗`);
    }
}

await main();

// Force exit after test
if (typeof Deno !== "undefined") Deno.exit(0);
else if (typeof process !== "undefined") process.exit(0);
