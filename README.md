This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Local development uses the API on this computer and the database configured in `apps/api/.env` (the dedicated test database). Browser requests still go through `/api`, preserving the same-origin cookie setup required by iPhones and installed PWAs.

```bash
npm run dev:local
```

This starts both services:

- Web app: [http://localhost:3000](http://localhost:3000)
- API: [http://127.0.0.1:4000](http://127.0.0.1:4000)

The committed `.env.local.example` documents the local proxy. Your ignored `.env.local` overrides any remote endpoint in the root `.env`. In development, `next.config.ts` also refuses to proxy to a remote API unless `ALLOW_REMOTE_API_IN_DEV=true` is deliberately set.

Production continues to use the hosting provider's `API_PROXY_TARGET` and the backend deployment's main `DATABASE_URL`. Do not store the production database URL in `apps/api/.env`.

## Safe API testing

API tests must use a separate database. Create a Neon development branch (or another disposable PostgreSQL database), copy `apps/api/.env.test.example` to `apps/api/.env.test`, and set `TEST_DATABASE_URL` to that branch. The API refuses to run in test mode when `TEST_DATABASE_URL` is missing or matches `DATABASE_URL`.

```bash
npm run db:test:check -w apps/api
npm run db:test:migrate -w apps/api
npm run test:api
```

Keep production credentials only in the deployment environment. Do not place the production URL in `.env.test`.

## Production notification scheduler

### Reliable closed-app push on Railway

Deploy an **always-on notification worker** from this same repository, alongside the API:

1. Apply `apps/api/drizzle/0023_push_role_bindings.sql` to the intended database before deploying the updated API.
2. Create a Railway service from this repository. Build command: `npm ci && npm run build -w apps/api`. Start command: `npm run start:notifications -w apps/api`. If its root directory is already `apps/api`, use `npm run build` and `npm run start:notifications` instead.
3. Copy the API's production `DATABASE_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` into the worker. Set `NODE_ENV=production`. Keep the VAPID key pair stable; the worker and API must use the same keys.
4. Disable Railway **Serverless/App Sleeping** for the worker. It is a persistent process, not a cron service, and needs no public domain or HTTP healthcheck. Set restart policy to restart on failure. Watch for `notification_worker_started` and `push_delivery_cycle_completed` in its logs.
5. Set `ENABLE_BACKGROUND_JOBS=false` on the API when using this dedicated worker. Keep the existing authenticated cron as a fallback and for retention cleanup; it is not the primary low-latency sender.

The worker checks reminders and pushes every five seconds, independent of browser sessions. Database claims prevent concurrent API/cron/worker sends from claiming the same notification at once. Push provider acceptance (`delivered`) is **not** proof that a device displayed a notification. Device internet connectivity, permission, Focus/DND, force-stopping the browser, and platform background restrictions still affect arrival.

After deployment, open each role's profile once and enable push for that role on the device. Roles belonging to the same user can share the browser transport without overwriting each other. Logging into a different user removes the former user's bindings on subscription refresh. Disabling one role preserves other enabled roles. Logout removes all bindings on an untrusted device; the private-device option retains them deliberately.

Posting reminders expire at Lagos midnight; other push alerts expire after 48 hours. Expiry affects push only, not the notification centre. Quiet-hour messages are deferred without blocking the rest of the queue. Provider sends have bounded timeouts, parallelism, and TTLs.

Verify production with Mando fully closed: trigger a customer order, its verified payment, a cancellation, and a completed delivery; check the corresponding admin device. Repeat for customer, rider, restaurant, and sales-agent events, then check the sales-agent reminder at 9 AM Lagos time without opening Mando. Switch roles and confirm titles and click destinations match the intended role. On iPhone, enable permission from the installed Home Screen app. If arrival is delayed, inspect worker uptime and push-delivery health before attributing it to the browser.

Scheduled notifications can be triggered independently of the API process through:

```text
POST /internal/cron/notifications
Authorization: Bearer <CRON_SECRET>
```

Set `CRON_SECRET` to a random value of at least 32 characters in the backend and scheduler environments. Configure the production scheduler to call the endpoint every 5 minutes. Frequent calls are safe: a PostgreSQL advisory lock and the daily notification check prevent duplicate sales-agent reminders, including when several API instances receive the trigger at once.

If the 9:00 AM Lagos-time execution is missed, the next call later that day creates that day's reminder. The endpoint also immediately runs pending push delivery. A successful response includes `remindersCreated`, `startedAt`, and `completedAt`; monitor non-2xx responses in the scheduler. Keep `ENABLE_BACKGROUND_JOBS=true` only if the API host reliably stays awake. The external cron endpoint is the production-safe option for sleeping or frequently restarted hosts.

Notification cleanup runs from the same authenticated cron call. Read notifications are retained for 90 days and unread notifications for 180 days. Expired records and their push-delivery attempts are deleted in batches of up to 1,000 under a PostgreSQL advisory lock, making cleanup safe across multiple API instances.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
