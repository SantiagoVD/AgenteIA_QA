const dimensions = 256;
export function embed(text: string): number[] {
  const vector = Array<number>(dimensions).fill(0);
  for (const word of text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
    let hash = 0; for (const char of word) hash = ((hash * 31) + char.charCodeAt(0)) | 0;
    vector[Math.abs(hash) % dimensions] += 1;
  }
  const norm = Math.hypot(...vector) || 1;
  return vector.map(value => value / norm);
}
export function cosineSimilarity(first: number[], second: number[]): number {
  return first.reduce((total, value, index) => total + value * second[index], 0);
}
