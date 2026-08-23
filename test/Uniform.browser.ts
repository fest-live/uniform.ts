import { createAssert, uniformTestCases } from "./Uniform.shared";

const root = document.createElement("main");
root.id = "uniform-test-report";
root.textContent = "Running uniform.ts tests...";
document.body.append(root);

const assert = createAssert();
const results: { name: string; ok: boolean; error?: string }[] = [];

for (const testCase of uniformTestCases) {
    try {
        await testCase.run(assert);
        results.push({ name: testCase.name, ok: true });
    } catch (error: any) {
        results.push({ name: testCase.name, ok: false, error: error?.stack ?? error?.message ?? String(error) });
    }
}

const failed = results.filter((result) => !result.ok);
root.dataset.testStatus = failed.length ? "fail" : "pass";
root.innerHTML = `
    <h1>uniform.ts tests: ${failed.length ? "failed" : "passed"}</h1>
    <pre>${JSON.stringify(results, null, 2)}</pre>
`;

if (failed.length) {
    throw new Error(`${failed.length} uniform test(s) failed`);
}
