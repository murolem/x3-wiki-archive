/** 
 * Formats string array for console printing. The list is formatted as ordered list separated by newlines. 
 * @param list List to format.
 * @param limit Limits number of items to print. Set to 0 to disable the limit. Default is `50`.
 */
export function formatForLogAsList(list: string[], limit: number = 50): string {
    if (limit === 0)
        limit = Infinity;

    const originalLen = list.length;
    if (limit)
        list = list.slice(0, limit);

    return list
        .map((e, i) => {
            const leftPart = (i + 1).toString() + '. '
            const entryRes = e
                .split("\n")
                .map((substring, substringIdx) => {
                    // for multiline entries, pad left side for each substring that's not the first one
                    // the same amount so visually appear in a column
                    return substringIdx === 0
                        ? substring
                        : ' '.repeat(leftPart.length) + substring
                })
                .join("\n");

            return leftPart + entryRes;
        })
        .join("\n")
        + (limit && originalLen - list.length > 0 ? `\n... ${originalLen - list.length} more` : '');
}
