/** Formats string array for console printing. The list is formatted as ordered list separated by newlines. */
export function formatForLogAsList(list: string[]): string {
    return list.map((e, i) => (i + 1).toString() + '. ' + e).join("\n");
}
