import { createRequire } from "node:module";
import { resolve } from "node:path";
import { terserOptions } from "./rollup/shared.config.js"

//
const require = createRequire(import.meta.url)
const __dirname = import.meta.dirname;
const TerserPlugin = require("terser-webpack-plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

//
export default {
    devtool: 'hidden-source-map',
    mode: "production",
    resolve: {
        root: [
            resolve(__dirname, './node_modules'),
            resolve(__dirname, './src')
        ],
        extensions: [".ts", ".tsx", ".js"]
    },
    output: {
        filename: './[name].mjs',
        path: resolve(__dirname, 'dist-wp'),
        crossOriginLoading: 'anonymous',
        chunkFilename: "./deps/[name].mjs",
        library: {
            type: "module",
        },
        chunkFormat: 'module',
		module: true
    },
    entry: [
        resolve(__dirname, 'src/$worker$/index.ts'),
        resolve(__dirname, 'src/$main$/index.ts')
    ],
    module: {
        rules: [
            {   // library...
                include: [
                    resolve(__dirname, "src/")
                ],
                test: /\.ts$/,
                loader: "ts-loader",
                oneOf: [
                    {
                        resourceQuery: /compress/,
                        type: 'asset/source'
                    },
                    {
                        resourceQuery: /worker/,
                        type: 'asset/source'
                    },
                ],
            },
        ]
    },
    context: __dirname,
    cache: true,
    resolve: {
        extensions: ['.ts', '.js', '.mjs'],
    },
    optimization: {
        mangleExports: true,
        mangleWasmImports: true,
        usedExports: 'global',
        mergeDuplicateChunks: true,
        moduleIds: 'deterministic',
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions
            })
        ],
        splitChunks: {
            chunks: 'async',
            minSize: 1024 * 1024,
            minRemainingSize: 0,
            minChunks: 1,
            maxAsyncRequests: 30,
            maxInitialRequests: 30,
            enforceSizeThreshold: 50000,
            filename: './deps/[name].mjs',
            cacheGroups: {
                vendors: {
                    test: /[\\/]node_modules[\\/]/,
                    priority: -10,
                    reuseExistingChunk: true,
                    filename: './deps/[name].mjs',
                },
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true,
                    filename: './deps/[name].mjs',
                },
            },
        }
    },
    target: ["es2024","web","webworker"],
    plugins: [
        new CleanWebpackPlugin({
            verbose: true,
            cleanOnceBeforeBuildPatterns: ['**/*', '!stats.json'],
        }),
    ],
    experiments: {
        outputModule: true
    }
};