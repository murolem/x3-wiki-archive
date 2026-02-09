/** Consumes string, returning it in chunks of given size. */
export function stringConsumer(str: string) {
    const chars = str.split('');
    return (n: number) => {
        const substr = chars.slice(0, n);
        for(let i = 0; i < n; i++) {
            chars.shift();
        }
        return substr.join('')
    }
}