# Product Roles and Core Data Model

This document is the source of truth for Mando's first backend schema. The
customer, rider, and sales-agent experiences already have frontend screens.
The restaurant and admin roles are also part of the MVP, but their dashboards
have not been designed yet.

## MVP Decisions

- Mando has five application roles: `customer`, `rider`, `sales_agent`,
  `restaurant`, and `admin`.
- A user may hold more than one role, although most users will start with one.
- Customers can register themselves. Rider, sales-agent, restaurant, and admin
  access is created or approved by an admin.
- Admins onboard restaurants, collect their payout account details, and upload
  and manage their food combos.
- Restaurant users do not manage catalog content in the MVP. Their primary
  responsibilities are accepting or rejecting orders and requesting payouts.
- A restaurant rejection creates an admin-visible operational issue and
  notification for follow-up.
- A cart and an order may contain items from only one restaurant. This keeps
  preparation, delivery, payment, cancellation, and refunds understandable.
- The cart remains in the frontend until checkout. The backend validates all
  item IDs, prices, availability, restaurant ownership, and totals when an
  order is created.
- Combos belong to one restaurant and may be composed of menu items.
- Delivery begins with status updates. Live rider GPS tracking is deferred.
- The current MVP payment flow is bank transfer. Payment records must still be
  provider-neutral so an automated Nigerian payment provider can be connected
  later.
- Referral attribution is captured when a customer follows an agent link.
  Commission is created only from an eligible paid order.
- PostgreSQL stores all timestamps in UTC. The application displays them in the
  user's local timezone.
- Money is stored as integer minor units, such as kobo, never as floating-point
  values. For example, `NGN 2,800.00` is stored as `280000`.
- Core records use UUID primary keys. Human-facing codes such as order numbers,
  rider codes, and agent codes are separate unique fields.

## Roles and Permissions

### Customer

- Create and manage their account, profile, and delivery addresses.
- Browse active restaurants, menu items, and combos.
- Create orders and view only their own order history.
- View payment and delivery progress for their own orders.
- Rate delivered orders and read their own notifications.

### Rider

- Sign in with an admin-issued rider code and password.
- View available deliveries in their assigned service area.
- Accept an available delivery or view deliveries assigned to them.
- Update only allowed delivery stages: accepted, picked up, on the way, and
  delivered.
- View their own delivery history, earnings, and payout information.
- Never edit order prices, payment state, restaurant data, or another rider's
  assignment.

### Sales Agent

- Sign in with an admin-issued agent code and password.
- View and share their unique referral link.
- View attributed customers, eligible orders, commissions, and payouts.
- Manage their own profile and payout information.
- Never change order totals, commission rules, or another agent's referrals.

### Restaurant

- Sign in with an admin-issued restaurant account.
- View only orders placed with their restaurant.
- Accept an order when the ordered combos can be fulfilled.
- Reject an order with a required reason when a combo or order cannot be
  fulfilled.
- Trigger an admin notification and follow-up case automatically when an order
  is rejected.
- View available, pending, and paid restaurant earnings.
- Submit payout requests against their available balance.
- View masked payout account details collected by the admin during onboarding.
- Never upload or edit combos, change order prices, approve payouts, or view
  another restaurant's records.

### Admin

- Onboard and manage sales agents, riders, restaurants, and other admins.
- Collect and maintain restaurant, rider, and sales-agent payout details.
- Manage restaurants, menus, combos, service areas, and availability.
- Receive alerts for rejected restaurant orders and resolve each case.
- Review payments and manage order exceptions, cancellations, and refunds.
- Assign riders and oversee order and delivery statuses.
- Configure referral and commission rules.
- Review, approve, reject, process, and reconcile restaurant, rider, and
  sales-agent payout requests.
- View live operational activity and summary data across orders, payments,
  restaurants, deliveries, referrals, and payouts.
- Suspend accounts and catalog records without deleting historical data.

## Core Tables

The fields below are the required business fields. The eventual ORM may add
relation helpers and database-specific names.

### Identity

#### `users`

- `id`
- `email` (unique, case-insensitive)
- `password_hash`
- `status`: `pending`, `active`, `suspended`, `disabled`
- `email_verified_at`
- `last_login_at`
- `created_at`, `updated_at`

#### `user_roles`

- `user_id`
- `role`: `customer`, `rider`, `sales_agent`, `restaurant`, `admin`
- `created_at`
- Unique constraint on `(user_id, role)`.

#### `profiles`

- `user_id` (unique)
- `full_name`
- `phone`
- `birthday`
- `avatar_url`
- `created_at`, `updated_at`

#### `auth_sessions`

- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `revoked_at`
- `created_at`

Only a hash of the session token is stored. Password reset and email
verification tokens follow the same rule.

#### `verification_tokens`

- `id`
- `user_id`
- `purpose`: `email_verification`, `password_reset`
- `token_hash`
- `expires_at`
- `used_at`
- `created_at`

### Locations and Addresses

#### `service_areas`

- `id`
- `name`
- `city`
- `state`
- `is_active`
- `created_at`, `updated_at`

Examples from the current UI include Modomo, Mayfair, and Modakeke.

#### `addresses`

- `id`
- `user_id`
- `service_area_id`
- `label`
- `street_address`
- `landmark`
- `latitude`, `longitude` (nullable until map support is added)
- `is_default`
- `created_at`, `updated_at`

A customer may have many addresses but only one default address.

### Operational Profiles

#### `staff_onboarding_records`

- `id`
- `user_id`
- `role`: `rider`, `sales_agent`, `restaurant`, `admin`
- `status`: `invited`, `pending`, `active`, `rejected`, `suspended`
- `onboarded_by_admin_id`
- `notes`
- `invited_at`, `completed_at`
- `created_at`, `updated_at`

This records who created or approved operational access. For restaurant users,
the restaurant membership is stored separately.

#### `rider_profiles`

- `user_id` (unique)
- `rider_code` (unique)
- `service_area_id`
- `availability_status`: `offline`, `available`, `busy`, `suspended`
- `created_at`, `updated_at`

#### `sales_agent_profiles`

- `user_id` (unique)
- `agent_code` (unique)
- `referral_code` (unique)
- `status`: `pending`, `active`, `suspended`
- `tier`
- `commission_rate_bps`
- `created_at`, `updated_at`

`commission_rate_bps` stores basis points. A 10% rate is `1000`.

#### `restaurant_members`

- `restaurant_id`
- `user_id`
- `membership_role`: `owner`, `manager`, `operator`
- `status`: `invited`, `active`, `suspended`
- `created_by_admin_id`
- `created_at`, `updated_at`
- Unique constraint on `(restaurant_id, user_id)`.

Restaurant members can handle orders and payout requests but do not manage
catalog content during the MVP.

#### `payout_accounts`

- `id`
- Exactly one owner: `user_id` or `restaurant_id`
- `bank_code`
- `account_name`
- `account_number_encrypted`
- `account_number_last4`
- `is_verified`
- `collected_by_admin_id`
- `created_at`, `updated_at`

Sensitive account details must be encrypted at rest and never returned in full
after initial submission. Restaurant account details are entered or verified
by an admin during onboarding.

### Catalog

#### `restaurants`

- `id`
- `slug` (unique)
- `name`
- `description`
- `phone`
- `service_area_id`
- `street_address`
- `latitude`, `longitude`
- `minimum_order_amount`
- `preparation_min_minutes`, `preparation_max_minutes`
- `image_url`
- `status`: `draft`, `active`, `paused`, `archived`
- `is_verified`
- `onboarded_by_admin_id`
- `onboarded_at`
- `created_at`, `updated_at`

#### `menu_items`

- `id`
- `restaurant_id`
- `name`
- `description`
- `price_amount`
- `image_url`
- `is_available`
- `created_at`, `updated_at`

#### `combos`

- `id`
- `restaurant_id`
- `slug`
- `name`
- `description`
- `price_amount`
- `image_url`
- `is_featured`
- `is_available`
- `created_at`, `updated_at`
- Unique constraint on `(restaurant_id, slug)`.

#### `combo_items`

- `combo_id`
- `menu_item_id`
- `quantity`
- `is_optional`
- Unique constraint on `(combo_id, menu_item_id)`.

### Orders and Payments

#### `orders`

- `id`
- `order_number` (unique, human-readable)
- `customer_id`
- `restaurant_id`
- `address_id` (nullable historical reference)
- Delivery snapshot: recipient name, phone, street, service area, landmark
- `status`: `pending_payment`, `paid`, `awaiting_restaurant`,
  `restaurant_accepted`, `restaurant_rejected`, `admin_review`, `preparing`,
  `ready_for_pickup`, `on_the_way`, `delivered`, `cancelled`, `refunded`
- `currency` (defaults to `NGN`)
- `subtotal_amount`
- `delivery_fee_amount`
- `discount_amount`
- `total_amount`
- `customer_note`
- `placed_at`, `created_at`, `updated_at`

The delivery address is copied onto the order so later address edits do not
rewrite order history.

#### `order_items`

- `id`
- `order_id`
- Exactly one of `menu_item_id` or `combo_id`
- Snapshot fields: `item_name`, `unit_price_amount`
- `quantity`
- `line_total_amount`
- `created_at`

Catalog references support reporting; snapshot fields preserve what was
actually purchased even if the catalog changes.

#### `order_item_components`

- `id`
- `order_item_id`
- `menu_item_id` (nullable historical reference)
- Snapshot fields: `item_name`, `unit_price_amount`
- `quantity`
- `line_total_amount`

This records selected or customized components shown in the current combo and
restaurant screens.

#### `order_status_events`

- `id`
- `order_id`
- `status`
- `actor_user_id`
- `note`
- `created_at`

This is the auditable timeline behind the customer's order tracker.

#### `restaurant_order_decisions`

- `id`
- `order_id` (unique)
- `restaurant_id`
- `decided_by_user_id`
- `decision`: `accepted`, `rejected`
- `rejection_reason_code`
- `rejection_note`
- `decided_at`
- `created_at`, `updated_at`

A rejection requires a reason. It moves the order into admin review and creates
both an operational issue and an admin notification.

#### `order_issues`

- `id`
- `order_id`
- `type`: `restaurant_rejection`, `payment_exception`, `delivery_exception`,
  `customer_complaint`
- `status`: `open`, `in_review`, `resolved`, `cancelled`
- `raised_by_user_id`
- `assigned_admin_id`
- `reason`
- `resolution`
- `resolved_at`
- `created_at`, `updated_at`

The first required use is restaurant rejection follow-up. The broader issue
types let admin operations grow without overloading the order status field.

#### `payments`

- `id`
- `order_id`
- `method`: `bank_transfer`, `card`, `bank`, `ussd`, `wallet`
- `provider`
- `provider_reference`
- `customer_reference`
- `amount`
- `currency`
- `status`: `pending`, `submitted`, `verified`, `failed`, `cancelled`,
  `refunded`
- `paid_at`, `verified_at`
- `created_at`, `updated_at`

An order may have multiple payment attempts, but only one successful total
payment unless partial payments are deliberately introduced later.

### Delivery

#### `deliveries`

- `id`
- `order_id` (unique)
- `rider_id` (nullable until assigned)
- `service_area_id`
- `status`: `unassigned`, `available`, `assigned`, `accepted`, `picked_up`,
  `on_the_way`, `delivered`, `cancelled`
- `delivery_fee_amount`
- `rider_earning_amount`
- `assigned_at`, `accepted_at`, `picked_up_at`, `delivered_at`
- `created_at`, `updated_at`

Only one rider may hold an active assignment for a delivery.

#### `delivery_status_events`

- `id`
- `delivery_id`
- `status`
- `actor_user_id`
- `note`
- `created_at`

### Referrals, Earnings, and Payouts

#### `referrals`

- `id`
- `sales_agent_id`
- `customer_id`
- `referral_code`
- `attributed_at`
- `first_eligible_order_id`
- `status`: `attributed`, `qualified`, `rejected`
- Unique constraint on `customer_id` for the MVP.

#### `commissions`

- `id`
- `sales_agent_id`
- `order_id`
- `referral_id`
- `rate_bps`
- `eligible_amount`
- `commission_amount`
- `status`: `pending`, `earned`, `approved`, `paid`, `reversed`
- `earned_at`, `created_at`, `updated_at`
- Unique constraint on `(sales_agent_id, order_id)`.

Commission values are stored as immutable order-time calculations rather than
being recalculated from the agent's current rate.

#### `restaurant_earnings`

- `id`
- `restaurant_id`
- `order_id` (unique)
- `gross_amount`
- `platform_fee_amount`
- `net_amount`
- `status`: `pending`, `available`, `held`, `requested`, `paid`, `reversed`
- `available_at`
- `created_at`, `updated_at`

The order-time amounts are immutable. An earning becomes available only after
the configured payment and fulfilment conditions have been met.

#### `payout_requests`

- `id`
- `requested_by_user_id`
- Exactly one beneficiary: `user_id` or `restaurant_id`
- `type`: `restaurant_earnings`, `rider_earnings`, `agent_commissions`
- `payout_account_id`
- `amount`
- `status`: `pending`, `under_review`, `approved`, `rejected`, `processing`,
  `paid`, `cancelled`
- `reviewed_by_admin_id`
- `admin_note`
- `requested_at`, `reviewed_at`
- `created_at`, `updated_at`

The backend verifies that the requester belongs to the beneficiary and that
the requested amount does not exceed the available, unreserved balance.

#### `payouts`

- `id`
- `payout_request_id`
- Exactly one beneficiary: `user_id` or `restaurant_id`
- `type`: `restaurant_earnings`, `rider_earnings`, `agent_commissions`
- `amount`
- `status`: `pending`, `processing`, `paid`, `failed`, `cancelled`
- `reference`
- `processed_by_admin_id`
- `processed_at`
- `created_at`, `updated_at`

#### `payout_items`

- `payout_id`
- Exactly one source: `restaurant_earning_id`, `delivery_id`, or
  `commission_id`
- `amount`

### Customer Communication

#### `notifications`

- `id`
- `user_id`
- `type`
- `title`
- `body`
- `data` (JSON for a route or related record ID)
- `read_at`
- `created_at`

Restaurant rejection notifications target admins and reference the related
order issue. Notifications can also target restaurant users when an order
arrives or a payout request changes status.

#### `activity_events`

- `id`
- `actor_user_id` (nullable for system actions)
- `event_type`
- `entity_type`
- `entity_id`
- `summary`
- `data` (JSON with non-sensitive event metadata)
- `created_at`

The admin live-activity view reads from this append-only stream and from
current aggregate queries. Financial values and secrets must not be copied
into the JSON payload.

#### `reviews`

- `id`
- `order_id` (unique)
- `customer_id`
- `restaurant_id`
- `rating` from 1 to 5
- `comment`
- `created_at`, `updated_at`

Reviews are accepted only for delivered orders belonging to the customer.

## Relationship Map

```text
users
  |-- user_roles
  |-- profiles
  |-- staff_onboarding_records
  |-- addresses --> service_areas
  |-- rider_profiles --> service_areas
  |-- sales_agent_profiles
  |-- restaurant_members --> restaurants
  |-- payout_accounts
  |-- notifications
  |-- activity_events

restaurants --> service_areas
  |-- menu_items
  |-- combos -- combo_items --> menu_items
  |-- orders -- order_items -- order_item_components
                 |
                 |-- payments
                 |-- order_status_events
                 |-- restaurant_order_decisions
                 |-- order_issues
                 |-- deliveries -- delivery_status_events
                 |-- restaurant_earnings
                 |-- reviews

sales_agent_profiles -- referrals --> customers
referrals -- commissions --> orders
users or restaurants -- payout_requests -- payouts
payouts -- payout_items --> restaurant earnings, deliveries, or commissions
```

## Important Backend Rules

- The server, never the browser, calculates trusted order totals.
- All items in an order must be active and belong to the same restaurant.
- The restaurant and customer's delivery address must share an active service
  area for the MVP.
- Order and delivery status changes must follow allowed transitions.
- Payment webhooks or admin verification are idempotent.
- A rider can update only a delivery assigned to that rider.
- A sales agent can read only their own referral and commission records.
- A restaurant user can act only for restaurants with an active membership.
- A restaurant may accept or reject only an order currently awaiting its
  decision, and a rejection must include a reason.
- A rejected order creates an open admin issue and admin notification in the
  same database transaction.
- Only admins can upload or modify restaurant combos in the MVP.
- Payout requests reserve eligible earnings transactionally so the same money
  cannot be requested twice.
- Only admins can approve or process payout requests.
- Historical orders keep item, price, address, commission, and fee snapshots.
- Records referenced by financial or order history are archived, not deleted.

## Frontend Work Still Required

- Design and build the restaurant dashboard for incoming order decisions,
  earnings, payout requests, payout history, and account details.
- Design and build the admin dashboard for onboarding, catalog management,
  rejected-order cases, payout operations, and live activity.

## Deferred Until After MVP

- Mixed-restaurant carts and split orders.
- Live rider coordinates and route history.
- Promotions, coupons, subscriptions, loyalty points, and wallet balances.
- Inventory counts and ingredient-level stock.
- Scheduled orders and multiple deliveries per order.
- Partial payments, tips, disputes, and complex refunds.
- Multiple currencies.

## Next Schema Step

After this model is accepted, install the PostgreSQL ORM and translate these
tables into the first migration in this order:

1. Identity and service areas.
2. Operational onboarding, restaurant memberships, and payout accounts.
3. Restaurants, menu items, and combos.
4. Orders, restaurant decisions, issues, payments, and deliveries.
5. Earnings, referrals, commissions, payout requests, and payouts.
6. Notifications, activity events, and reviews.
