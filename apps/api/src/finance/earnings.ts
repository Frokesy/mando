export function isRealizedCommissionStatus(status: string) {
  return ['earned', 'approved', 'paid'].includes(status)
}

export function isWithdrawableCommissionStatus(status: string) {
  return ['earned', 'approved'].includes(status)
}

export function canQualifyReferralFromDeliveredOrder(
  referralStatus: string,
  previousOrderStatus: string | null,
) {
  return referralStatus === 'attributed' ||
    (referralStatus === 'qualified' && previousOrderStatus !== 'delivered')
}
