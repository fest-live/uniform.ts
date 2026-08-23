/**
 * Test module - Remote functions for testing
 */

// Basic functions (Level 1 - compatible with original and newer)
export const remoteFunction = (a: number, b: number) => a + b;

export const createArrayBuffer = (length: number) => new ArrayBuffer(length);

export const asyncFunction = async (value: string): Promise<string> => {
    await new Promise((r) => setTimeout(r, 10));
    return `async:${value}`;
};

export const objectMethod = {
    getValue: () => 42,
    multiply: (a: number, b: number) => a * b,
    nested: {
        deep: {
            value: "deep-value",
            getDeep: () => "from-deep"
        }
    }
};

export const throwingFunction = (shouldThrow: boolean): string => {
    if (shouldThrow) throw new Error("Intentional error");
    return "no-error";
};

// Array/collection functions
export const processArray = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);
export const createObject = (key: string, value: any) => ({ [key]: value });

// Transfer test
export const createTypedArray = (length: number): Uint8Array => new Uint8Array(length).fill(255);

// Stateful counter (for testing state persistence)
let counter = 0;
export const incrementCounter = (): number => ++counter;
export const getCounter = (): number => counter;
export const resetCounter = (): void => { counter = 0; };