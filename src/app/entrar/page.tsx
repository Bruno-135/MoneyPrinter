'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Entrada na aplicação.
 *
 * Não há registo: os utilizadores são criados no painel do Supabase. Este
 * sistema é para uso próprio, e uma página de registo aberta seria uma porta
 * escancarada para uma ferramenta que gasta dinheiro numa API paga.
 */
export default function EntrarPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      // A mensagem do Supabase é sempre "Invalid login credentials", mesmo
      // quando a causa real é o email por confirmar. Vale a pena dizê-lo.
      setError(
        'Não foi possível entrar. Confirma o email e a password — e, se criaste o ' +
          'utilizador agora, que a caixa "Auto Confirm User" estava ligada.',
      );
      setBusy(false);
      return;
    }

    router.push('/painel');
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6">
      <div>
        <p className="text-sm font-medium tracking-wide text-brand-600 uppercase">Prospeção comercial</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Entrar</h1>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-black/15 bg-white/60 px-3 py-2 text-base outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-black/15 bg-white/60 px-3 py-2 text-base outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-md bg-brand-600 px-4 py-2.5 text-base font-medium text-white disabled:opacity-50"
        >
          {busy ? 'A entrar…' : 'Entrar'}
        </button>
      </form>

      <p className="text-sm opacity-60">
        Os utilizadores criam-se no painel do Supabase, em Authentication &rsaquo; Users.
      </p>
    </main>
  );
}
