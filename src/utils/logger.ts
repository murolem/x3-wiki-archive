import chalk from 'chalk';

export const logLevels = {
    "DEBUG": 0,
    "INFO": 1,
    "WARN": 2,
    "ERROR": 3,
    "FATAL": 4,
    "SIGINT": 5
}

const logLevelToDisplay: Record<LogLevel, string> = {
    DEBUG: "debug",
    INFO: " info",
    WARN: " warn",
    ERROR: "error",
    FATAL: "fatal",
    SIGINT: "sigint",
}

const logLevelToColorFn: Record<LogLevel, (msg: Message) => Message> = {
    DEBUG: msg => chalk.gray(msg),
    INFO: msg => msg,
    WARN: msg => chalk.yellow(msg),
    ERROR: msg => chalk.red(msg),
    FATAL: msg => chalk.white.bgRed(msg),
    SIGINT: msg => chalk.bgMagenta(msg),
}

export type LogLevel = keyof typeof logLevels;

let logLevel: LogLevel = 'INFO';
let logLevelNum = logLevels[logLevel];

export type Message = string;

export type MessageParams = {
    msg: Message,

    /** Whether to generate an standard error after a log message. */
    throw?: boolean,

    /** Extra data to log after a log message. */
    data?: unknown,

    /**
     * Whether to stringify extra data. Has no effect if data is undefined.
     * 
     * Uses `JSON.stringify(data, null, 4)`.
     */
    stringifyData?: boolean
}

const defaultMsgParams: MessageParams = {
    msg: ''
}

/** Type for the message argument. */
export type MessageOrParams = Message | MessageParams;

export class Logger {
    private get logPrefixes() { return this._logPrefixes; };
    private set logPrefixes(value) { this._logPrefixes = value; }
    private _logPrefixes: string[] = [];

    get logPrefix() { return this._logPrefix; }
    private set logPrefix(value) { this._logPrefix = value; }
    private _logPrefix: string | null = null;

    private get messagePaddings() { return this._messagePaddings; }
    private set messagePaddings(value) { this._messagePaddings = value; }
    private _messagePaddings: string[] = [];

    get messagePad() { return this._messagePad; }
    private set messagePad(value) { this._messagePad = value; }
    private _messagePad: string | null = null;

    constructor(...logPrefixes: string[]) {
        this.setLogPrefixes(...logPrefixes);
    }

    /** Set global log level. */
    static setLogLevel(level: LogLevel): void {
        logLevel = level;
        logLevelNum = logLevels[logLevel];
    }

    /** Get current log level. */
    static getLogLevel(): LogLevel {
        return logLevel;
    }

    /** Sets instance log prefixes. */
    setLogPrefixes = (...prefixes: string[]): this => {
        this.logPrefixes = [...prefixes];
        this.logPrefix = prefixes.length === 0
            ? null
            : prefixes.map(v => "[" + v + "]")
                .join(" ");

        return this;
    }

    /** Appends a log prefix to the instance. */
    appendLogPrefix = (prefix: string): this => {
        this.logPrefixes.push(prefix);

        if (this.logPrefix === null)
            this.logPrefix = "[" + prefix + "]";
        else
            this.logPrefix += " [" + prefix + "]";

        return this;
    }

    /** 
     * Adds a specified padding string before each message (but after prefix). Can accumulate.
     * 
     * - Call {@link removeAllMessagePadding} to reset all added padding.
     * - Call {@link removeLastMessagePadding} to reset last added padding.
     */
    addMessagePadding = (padding: string): this => {
        this.messagePaddings.push(padding);

        if (this.messagePad === null)
            this.messagePad = padding;
        else
            this.messagePad += padding;

        return this;
    }

    /** Removes all message padding. */
    removeAllMessagePadding = (): this => {
        this.messagePaddings.length = 0;
        this.messagePad = null;

        return this;
    }

    /** Removes last added message padding. */
    removeLastMessagePadding = (): this => {
        const padding = this.messagePaddings.pop();
        if (padding !== undefined)
            this.messagePad = this.messagePad!.substring(0, this.messagePad!.length - padding.length);

        return this;
    }

    clone(): Logger {
        return new Logger(...this.logPrefixes);
    }

    log = (level: LogLevel, messageOrParams: MessageOrParams, ...extraMessages: unknown[]): void => {
        if (logLevels[level] < logLevelNum) {
            return;
        }

        const isParams = typeof messageOrParams === 'object';

        const mainMessage: string = isParams
            ? messageOrParams.msg
            : messageOrParams;

        const params: MessageParams = isParams
            ? messageOrParams
            : defaultMsgParams

        let logMethod: (...data: unknown[]) => void;
        if (level === 'DEBUG' || level === 'INFO') {
            logMethod = console.log;
        } else if (level === 'WARN') {
            logMethod = console.warn;
        } else if (level === 'ERROR' || level === 'FATAL') {
            logMethod = console.error;
        } else {
            logMethod = console.log;
        }

        const colorFn = logLevelToColorFn[level];

        // log main message
        const mainMessageRows = mainMessage.split("\n");
        const mainMessageStaticPart =
            chalk.bold(logLevelToDisplay[level])
            + ': '
            + (this.messagePad === null ? '' : this.messagePad)
            + (this.logPrefix === null ? '' : this.logPrefix + ' ');
        for (let i = 0; i < mainMessageRows.length; i++) {
            const msg = colorFn(mainMessageStaticPart + mainMessageRows[i]);

            logMethod(msg);
        }

        // log any extra messages
        if (extraMessages.length > 0) {
            logMethod(...extraMessages);
        }

        // log data, if any
        if (params.data !== undefined) {
            const stringifed = JSON.stringify(params.data, null, 4);

            if (params.stringifyData) {
                logMethod(stringifed);
            } else {
                logMethod(params.data);
            }
        }

        // throw, if needed
        if (params.throw) {
            const error = new Error("see previous message");
            throw error;
        }
    }

    logDebug = (messageOrParams: MessageOrParams, ...extraMessages: unknown[]): void => {
        this.log('DEBUG', messageOrParams, ...extraMessages);
    }

    logInfo = (messageOrParams: MessageOrParams, ...extraMessages: unknown[]): void => {
        this.log('INFO', messageOrParams, ...extraMessages);
    }

    logWarn = (messageOrParams: MessageOrParams, ...extraMessages: unknown[]): void => {
        this.log('WARN', messageOrParams, ...extraMessages);
    }

    logError = (messageOrParams: MessageOrParams, ...extraMessages: unknown[]): void => {
        this.log('ERROR', messageOrParams, ...extraMessages);
    }

    logFatal = (messageOrParams: MessageOrParams, ...extraMessages: unknown[]): void => {
        this.log('FATAL', messageOrParams, ...extraMessages);
    }

    logFatalAndThrow = (messageOrParams: Message | Omit<MessageParams, 'throw'>, ...extraMessages: unknown[]): never => {
        if (typeof messageOrParams === 'string') {
            this.log('FATAL', {
                msg: messageOrParams,
                throw: true
            }, ...extraMessages);
        } else {
            this.log('FATAL', {
                ...messageOrParams,
                throw: true
            }, ...extraMessages);
        }

        // should not happen unless logger logic gets fucked up
        throw new Error("failed to log fatal and throw: should have thrown, not expected to reach this point");
    }
}