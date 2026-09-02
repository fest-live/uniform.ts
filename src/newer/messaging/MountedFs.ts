/*
 * Filename: MountedFs.ts
 * FullPath: modules/projects/uniform.ts/src/newer/messaging/MountedFs.ts
 * FIND:mounted-fs
 * MAP:modules/projects/core.ts/src/utils/MountedFs.ts
 *
 * Re-export. SoT is core — SW/Vite must not resolve `@fest-lib/uniform/mounted-fs`
 * against the stale nested uniform package.
 */

export {
    MOUNTED_FS_EVENT,
    MOUNTED_FS_HTTP_PATH,
    MOUNTED_FS_WS_PATH,
    createMountedFsId,
    isMountedFsRequest,
    isMountedFsResponse,
    parseMountedFsMessage
} from "@fest-lib/core";

export type {
    MountedFsOp,
    MountedFsKind,
    MountedFsEntry,
    MountedFsFileBody,
    MountedFsRequest,
    MountedFsResponse
} from "@fest-lib/core";
