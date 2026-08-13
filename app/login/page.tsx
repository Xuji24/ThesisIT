'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();

    if (mode === 'signin') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || null } },
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    // If email confirmation is enabled (Supabase default), there's no
    // session yet — session exists only means confirmation is off.
    if (data.session) {
      router.push(next);
      router.refresh();
      return;
    }
    setMessage('Account created. Check your email to confirm before signing in.');
    setLoading(false);
  };

  return (
    <div className="min-h-full bg-surface-page flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-lg font-heading font-bold tracking-tight text-ink-primary">
            ThesisIT
          </Link>
          <p className="mt-2 text-sm text-ink-muted">
            {mode === 'signin' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        <div className="rounded-lg border border-line-hairline bg-surface-card p-6">
          <div className="flex items-center gap-1 bg-surface-sunken rounded-md p-0.5 mb-6">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); setMessage(''); }}
                className={`flex-1 py-1.5 rounded-[calc(var(--radius-md)-2px)] text-xs font-medium transition-colors ${
                  mode === m
                    ? 'bg-surface-card text-ink-primary shadow-sm'
                    : 'text-ink-muted hover:text-ink-secondary'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="fullName">
                  Full name
                </label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert variant="success">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" variant="default" disabled={loading} className="w-full">
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          <Link href="/" className="hover:text-accent transition-colors">
            ← Back to ThesisIT
          </Link>
        </p>
      </div>
    </div>
  );
}
