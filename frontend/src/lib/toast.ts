import { toast } from 'sonner';
import { getApiErrorMessage } from './errors';

/**
 * Surfaces a failed mutation/request to the user as a destructive toast.
 * Uses the backend error message when available (see {@link getApiErrorMessage}),
 * otherwise the provided fallback. This is the single place every `onError`
 * handler should funnel through so error feedback stays consistent.
 */
export function notifyError(err: unknown, fallback: string): void {
  toast.error(getApiErrorMessage(err, fallback));
}
