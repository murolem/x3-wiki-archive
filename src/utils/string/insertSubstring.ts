export function insertSubstring(str: string, idx: number, substr: string): string {
    return str.slice(0, idx) + substr + str.slice(idx);
}
