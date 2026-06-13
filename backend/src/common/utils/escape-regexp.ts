/**
 * Escapes regex metacharacters in user input so it can be used as a literal
 * substring pattern in a MongoDB `$regex` query without ReDoS / injection risk.
 */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
