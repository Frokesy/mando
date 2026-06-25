# Backend Checklist

## Recommended Stack

- [ ] Use TypeScript for the backend so the app keeps one language across frontend, API routes, validation, and shared types.
- [ ] Keep frontend and backend in this repo as a monorepo so the work stays tied to the existing UI.
- [ ] Keep the current Next.js app as the frontend app.
- [x] Add a dedicated backend app in the same repo at `apps/api`, using Fastify.
- [ ] Use PostgreSQL as the primary database.
- [ ] Use a provider-flexible setup for Postgres so development can start on free resources and production can move to Neon paid, RDS, Cloud SQL, or another managed Postgres without rewriting the app.
- [ ] Use Prisma or Drizzle for database schema, migrations, and typed queries.
- [ ] Keep shared types and validation schemas in a shared package, likely `packages/shared`.
- [ ] Use custom backend-owned auth/session logic or an auth library that stores state in Postgres.
- [ ] Use Next.js Route Handlers only as a light frontend-facing proxy if needed, not as the core business backend.

## Workspace Structure

- [x] Convert the repo into a workspace/monorepo if needed.
- [ ] Move or keep the existing frontend as `apps/web`, or leave it at the root until the backend scaffold is stable.
- [x] Create `apps/api` for the Fastify backend service.
- [ ] Create `packages/shared` for DTOs, Zod schemas, enums, and shared TypeScript types.
- [ ] Create `packages/database` if the ORM client/schema should be shared cleanly.
- [x] Add root scripts for running, linting, and building the frontend and backend.
- [ ] Add root scripts for database migrations and tests once those tools are installed.
- [x] Add separate environment examples for web and API.

## Product Decisions To Confirm

- [ ] Define user roles: customer, rider, sales agent, restaurant/admin.
- [ ] Decide whether restaurants manage their own menus or the platform team manages them.
- [ ] Decide whether orders are restaurant-specific, combo-specific, or mixed-cart across multiple restaurants.
- [ ] Decide which payments provider to integrate first.
- [ ] Decide whether the MVP uses live rider tracking or simpler status updates.
- [ ] Decide whether OTP/password reset emails can rely on provider defaults during MVP.

## Data Model

- [ ] Create `profiles` linked to auth users.
- [ ] Create `roles` or role fields with clear authorization rules.
- [ ] Create `addresses` for customer delivery locations.
- [ ] Create `restaurants`.
- [ ] Create `menu_items`.
- [ ] Create `combos`.
- [ ] Create `combo_items` if combos are composed from menu items.
- [ ] Create `carts` and `cart_items`, or keep cart client-side until checkout.
- [ ] Create `orders`.
- [ ] Create `order_items`.
- [ ] Create `payments`.
- [ ] Create `deliveries` or `rider_assignments`.
- [ ] Create `notifications`.
- [ ] Create `sales_agent_referrals`.
- [ ] Add timestamps, status enums, and soft-delete/archive fields where needed.

## API Surface

- [x] Add and locally verify an API health endpoint.
- [ ] Auth: signup.
- [ ] Auth: login.
- [ ] Auth: logout.
- [ ] Auth: password reset request.
- [ ] Auth: OTP/verification handling.
- [ ] Customer: profile read/update.
- [ ] Customer: addresses read/create/update/delete.
- [ ] Catalog: restaurants list/detail.
- [ ] Catalog: featured combos list/detail.
- [ ] Cart: validate cart before checkout.
- [ ] Orders: create order.
- [ ] Orders: order history/detail.
- [ ] Orders: status timeline.
- [ ] Payments: initialize payment.
- [ ] Payments: verify payment/webhook.
- [ ] Rider: available/assigned deliveries.
- [ ] Rider: update delivery status.
- [ ] Sales agent: dashboard metrics.
- [ ] Sales agent: referral creation/listing.
- [ ] Notifications: list and mark as read.

## Security

- [ ] Validate every mutation on the server.
- [ ] Add schema validation for request bodies and form submissions.
- [ ] Store secrets only in environment variables.
- [ ] Never expose database credentials or private auth secrets to client components.
- [ ] Keep all privileged database access inside the backend service.
- [ ] Add authorization checks for customer-owned data.
- [ ] Add authorization checks for rider-assigned delivery data.
- [ ] Add authorization checks for sales-agent referral data.
- [ ] Add admin-only authorization for catalog and operational data.
- [ ] Add rate limiting or provider-side abuse protections for auth-heavy endpoints.

## Frontend Integration

- [ ] Replace login TODO with real auth call.
- [ ] Replace signup TODO with real auth call.
- [ ] Replace forgot-password flow with real provider flow.
- [ ] Replace static restaurant arrays with API/database data.
- [ ] Replace static combo arrays with API/database data.
- [ ] Replace local/profile placeholder data with authenticated profile data.
- [ ] Wire customer cart checkout to backend order creation.
- [ ] Wire payment success/failure pages to real payment verification.
- [ ] Wire rider dashboard to assigned deliveries.
- [ ] Wire sales-agent dashboard to referral/order metrics.
- [ ] Add loading, empty, and error states for each data-backed page.

## Deployment

- [ ] Create frontend and backend `.env.example` files with required variable names only.
- [ ] Configure local Postgres or a free managed Postgres database for development.
- [ ] Configure API `DATABASE_URL`.
- [ ] Configure API auth/session secrets.
- [ ] Configure frontend API base URL.
- [ ] Configure production environment variables on the deployment host.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Smoke test auth, catalog, checkout, rider, and sales-agent flows.

## Nice To Have Later

- [ ] Realtime order status updates.
- [ ] Restaurant/admin dashboard.
- [ ] Audit log for operational actions.
- [ ] Background jobs for notifications and cleanup.
- [ ] Analytics for conversion, order volume, and delivery performance.
- [ ] Database seed script for demo restaurants, menus, combos, and users.
