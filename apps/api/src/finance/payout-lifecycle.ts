import { and, asc, eq, inArray, isNull } from 'drizzle-orm'

import { database } from '../db/client.js'
import {
  commissions,
  deliveries,
  orders,
  payoutItems,
  payoutRequests,
  payouts,
  restaurantEarnings,
} from '../db/schema.js'

type PayoutType = 'agent_commissions' | 'rider_earnings' | 'restaurant_earnings'
type ReviewStatus = 'approved' | 'rejected'

export async function createAllocatedPayoutRequest(input: {
  type: PayoutType
  requestedByUserId: string
  payoutAccountId: string
  userId?: string
  restaurantId?: string
}) {
  return database.transaction(async (tx) => {
    const candidateSources = input.type === 'agent_commissions'
      ? await tx.select({ id: commissions.id, amount: commissions.commissionAmount })
          .from(commissions)
          .leftJoin(payoutItems, eq(payoutItems.commissionId, commissions.id))
          .where(and(
            eq(commissions.salesAgentId, input.userId!),
            inArray(commissions.status, ['earned', 'approved']),
            isNull(payoutItems.id),
          )).orderBy(asc(commissions.createdAt))
      : input.type === 'rider_earnings'
        ? await tx.select({ id: deliveries.id, amount: deliveries.riderEarningAmount })
            .from(deliveries)
            .innerJoin(orders, eq(deliveries.orderId, orders.id))
            .leftJoin(payoutItems, eq(payoutItems.deliveryId, deliveries.id))
            .where(and(
              eq(deliveries.riderId, input.userId!),
              eq(deliveries.status, 'delivered'),
              eq(orders.status, 'delivered'),
              isNull(payoutItems.id),
            )).orderBy(asc(deliveries.createdAt))
        : await tx.select({ id: restaurantEarnings.id, amount: restaurantEarnings.netAmount })
            .from(restaurantEarnings)
            .leftJoin(payoutItems, eq(payoutItems.restaurantEarningId, restaurantEarnings.id))
            .where(and(
              eq(restaurantEarnings.restaurantId, input.restaurantId!),
              eq(restaurantEarnings.status, 'available'),
              isNull(payoutItems.id),
            )).orderBy(asc(restaurantEarnings.createdAt))

    const legacyReservedAmount = input.type === 'restaurant_earnings'
      ? 0
      : await tx.select({ amount: payoutRequests.amount })
          .from(payoutRequests)
          .leftJoin(payouts, eq(payouts.payoutRequestId, payoutRequests.id))
          .where(and(
            eq(payoutRequests.type, input.type),
            eq(payoutRequests.userId, input.userId!),
            inArray(payoutRequests.status, ['pending', 'under_review', 'approved', 'processing', 'paid']),
            isNull(payouts.id),
          ))
          .then((rows) => rows.reduce((total, row) => total + row.amount, 0))
    const sources = excludeLegacyReservedSources(candidateSources, legacyReservedAmount)

    const amount = sources.reduce((total, source) => total + source.amount, 0)
    if (amount <= 0) return null

    const [request] = await tx.insert(payoutRequests).values({
      requestedByUserId: input.requestedByUserId,
      userId: input.userId,
      restaurantId: input.restaurantId,
      type: input.type,
      payoutAccountId: input.payoutAccountId,
      amount,
    }).returning()

    const [payout] = await tx.insert(payouts).values({
      payoutRequestId: request.id,
      userId: input.userId,
      restaurantId: input.restaurantId,
      type: input.type,
      amount,
    }).returning({ id: payouts.id })

    await tx.insert(payoutItems).values(sources.map((source) => ({
      payoutId: payout.id,
      amount: source.amount,
      ...(input.type === 'agent_commissions' ? { commissionId: source.id } : {}),
      ...(input.type === 'rider_earnings' ? { deliveryId: source.id } : {}),
      ...(input.type === 'restaurant_earnings' ? { restaurantEarningId: source.id } : {}),
    })))

    if (input.type === 'restaurant_earnings') {
      await tx.update(restaurantEarnings).set({ status: 'requested', updatedAt: new Date() })
        .where(inArray(restaurantEarnings.id, sources.map((source) => source.id)))
    }

    return request
  })
}

export function excludeLegacyReservedSources<T extends { amount: number }>(sources: T[], reservedAmount: number) {
  let remainingReserved = reservedAmount
  return sources.filter((source) => {
    if (remainingReserved <= 0) return true
    remainingReserved -= source.amount
    return false
  })
}

export async function reviewAllocatedPayoutRequest(
  requestId: string,
  expectedType: PayoutType,
  status: ReviewStatus,
) {
  return database.transaction(async (tx) => {
    const [request] = await tx.select().from(payoutRequests).where(and(
      eq(payoutRequests.id, requestId),
      eq(payoutRequests.type, expectedType),
      inArray(payoutRequests.status, ['pending', 'under_review']),
    )).limit(1)
    if (!request) return null

    const [payout] = await tx.select({ id: payouts.id }).from(payouts)
      .where(eq(payouts.payoutRequestId, request.id)).limit(1)

    if (payout) {
      const items = await tx.select().from(payoutItems).where(eq(payoutItems.payoutId, payout.id))
      const commissionIds = items.flatMap((item) => item.commissionId ? [item.commissionId] : [])
      const restaurantEarningIds = items.flatMap((item) => item.restaurantEarningId ? [item.restaurantEarningId] : [])

      if (status === 'approved') {
        if (commissionIds.length) {
          await tx.update(commissions).set({ status: 'paid', updatedAt: new Date() })
            .where(inArray(commissions.id, commissionIds))
        }
        if (restaurantEarningIds.length) {
          await tx.update(restaurantEarnings).set({ status: 'paid', updatedAt: new Date() })
            .where(inArray(restaurantEarnings.id, restaurantEarningIds))
        }
        await tx.update(payouts).set({ status: 'paid', processedAt: new Date(), updatedAt: new Date() })
          .where(eq(payouts.id, payout.id))
      } else {
        if (restaurantEarningIds.length) {
          await tx.update(restaurantEarnings).set({ status: 'available', updatedAt: new Date() })
            .where(inArray(restaurantEarnings.id, restaurantEarningIds))
        }
        await tx.delete(payoutItems).where(eq(payoutItems.payoutId, payout.id))
        await tx.update(payouts).set({ status: 'failed', processedAt: new Date(), updatedAt: new Date() })
          .where(eq(payouts.id, payout.id))
      }
    }

    const [updatedRequest] = await tx.update(payoutRequests).set({
      status,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(payoutRequests.id, request.id)).returning({
      id: payoutRequests.id,
      userId: payoutRequests.userId,
      restaurantId: payoutRequests.restaurantId,
      status: payoutRequests.status,
    })
    return updatedRequest
  })
}
