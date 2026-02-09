/** 
 * Formats string array for console printing. The list is formatted as ordered list separated by newlines. 
 * @param list List to format.
 * @param limit Limits number of items to print. Set to 0 to disable the limit. Default is `50`.
 */
export function formatForLogAsList(list: string[], limit: number = 50): string {
    if(limit === 0)
        limit = Infinity;

    const originalLen = list.length;
    if(limit)
        list = list.slice(0, limit + 1);

    return list.map((e, i) => (i + 1).toString() + '. ' + e).join("\n")
        + (limit && originalLen - list.length > 0 ? `\n... ${originalLen - list.length} more` : '');
}
