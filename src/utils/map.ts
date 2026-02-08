export function map(number: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
    return toMin + (number - fromMin) * ((toMax - toMin) / (fromMax - fromMin));
}