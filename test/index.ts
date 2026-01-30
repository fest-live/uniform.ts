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
// MAIN
// ============================================================================

async function main() {
    log("Starting uniform.ts test suite...\n");

    const level1 = await runLevel1Tests();
    console.log("");
    const level2 = await runLevel2Tests();

    console.log("\n" + "=".repeat(40));
    const total = level1 + level2;
    const max = 4 + 15;
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
