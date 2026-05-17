// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === "development";

Sentry.init({
  dsn: "https://a851325b7f2beae4dcc4271084fd2b3a@o4511227914027008.ingest.us.sentry.io/4511403607130112",

  tracesSampleRate: isDev ? 1 : 0.1,
  enableLogs: true,
  sendDefaultPii: isDev,
});
