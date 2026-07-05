import * as Sentry from '@sentry/nextjs';

/** A3 hata izleme (tarayıcı). DSN env'de yoksa sessizce devre dışı. */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 0.2 });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
