import fs from 'fs';
import { Logger } from './logger';
const { logFatalAndThrow } = new Logger();

export function assertPathExists (pathStr: string, errorMessage?: string) {
    if(!fs.existsSync(pathStr))
        logFatalAndThrow((errorMessage ?? "path doesn't exists") + " " + pathStr);
}