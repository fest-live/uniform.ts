import {
    ChannelSubject,
    Observable,
    ReplayChannelSubject,
    createMessageId,
    filter,
    fromPromise,
    map,
    merge,
    take,
} from "../src/newer/next/observable/Observable";
import {
    ProtocolReplayGuard,
    createProtocolEnvelope,
    isProtocolEnvelope,
    normalizeProtocolEnvelope,
} from "../src/newer/messaging/Protocol";
import {
    createExposeHandler,
    createRemoteProxy,
    getProxyDescriptor,
    isRemoteProxy,
} from "../src/newer/next/proxy/Proxy";

export type AssertApi = {
    equal(actual: any, expected: any, message?: string): void;
    deepEqual(actual: any, expected: any, message?: string): void;
    ok(value: any, message?: string): void;
};

const delay = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

export const createAssert = (): AssertApi => ({
    equal(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message ?? `Expected ${String(actual)} to equal ${String(expected)}`);
        }
    },
    deepEqual(actual, expected, message) {
        const got = JSON.stringify(actual);
        const want = JSON.stringify(expected);
        if (got !== want) {
            throw new Error(message ?? `Expected ${got} to deep equal ${want}`);
        }
    },
    ok(value, message) {
        if (!value) {
            throw new Error(message ?? `Expected value to be truthy`);
        }
    },
});

export const uniformTestCases = [
    {
        name: "Observable producer emits values and completes",
        run: async (assert: AssertApi) => {
            const values: number[] = [];
            let completed = false;
            const observable = new Observable<number>((subscriber) => {
                subscriber.next(1);
                subscriber.next(2);
                subscriber.next(3);
                subscriber.complete();
            });

            observable.subscribe({
                next: (value) => values.push(value),
                complete: () => { completed = true; },
            });

            assert.deepEqual(values, [1, 2, 3]);
            assert.equal(completed, true);
        },
    },
    {
        name: "ChannelSubject pushes values and unsubscribe stops delivery",
        run: async (assert: AssertApi) => {
            const subject = new ChannelSubject<number>();
            const values: number[] = [];
            const subscription = subject.subscribe((value) => values.push(value));

            subject.next(10);
            subscription.unsubscribe();
            subject.next(20);

            assert.deepEqual(values, [10]);
        },
    },
    {
        name: "ReplayChannelSubject replays buffered values",
        run: async (assert: AssertApi) => {
            const subject = new ReplayChannelSubject<number>(2);
            subject.next(1);
            subject.next(2);
            subject.next(3);

            const values: number[] = [];
            subject.subscribe((value) => values.push(value));

            assert.deepEqual(values, [2, 3]);
        },
    },
    {
        name: "Observable operators filter, map, take, and merge",
        run: async (assert: AssertApi) => {
            const source = new ChannelSubject<number>();
            const extra = new ChannelSubject<number>();
            const values: number[] = [];

            merge(
                take<number>(2)(map<number, number>((value) => value * 10)(filter<number>((value) => value % 2 === 0)(source))),
                extra,
            ).subscribe((value) => values.push(value));

            source.next(1);
            source.next(2);
            extra.next(99);
            source.next(4);
            source.next(6);

            assert.deepEqual(values, [20, 99, 40]);
        },
    },
    {
        name: "fromPromise emits resolved value and completes",
        run: async (assert: AssertApi) => {
            let result: number | undefined;
            let completed = false;

            fromPromise(Promise.resolve(42)).subscribe({
                next: (value) => { result = value; },
                complete: () => { completed = true; },
            });
            await delay();

            assert.equal(result, 42);
            assert.equal(completed, true);
        },
    },
    {
        name: "createMessageId returns unique ids",
        run: async (assert: AssertApi) => {
            const ids = new Set<string>();
            for (let index = 0; index < 100; index++) {
                ids.add(createMessageId());
            }
            assert.equal(ids.size, 100);
        },
    },
    {
        name: "Protocol envelope helpers normalize and validate messages",
        run: async (assert: AssertApi) => {
            const envelope = createProtocolEnvelope({
                type: "request",
                source: "client",
                destination: "worker",
                data: { text: "hello" },
            });

            assert.equal(envelope.source, "client");
            assert.equal(envelope.destination, "worker");
            assert.equal(isProtocolEnvelope(envelope), true);

            const normalized = normalizeProtocolEnvelope({
                type: "invoke",
                op: "get",
                path: "module.value",
                source: "client",
            });

            assert.equal(normalized.type, "invoke");
            assert.deepEqual(normalized.path, ["module.value"]);
            assert.equal(isProtocolEnvelope(normalized), true);
        },
    },
    {
        name: "ProtocolReplayGuard blocks duplicates inside its window",
        run: async (assert: AssertApi) => {
            const guard = new ProtocolReplayGuard(20);
            const envelope = createProtocolEnvelope({
                id: "duplicate-id",
                type: "request",
                source: "a",
                destination: "b",
                data: {},
            });

            assert.equal(guard.accept(envelope), true);
            assert.equal(guard.accept(envelope), false);
            await delay(25);
            assert.equal(guard.accept(envelope), true);
        },
    },
    {
        name: "Remote proxy tracks channel and nested path metadata",
        run: async (assert: AssertApi) => {
            const proxy = createRemoteProxy(async () => null, { channel: "worker", basePath: ["api"] });
            const nested = (proxy as any).math.add;
            const descriptor = getProxyDescriptor(nested);

            assert.equal(isRemoteProxy(proxy), true);
            assert.equal(descriptor?.channel, "worker");
            assert.deepEqual(descriptor?.path, ["api", "math", "add"]);
        },
    },
    {
        name: "Expose handler can get properties and call methods",
        run: async (assert: AssertApi) => {
            const handler = createExposeHandler({
                value: 7,
                math: {
                    add: (a: number, b: number) => a + b,
                },
            });

            assert.equal(await handler("get", ["value"], []), 7);
            assert.equal(await handler("call", ["math", "add"], [[2, 3]]), 5);
        },
    },
];

export const runUniformTests = async (assert: AssertApi = createAssert()) => {
    for (const testCase of uniformTestCases) {
        await testCase.run(assert);
    }
};
