UPDATE "commissions" AS c
SET
  "status" = 'reversed',
  "updated_at" = NOW()
FROM "orders" AS o
WHERE c."order_id" = o."id"
  AND o."status" <> 'delivered'
  AND c."status" IN ('pending', 'earned', 'approved');
--> statement-breakpoint
UPDATE "restaurant_earnings" AS re
SET
  "status" = 'reversed',
  "updated_at" = NOW()
FROM "orders" AS o
WHERE re."order_id" = o."id"
  AND o."status" IN ('cancelled', 'refunded', 'restaurant_rejected');
--> statement-breakpoint
UPDATE "referrals" AS r
SET
  "status" = 'attributed',
  "first_eligible_order_id" = NULL
FROM "orders" AS o
WHERE r."first_eligible_order_id" = o."id"
  AND o."status" <> 'delivered';
