import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const coverage = {
  customer: {
    file: '../routes/customer.ts',
    types: [
      'order_created',
      'order_cancelled',
      'order_issue_reported',
      'admin_customer_order_created',
      'admin_order_cancelled',
      'admin_customer_order_issue',
    ],
  },
  payment: {
    file: '../routes/routepay.ts',
    types: [
      'payment_verified',
      'payment_failed',
      'restaurant_new_order',
      'admin_payment_verified',
      'admin_payment_failed',
    ],
  },
  restaurant: {
    file: '../routes/restaurant.ts',
    types: [
      'restaurant_accepted_order',
      'restaurant_rejected_order',
      'order_ready_for_pickup',
      'pickup_ready',
      'restaurant_payout_requested',
      'admin_restaurant_payout_requested',
      'admin_restaurant_rejected_order',
    ],
  },
  rider: {
    file: '../routes/rider.ts',
    types: [
      'rider_payout_requested',
      'admin_rider_payout_requested',
      'rider_accepted_delivery',
      'order_picked_up',
      'order_delivered',
      'restaurant_order_picked_up',
      'restaurant_order_delivered',
      'commission_earned',
      'admin_order_delivered',
    ],
  },
  salesAgent: {
    file: '../routes/sales-agent.ts',
    types: [
      'sales_agent_downline_application',
      'sales_agent_influencer_qualified',
      'agent_payout_requested',
      'admin_agent_payout_requested',
    ],
  },
  admin: {
    file: '../routes/admin.ts',
    types: [
      'rider_payout_reviewed',
      'restaurant_payout_reviewed',
      'agent_payout_reviewed',
      'payment_refunded',
      'restaurant_order_refunded',
      'commission_reversed',
      'sales_agent_account_approved',
      'sales_agent_status_changed',
      'sales_agent_tier_changed',
      'restaurant_account_approved',
      'restaurant_status_changed',
    ],
  },
} as const

for (const [area, contract] of Object.entries(coverage)) {
  test(`${area} notification event contract remains covered`, async () => {
    const source = await readFile(new URL(contract.file, import.meta.url), 'utf8')
    for (const type of contract.types) {
      assert.equal(
        source.includes(`'${type}'`) || source.includes(`\"${type}\"`),
        true,
        `Missing ${type}`,
      )
    }
  })
}
