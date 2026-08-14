import { database } from '../db/client.js'
import { payoutAccounts } from '../db/schema.js'
export {
  decryptPayoutAccountNumber,
  encryptPayoutAccountNumber,
} from './payout-account-crypto.js'
import { encryptPayoutAccountNumber } from './payout-account-crypto.js'

type PayoutAccountInput = {
  bankName: string
  accountName: string
  accountNumber: string
}

export async function saveUserPayoutAccount(userId: string, input: PayoutAccountInput) {
  const values = {
    bankCode: input.bankName,
    accountName: input.accountName,
    accountNumberEncrypted: encryptPayoutAccountNumber(input.accountNumber),
    accountNumberLast4: input.accountNumber.slice(-4),
    isVerified: false,
    collectedByAdminId: null,
    updatedAt: new Date(),
  }
  const [created] = await database.insert(payoutAccounts).values({ userId, ...values }).returning()
  return created
}

export async function saveRestaurantPayoutAccount(restaurantId: string, input: PayoutAccountInput) {
  const values = {
    bankCode: input.bankName,
    accountName: input.accountName,
    accountNumberEncrypted: encryptPayoutAccountNumber(input.accountNumber),
    accountNumberLast4: input.accountNumber.slice(-4),
    isVerified: false,
    collectedByAdminId: null,
    updatedAt: new Date(),
  }
  const [created] = await database
    .insert(payoutAccounts)
    .values({ restaurantId, ...values })
    .returning()
  return created
}
