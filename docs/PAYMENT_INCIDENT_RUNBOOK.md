# Payment incident and RoutePay webhook logs

## Where logs live

Every RoutePay webhook and every browser-triggered server verification is written
to `payment_provider_events`. A matching structured JSON line with
`"type":"payment_provider_event"` is also written to the API hosting provider's
application logs.

The database record is the durable audit log. It includes Mando's request ID,
order/payment IDs, merchant and transaction references, the status reported by
the webhook, the status independently returned by RoutePay, RoutePay's
`x-correlation-id`, sanitized payloads, the outcome, and UTC timestamps.
Card, authorization, token, secret, password, and account-number fields are
redacted before storage.

Recent events can be exported from Neon SQL Editor with:

```sql
select
  received_at,
  request_id,
  source,
  outcome,
  merchant_reference,
  transaction_reference,
  reported_status,
  verified_status,
  provider_correlation_id,
  http_status,
  payload,
  verification_response,
  error_message
from payment_provider_events
order by received_at desc
limit 200;
```

Filter one transaction before sharing it with RoutePay:

```sql
select *
from payment_provider_events
where transaction_reference = 'ROUTEPAY_REFERENCE_HERE'
   or merchant_reference = 'MANDO_REFERENCE_HERE'
order by received_at;
```

## Identifying the August 12 false confirmations

Before this fix, the customer-facing fallback endpoint could mark an order paid
without querying RoutePay. Those transitions used the note `Payment confirmed.`
and normally recorded the customer as actor. Find candidates with:

```sql
select
  o.id as order_id,
  o.order_number,
  o.status as order_status,
  p.id as payment_id,
  p.status as payment_status,
  p.provider_reference,
  p.customer_reference,
  p.amount,
  p.verified_at,
  ose.actor_user_id,
  ose.note
from payments p
join orders o on o.id = p.order_id
join order_status_events ose
  on ose.order_id = o.id
 and ose.status = 'awaiting_restaurant'
where p.provider = 'routepay'
  and p.status = 'verified'
  and ose.note = 'Payment confirmed.'
  and p.verified_at >= timestamptz '2026-08-12 00:00:00+01'
  and p.verified_at <  timestamptz '2026-08-13 00:00:00+01'
order by p.verified_at;
```

Treat these as candidates, not proof. Compare each provider reference with
RoutePay before correcting payment/order/earning/commission state. Preserve an
export of the original rows before making corrections.

## Required production configuration

1. Run `npm run db:migrate` before deploying the API code.
2. Set a long random `ROUTEPAY_WEBHOOK_USERNAME` and
   `ROUTEPAY_WEBHOOK_PASSWORD` on the API host.
3. Give RoutePay this production webhook URL and the same Basic Auth values:
   `https://API_HOST/customer/payments/routepay/webhook`.
4. Set `ROUTEPAY_DEBUG=true` temporarily only when deeper provider request logs
   are needed; turn it off after the incident because durable audit records are
   always created now.

In production, webhook requests fail closed when either Basic Auth setting is
missing. A webhook never marks an order paid on its own: Mando queries RoutePay's
`GetTransaction` endpoint and requires a final successful status. RoutePay must
return an amount and currency, and both must match Mando's payment record.
