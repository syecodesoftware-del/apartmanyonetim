import * as Sentry from '@sentry/nextjs';

/** A3 hata izleme (sunucu + edge). DSN env'de yoksa sessizce devre dışı.
 *  DSN gelince Vercel env'e SENTRY_DSN (server) + NEXT_PUBLIC_SENTRY_DSN (client) eklenir. */
export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (dsn) {
    Sentry.init({ dsn, tracesSampleRate: 0.2 });
  }
}

export const onRequestError = Sentry.captureRequestError;
