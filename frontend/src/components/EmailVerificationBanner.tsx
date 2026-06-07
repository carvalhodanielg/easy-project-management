import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import * as authApi from '../api/auth.api';

/**
 * Shown across authenticated routes while the logged-in user has not verified
 * their e-mail. Soft enforcement: the app stays usable, this only nudges.
 */
export function EmailVerificationBanner() {
  const user = useAuthStore((s) => s.user);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Only nudge when we positively know the email is unverified.
  if (!user || user.emailVerified !== false) return null;

  const handleResend = async () => {
    if (sending || sent) return;
    setSending(true);
    try {
      await authApi.resendVerification(user.email);
    } finally {
      // Generic outcome either way (anti-enumeration on the backend).
      setSending(false);
      setSent(true);
    }
  };

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-brand/10 border-b border-brand/20 px-4 py-2 text-center text-sm text-ink"
    >
      <MailWarning size={15} className="text-brand shrink-0" />
      <span>Verifique seu e-mail para confirmar sua conta.</span>
      {sent ? (
        <span className="text-ink-dim">Link reenviado — confira sua caixa de entrada.</span>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={sending}
          className="font-medium text-brand hover:text-brand-hi disabled:opacity-60 transition-colors"
        >
          {sending ? 'Reenviando…' : 'Reenviar e-mail'}
        </button>
      )}
    </div>
  );
}
