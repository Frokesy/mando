import { getRoutePayConfig } from '../config/routepay.js'

type RoutePayTokenResponse = {
  access_token?: string
  accessToken?: string
  token_type?: string
  expires_in?: number
}

type RoutePayHostedPaymentRequest = {
  amount: number
  currency: string
  merchantId: string
  merchantReference: string
  customerName: string
  customerEmail: string
  customerPhone: string
  description: string
  callbackUrl: string
}

type RoutePayHostedPaymentResponse = {
  redirectUrl?: string
  RedirectUrl?: string
  transactionReference?: string
  TransactionReference?: string
  merchantReference?: string
  MerchantReference?: string
  responseCode?: string
  ResponseCode?: string
  responseMessage?: string
  ResponseMessage?: string
  message?: string
  error?: string
  error_description?: string
}

export type HostedPaymentResult = {
  redirectUrl: string
  transactionReference: string | null
  merchantReference: string
  raw: RoutePayHostedPaymentResponse
}

export type RoutePayTransactionResult = {
  status: 'successful' | 'failed' | 'pending' | 'unknown'
  rawStatus: string | null
  httpStatus: number
  correlationId: string | null
  amount: number | null
  currency: string | null
  raw: Record<string, unknown> | null
}

export async function getRoutePayTransaction(
  transactionReference: string,
): Promise<RoutePayTransactionResult> {
  const config = getRoutePayConfig()
  const accessToken = await getRoutePayAccessToken()
  const url = `${config.apiBaseUrl.replace(/\/$/, '')}/payment/api/v1/Payment/GetTransaction/${encodeURIComponent(transactionReference)}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const responseText = await response.text()
  const responseBody = parseJson<Record<string, unknown>>(responseText)
  const rawStatus = findStatusValue(responseBody)
  const correlationId = response.headers.get('x-correlation-id')

  logRoutePayDebug('GetTransaction response', {
    status: response.status,
    correlationId,
    transactionReference,
    body: responseBody ?? responseText,
  })

  if (!response.ok) {
    throw new RoutePayVerificationError(
      `RoutePay verification failed with HTTP ${response.status}.`,
      response.status,
      correlationId,
      responseBody,
    )
  }

  return {
    status: normalizeRoutePayTransactionStatus(rawStatus),
    rawStatus,
    httpStatus: response.status,
    correlationId,
    amount: findNumberValue(responseBody, ['amount', 'Amount', 'totalAmount', 'TotalAmount']),
    currency: findStringValue(responseBody, ['currency', 'Currency']),
    raw: responseBody,
  }
}

function findStringValue(
  payload: Record<string, unknown> | null,
  keys: string[],
): string | null {
  if (!payload) return null
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  for (const value of Object.values(payload)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = findStringValue(value as Record<string, unknown>, keys)
      if (nested) return nested
    }
  }
  return null
}

function findNumberValue(
  payload: Record<string, unknown> | null,
  keys: string[],
): number | null {
  const value = findStringValue(payload, keys)
  if (value !== null) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (!payload) return null
  for (const key of keys) {
    const candidate = payload[key]
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate
  }
  for (const candidate of Object.values(payload)) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const nested = findNumberValue(candidate as Record<string, unknown>, keys)
      if (nested !== null) return nested
    }
  }
  return null
}

export class RoutePayVerificationError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly correlationId: string | null,
    readonly responseBody: Record<string, unknown> | null,
  ) {
    super(message)
  }
}

export function normalizeRoutePayTransactionStatus(status: string | null) {
  const normalized = status?.trim().toLowerCase()
  if (['0', '00', 'success', 'successful', 'paid', 'completed'].includes(normalized ?? '')) {
    return 'successful' as const
  }
  if (['550', '220', 'failed', 'failure', 'cancelled', 'canceled', 'declined'].includes(normalized ?? '')) {
    return 'failed' as const
  }
  if (['250', '260', 'pending', 'processing', '210', 'already processed'].includes(normalized ?? '')) {
    return 'pending' as const
  }
  return 'unknown' as const
}

function findStatusValue(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null
  const keys = ['paymentStatus', 'PaymentStatus', 'status', 'Status', 'statusCode', 'StatusCode', 'responseCode', 'ResponseCode']
  for (const key of keys) {
    const value = findScalarValue(payload, key)
    if (value !== null) return value
  }
  return null
}

function findScalarValue(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key]
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  for (const candidate of Object.values(payload)) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const nested = findScalarValue(candidate as Record<string, unknown>, key)
      if (nested !== null) return nested
    }
  }
  return null
}

export async function createRoutePayHostedPayment(
  request: RoutePayHostedPaymentRequest,
): Promise<HostedPaymentResult> {
  const config = getRoutePayConfig()
  const accessToken = await getRoutePayAccessToken()
  const normalizedAmount = Math.round(Number(request.amount))

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error('RoutePay amount must be a positive integer.')
  }

  const routePayPayload = {
    merchantId: request.merchantId,
    returnUrl: request.callbackUrl,
    merchantReference: request.merchantReference,
    totalAmount: String(normalizedAmount),
    currency: request.currency,
    paymentType: 'PAYMENT',
    customer: {
      email: request.customerEmail,
      mobile: request.customerPhone,
      firstname: getFirstName(request.customerName),
      lastname: getLastName(request.customerName),
      username: request.customerEmail,
    },
    products: [
      {
        name: request.description,
        unitPrice: String(normalizedAmount),
        quantity: 1,
      },
    ],
  }

  logRoutePayDebug('SetRequest payload', {
    url: `${config.apiBaseUrl.replace(/\/$/, '')}/payment/api/v1/Payment/SetRequest`,
    payload: routePayPayload,
  })

  const response = await fetch(
    `${config.apiBaseUrl.replace(/\/$/, '')}/payment/api/v1/Payment/SetRequest`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(routePayPayload),
    },
  )

  const responseText = await response.text()
  const responseBody = parseJson<RoutePayHostedPaymentResponse>(responseText)

  logRoutePayDebug('SetRequest response', {
    status: response.status,
    ok: response.ok,
    body: responseBody ?? responseText,
  })

  if (!response.ok || !responseBody) {
    throw new Error(
      responseBody?.message ??
        responseBody?.responseMessage ??
        responseBody?.ResponseMessage ??
        responseBody?.error_description ??
        responseBody?.error ??
        `RoutePay payment request failed with HTTP ${response.status}. ${responseText.slice(0, 180)}`,
    )
  }

  const redirectUrl = responseBody.redirectUrl ?? responseBody.RedirectUrl

  if (!redirectUrl) {
    throw new Error('RoutePay did not return a hosted payment URL.')
  }

  return {
    redirectUrl,
    transactionReference:
      responseBody.transactionReference ??
      responseBody.TransactionReference ??
      null,
    merchantReference:
      responseBody.merchantReference ??
      responseBody.MerchantReference ??
      request.merchantReference,
    raw: responseBody,
  }
}

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || 'Customer'
}

function getLastName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  return parts.length > 1 ? parts.slice(1).join(' ') : 'MANDO'
}

async function getRoutePayAccessToken() {
  const config = getRoutePayConfig()
  logRoutePayDebug('Token request', {
    url: config.authUrl,
    clientId: config.clientId,
  })

  const response = await fetch(config.authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  })

  const responseText = await response.text()
  const responseBody = parseJson<RoutePayTokenResponse>(responseText)

  logRoutePayDebug('Token response', {
    status: response.status,
    ok: response.ok,
    body: responseBody
      ? {
          ...responseBody,
          access_token: responseBody.access_token ? '[redacted]' : undefined,
          accessToken: responseBody.accessToken ? '[redacted]' : undefined,
        }
      : responseText,
  })

  const accessToken = responseBody?.access_token ?? responseBody?.accessToken

  if (!response.ok || !accessToken) {
    throw new Error(
      `Unable to authenticate with RoutePay. HTTP ${response.status}. ${responseText.slice(0, 180)}`,
    )
  }

  return accessToken
}

function logRoutePayDebug(label: string, data: unknown) {
  if (process.env.ROUTEPAY_DEBUG !== 'true') return

  console.log(`[RoutePay] ${label}:`)
  console.dir(data, { depth: null })
}

function parseJson<T>(value: string) {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}
