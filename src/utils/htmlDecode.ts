import he from 'he';

export function htmlDecode(input: string): string {
    return he.decode(input);
}