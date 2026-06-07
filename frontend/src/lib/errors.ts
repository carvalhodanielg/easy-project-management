/**
 * Extract a human-readable message from a failed API call. The backend wraps
 * errors as `{ error: { message: string | string[] } }` (see AllExceptionsFilter);
 * validation errors come back as an array, so we surface the first entry.
 * Falls back to the given default when no message is present.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { error?: { message?: string | string[] } } } })
    ?.response?.data?.error?.message;
  const detail = Array.isArray(msg) ? msg[0] : msg;
  return detail ?? fallback;
}
