export function replaceSubstring (str: string, idxStart: number, idxEnd: number, replacement: string): string {
    return str.slice(0, idxStart) + replacement + str.slice(idxEnd);
}