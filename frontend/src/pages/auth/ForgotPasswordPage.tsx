import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MailCheck } from 'lucide-react';
import * as authApi from '../../api/auth.api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
    } catch {
      // The endpoint never reveals whether the email exists, so we show the
      // same confirmation regardless of the outcome.
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-lg mb-3 shadow-lg shadow-brand/30">
            C
          </div>
          <h1 className="text-xl font-bold text-ink">Claudio</h1>
          <p className="text-sm text-ink-dim mt-1">Recuperar senha</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-line rounded-2xl p-6 shadow-2xl">
          {sent ? (
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center">
                <MailCheck size={20} className="text-brand" />
              </div>
              <p className="text-sm text-ink">
                Se houver uma conta associada a esse e-mail, enviamos um link
                para redefinir a senha.
              </p>
              <p className="text-xs text-ink-muted">
                Verifique sua caixa de entrada e a pasta de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-ink-dim">
                Informe o e-mail da sua conta e enviaremos um link para criar
                uma nova senha.
              </p>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink-dim mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="seu@email.com"
                  className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-hi disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? 'Enviando…' : 'Enviar link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-ink-dim mt-5">
          Lembrou a senha?{' '}
          <Link to="/login" className="text-brand hover:text-brand-hi font-medium transition-colors">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
