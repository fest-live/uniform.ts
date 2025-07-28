<h1 align="center"> 🏬 Uniform.TS 🏬 </h1>

<p align="center"><b>Uniform.TS</b> — A modern replacement for all my web workers libraries.</p>

<p align="center">
<a href="https://github.com/unite-2-re/uniform.ts"><img src="https://img.shields.io/badge/repo-unite--2--re%2Funiform.ts-blue?logo=github&style=flat-square" alt="GitHub Repo"/></a>
<a href="https://github.com/unite-2-re/uniform.ts/stargazers"><img src="https://img.shields.io/github/stars/unite-2-re/uniform.ts?style=flat-square" alt="GitHub stars"/></a>
<a href="https://github.com/unite-2-re/uniform.ts/blob/main/LICENSE"><img src="https://img.shields.io/github/license/unite-2-re/uniform.ts?style=flat-square" alt="License"/></a>
<a href="https://github.com/unite-2-re/uniform.ts/commits/main"><img src="https://img.shields.io/github/last-commit/unite-2-re/uniform.ts?style=flat-square" alt="Last Commit"/></a>
<a href="https://www.npmjs.com/package/uniform.ts"><img src="https://img.shields.io/npm/v/uniform.ts?style=flat-square&logo=npm&color=orange" alt="npm version"/></a>
<a href="https://github.com/unite-2-re/uniform.ts/actions"><img src="https://img.shields.io/github/actions/workflow/status/unite-2-re/uniform.ts/ci.yml?branch=main&style=flat-square" alt="Build Status"/></a>
<a href="https://codecov.io/gh/unite-2-re/uniform.ts"><img src="https://img.shields.io/codecov/c/github/unite-2-re/uniform.ts?style=flat-square" alt="Coverage Status"/></a>
<a href="https://github.com/unite-2-re/uniform.ts/issues"><img src="https://img.shields.io/github/issues/unite-2-re/uniform.ts?style=flat-square" alt="Issues"/></a>
<a href="https://github.com/unite-2-re/uniform.ts/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome"/></a>
</p>

---

## Key Links

- [Repository](https://github.com/unite-2-re/uniform.ts)
- [npm Package](https://www.npmjs.com/package/uniform.ts)
- [Open Issues](https://github.com/unite-2-re/uniform.ts/issues)
- [Pull Requests](https://github.com/unite-2-re/uniform.ts/pulls)
- [License](https://github.com/unite-2-re/uniform.ts/blob/main/LICENSE)
- [Actions / CI](https://github.com/unite-2-re/uniform.ts/actions)
- [Coverage](https://codecov.io/gh/unite-2-re/uniform.ts)

---

## 🚧 Project Status

> **Note:** The project is being revived. There are no guarantees of stability yet, but new architectural ideas and sketches are in progress.

---

## ✨ Key Concepts

- Unified approach to working with web workers
- New architectural patterns
- Not based on any organic principles

---

## 📦 Installation

```bash
npm install uniform.ts
# or
yarn add uniform.ts
```

---

## 🧑‍💻 Usage Example

### Host Code

```typescript
// deno-lint-ignore-file no-explicit-any
import moduleLoader, { doTransfer, getContext, sync } from "../dist/uniform.js";
// import moduleLoader, { doTransfer, getContext, sync } from "../dist-wp/main.mjs";

// TypeScript modules aren't supported directly...
const module = (await (moduleLoader(new URL("./Worker.mjs", import.meta.url).href)?.catch?.(console.trace.bind(console)))) as any;
const ctx = getContext(module);
if (!ctx) throw new Error("Invalid context or worker...");

const transferCheck = (ab: any) => { console.log(ab); };
const hostAction = async () => {
    // @ts-ignore ""
    const TestClass: any = module.TestClass;
    console.log(await TestClass.lab);

    const tgn = (new TestClass());
    await tgn?.callback?.(6);

    // Get arrayBuffer from context registry
    console.log(await doTransfer(ctx, "", module?.regrets));
}

// Set context extras (visible in worker)
ctx["transferCheck"] = transferCheck;
ctx["hostAction"] = hostAction;

// Synchronize
await ctx[sync];

const workerAction = (await module?.workerAction);

await hostAction();
await workerAction?.();
```

### ES Module for Worker Context

```javascript
let ctx = {}, utils = {};
export const $importContext$ = (U) => ({ ctx, utils } = U);

export class TestClass {
    constructor() {
        console.log("Chips");
        this.clips = 0;
    }
    static get lab() {
        return 5;
    }
    callback(n = 0) {
        console.log("Crispy:" + (this.clips + n));
    }
}

export const regrets = new ArrayBuffer(64);
export const workerAction = async () => {
    const transferCheck = await ctx?.["transferCheck"];
    const bravery = new ArrayBuffer(64);
    await (transferCheck?.(utils.transfer(ctx, bravery)));
    console.warn(bravery);
}
```

---

## 📚 Documentation

- [Uniform.TS Repository](https://github.com/unite-2-re/uniform.ts)
- [Open Issues](https://github.com/unite-2-re/uniform.ts/issues)
- [Pull Requests](https://github.com/unite-2-re/uniform.ts/pulls)

---

## 🤝 Contributing

We welcome your [pull requests](https://github.com/unite-2-re/uniform.ts/pulls) and [issues](https://github.com/unite-2-re/uniform.ts/issues)!

---

## 📝 License

[MIT License](./LICENSE)

---

**_Uniform.TS — a modern approach to working with web workers!_**
