export function splitLines(value: string): string[] {
  return value.split('\n');
}

export function joinLines(lines: string[]): string {
  return lines.join('\n');
}

export function getCursorLineIndex(value: string, selectionStart: number): number {
  return value.slice(0, selectionStart).split('\n').length - 1;
}

export function lineStartOffset(lines: string[], lineIndex: number): number {
  return lines.slice(0, lineIndex).reduce((acc, l) => acc + l.length + 1, 0);
}
