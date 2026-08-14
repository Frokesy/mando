-- One-time cleanup requested after the payment incident.
-- payment_provider_events are intentionally retained; their order/payment FKs become NULL.
-- Run only after taking a database backup and reviewing the preview query below.

-- Preview before applying:
-- SELECT id, order_number, created_at
-- FROM orders
-- WHERE status = 'pending_payment'
-- ORDER BY created_at DESC;

UPDATE "referrals" AS r
SET
  "status" = 'attributed',
  "first_eligible_order_id" = NULL
FROM "orders" AS o
WHERE r."first_eligible_order_id" = o."id"
  AND o."status" = 'pending_payment';
--> statement-breakpoint
DELETE FROM "commissions" AS c
USING "orders" AS o
WHERE c."order_id" = o."id"
  AND o."status" = 'pending_payment';
--> statement-breakpoint
DELETE FROM "orders"
WHERE "status" = 'pending_payment';
