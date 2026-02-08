import { promisify as promisifyUtil } from 'util';

// export type UnpackedPromise<T> = T extends Promise<infer U> ? U : T
// export type GenericFunction<TS extends any[], R> = (...args: TS) => R

// export type Promisify<T> = T extends GenericFunction<infer TS, infer R>
//     ? (...args: TS) => Promise<UnpackedPromise<R>>
//     : never;

// export type Promisify<A, CB> = (...args: A, cb: CB)

type AnyFunction = (...args: any[]) => any;

type UntilLastArrayType<T extends any[]> = Required<T> extends [...infer Head, any] ? Head : any[];
type LastArrayType<T extends any[]> = Required<T> extends [...any, infer Tail] ? Tail : any[];
type ExtractCallbackValue<T extends AnyFunction> = Parameters<T>[1] extends infer T
    ? T
    : never;

type AsFunction<T> = T extends AnyFunction ? T : never;

export type Promisify<T extends AnyFunction> = (...args: UntilLastArrayType<Parameters<T>>) => ExtractCallbackValue<AsFunction<LastArrayType<Parameters<T>>>>;

export function promisify<T extends (...args: any[]) => any>(fn: T, bindTo?: any): Promisify<T> {
    const res = promisifyUtil(fn);
    if (bindTo)
        return res.bind(bindTo) as any;
    else
        return res as any;
}