// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === "development";

Sentry.init({
  dsn: "https://a851325b7f2beae4dcc4271084fd2b3a@o4511227914027008.ingest.us.sentry.io/4511403607130112",

  integrations: [Sentry.replayIntegration()],

  tracesSampleRate: isDev ? 1 : 0.1,
  enableLogs: true,

  replaysSessionSampleRate: isDev ? 1 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  sendDefaultPii: isDev,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
