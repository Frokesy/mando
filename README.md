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

Scheduled notifications can be triggered independently of the API process through:

```text
POST /internal/cron/notifications
Authorization: Bearer <CRON_SECRET>
```

Set `CRON_SECRET` to a random value of at least 32 characters in the backend and scheduler environments. Configure the production scheduler to call the endpoint every 5 minutes. Frequent calls are safe: a PostgreSQL advisory lock and the daily notification check prevent duplicate sales-agent reminders, including when several API instances receive the trigger at once.

If the 9:00 AM Lagos-time execution is missed, the next call later that day creates that day's reminder. The endpoint also immediately runs pending push delivery. A successful response includes `remindersCreated`, `startedAt`, and `completedAt`; monitor non-2xx responses in the scheduler. Keep `ENABLE_BACKGROUND_JOBS=true` only if the API host reliably stays awake. The external cron endpoint is the production-safe option for sleeping or frequently restarted hosts.

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
