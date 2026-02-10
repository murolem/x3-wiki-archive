import type { LogLevel } from './utils/logger';

// ===========================
// ======== VARIABLES ========
// ===========================

// name of your archive.
export const archiveName = "x3wiki.com_20181104113547_full";

// name of directory where your archive is.
export const archiveDirname = "archives";

// name for the original manifest
export const originalManifestName = "snapshots.json";

// name for the processed manifest produced by the script
export const processedManifestName = "snapshots-processed.json";

// name for the browse manifest produced by the script used for search on the wiki
export const browseManifestName = "browse-manifest.csv";

// unique delimiter to use in browser manifest
export const browseManifestDelimiter = "@@@@@###@@@@@";

// if enabled, loads up processed manifest when it's available.
// useful for debugging since a lot of warning will be gone after the initial cleanup.
export const loadProcessedManifestFromDisk = true;

// run only the nth step.
// starts with 1. set to 0 to disable
export const onlyRunNthStep = 0;

// controls how detailed are the logs
export const logLevel: LogLevel = 'INFO';