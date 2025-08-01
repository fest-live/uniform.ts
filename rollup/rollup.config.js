import terserOptions  from "./shared.config"
import createExternal from "vite-plugin-external";
import optimizer from 'vite-plugin-optimizer';

//
import { compression } from 'vite-plugin-compression2';
import {resolve} from "node:path";

//
export const __dirname = resolve(import.meta.dirname, "../../");
export const TSConfig = {
    "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "lib": ["ESNext", "DOM", "WebWorker"],
        "esModuleInterop": true,
        "strict": true,
        "forceConsistentCasingInFileNames": true,
        "allowJs": true,
        "allowArbitraryExtensions": true,
        "allowSyntheticDefaultImports": true,
        "allowUmdGlobalAccess": true,
        "allowUnreachableCode": true,
        "allowUnusedLabels": true,
        "noImplicitAny": false,
        "declaration": true,
        "noImplicitThis": false,
        "inlineSources": true,
        "inlineSourceMap": true,
        "sourceMap": false,
        "outDir": "./dist/",
        "declarationDir": "./dist/worker.d.ts/",
        "typeRoots": ["plugins/global.d.ts"]
    }
};

//
export const plugins = [
    //typescript(TSConfig),
    //terser(terserOptions),
    optimizer({}),
    compression(),
    createExternal({
        interop: 'auto',
        externals: {externals: "externals", dist: "dist"},
        externalizeDeps: [
            "externals", "/externals", "./externals",
            "dist", "/dist", "./dist"
        ]
    }),
];

//
export const NAME = "worker";
export const rollupOptions = {
    plugins: [...plugins],
    treeshake: 'smallest',
    external: [
        "externals", "/externals", "./externals",
        "dist", "/dist", "./dist"
    ],
    input: "./src/Workers/ModuleWorker.ts",
    output: {
        minifyInternalExports: true,
        compact: true,
        globals: {},
		format: 'es',
		name: NAME,
        dir: './dist',
        sourcemap: 'hidden',
        exports: "auto",
        experimentalMinChunkSize: 500_500,
        inlineDynamicImports: true,
	}
};

//
export default rollupOptions;
export const worker = {
    name: "worker",
    plugins: ()=> plugins,
    format: "es",
    rollupOptions
};
