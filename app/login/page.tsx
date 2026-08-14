'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Step = 'email' | 'otp';

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

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (otpError) {
      setError(otpError.message);
      setLoading(false);
      return;
    }
    setMessage('Code sent. Check your email.');
    setStep('otp');
    setLoading(false);
  };

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  };

  const resendCode = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (otpError) {
      setError(otpError.message);
      setLoading(false);
      return;
    }
    setMessage('New code sent. Check your email.');
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
            {step === 'email'
              ? 'Sign in or create an account with your email'
              : `Enter the code sent to ${email}`}
          </p>
        </div>

        <div className="rounded-lg border border-line-hairline bg-surface-card p-6">
          {step === 'email' && (
            <form onSubmit={sendCode} className="space-y-4">
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
                  autoFocus
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" variant="default" disabled={loading} className="w-full">
                {loading ? 'Sending…' : 'Send code'}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="otp">
                  Verification code
                </label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  autoFocus
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
                {loading ? 'Verifying…' : 'Verify & continue'}
              </Button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setCode('');
                    setError('');
                    setMessage('');
                  }}
                  className="text-ink-muted hover:text-accent transition-colors"
                >
                  ← Use a different email
                </button>
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={loading}
                  className="text-ink-muted hover:text-accent transition-colors"
                >
                  Resend code
                </button>
              </div>
            </form>
          )}
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
