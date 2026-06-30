import test from "node:test";
import assert from "node:assert/strict";
import { uniformTestCases } from "./Uniform.shared";

for (const testCase of uniformTestCases) {
    test(testCase.name, async () => {
        await testCase.run(assert);
    });
}
