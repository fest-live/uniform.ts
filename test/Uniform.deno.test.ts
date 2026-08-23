/// <reference lib="deno.ns" />

import { createAssert, uniformTestCases } from "./Uniform.shared";

const assert = createAssert();

for (const testCase of uniformTestCases) {
    Deno.test(testCase.name, async () => {
        await testCase.run(assert);
    });
}
