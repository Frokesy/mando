import nodemailer from 'nodemailer'

import { buildWebUrl } from '../config/web-url.js'

type AgentCredentialsEmail = {
  email: string
  fullName: string
  agentCode: string
  password: string
}

type RiderCredentialsEmail = {
  email: string
  fullName: string
  riderCode: string
  password: string | null
}

type RestaurantCredentialsEmail = {
  email: string
  fullName: string
  restaurantName: string
  password: string | null
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

export async function sendAgentCredentialsEmail(input: AgentCredentialsEmail) {
  const config = getEmailConfig()
  const loginUrl = buildWebUrl('/sales-agent/login')
  const subject = 'Your Mando sales agent login details'
  const text = [
    `Hello ${input.fullName},`,
    '',
    'Your Mando sales agent account has been created.',
    `Agent code: ${input.agentCode}`,
    `Password: ${input.password}`,
    `Login: ${loginUrl}`,
    '',
    'Keep these details private. You can use them to sign in to your sales agent dashboard.',
  ].join('\n')
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#141b34;max-width:560px;margin:auto">
      <h1 style="font-size:24px">Welcome to Mando</h1>
      <p>Hello ${escapeHtml(input.fullName)},</p>
      <p>Your Mando sales agent account has been created. Use these details to sign in:</p>
      <div style="background:#f8f8f8;border:1px solid #e9eaeb;border-radius:12px;padding:16px">
        <p style="margin:0 0 8px"><strong>Agent code:</strong> ${escapeHtml(input.agentCode)}</p>
        <p style="margin:0"><strong>Password:</strong> ${escapeHtml(input.password)}</p>
      </div>
      <p><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#dfb400;color:#141b34;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">Sign in to Mando</a></p>
      <p style="color:#6b6b6b">Keep these details private.</p>
    </div>
  `

  if (config.host === 'smtp.resend.com') {
    const messageId = await sendWithResendApi({
      apiKey: config.password,
      from: config.from,
      to: input.email,
      subject,
      text,
      html,
      idempotencyKey: `agent-credentials/${input.agentCode}`,
    })
    return { provider: 'resend' as const, messageId }
  }

  const result = await getTransporter(config).sendMail({
    from: config.from,
    to: input.email,
    subject,
    text,
    html,
  })

  if (!result.messageId) throw new Error('SMTP provider accepted the request without a message ID.')
  return { provider: 'smtp' as const, messageId: result.messageId }
}

export async function sendRiderCredentialsEmail(input: RiderCredentialsEmail) {
  const loginUrl = buildWebUrl('/rider/login')
  const passwordLine = input.password
    ? `Temporary password: ${input.password}`
    : 'Password: Use the password already attached to your Mando account.'
  return sendCredentialMessage({
    email: input.email,
    subject: 'Your Mando rider login details',
    idempotencyKey: `rider-credentials/${input.riderCode}`,
    text: [
      `Hello ${input.fullName},`, '',
      'Your Mando rider account has been created.',
      `Rider code: ${input.riderCode}`,
      passwordLine,
      `Login: ${loginUrl}`, '',
      'Keep these details private.',
    ].join('\n'),
    html: credentialHtml({
      fullName: input.fullName,
      intro: 'Your Mando rider account has been created. Use these details to sign in:',
      details: [
        ['Rider code', input.riderCode],
        ['Password', input.password ?? 'Use your existing Mando password'],
      ],
      loginUrl,
    }),
  })
}

export async function sendRestaurantCredentialsEmail(input: RestaurantCredentialsEmail) {
  const loginUrl = buildWebUrl('/restaurant/login')
  const passwordLine = input.password
    ? `Temporary password: ${input.password}`
    : 'Password: Use the password already attached to your Mando account.'
  return sendCredentialMessage({
    email: input.email,
    subject: 'Your Mando restaurant login details',
    idempotencyKey: `restaurant-credentials/${input.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    text: [
      `Hello ${input.fullName},`, '',
      `Your Mando restaurant account for ${input.restaurantName} has been created.`,
      `Email: ${input.email}`,
      passwordLine,
      `Login: ${loginUrl}`, '',
      'Keep these details private.',
    ].join('\n'),
    html: credentialHtml({
      fullName: input.fullName,
      intro: `Your Mando restaurant account for ${input.restaurantName} has been created. Use these details to sign in:`,
      details: [
        ['Email', input.email],
        ['Password', input.password ?? 'Use your existing Mando password'],
      ],
      loginUrl,
    }),
  })
}

async function sendCredentialMessage(input: {
  email: string
  subject: string
  idempotencyKey: string
  text: string
  html: string
}) {
  const config = getEmailConfig()
  if (config.host === 'smtp.resend.com') {
    const messageId = await sendWithResendApi({
      apiKey: config.password,
      from: config.from,
      to: input.email,
      subject: input.subject,
      text: input.text,
      html: input.html,
      idempotencyKey: input.idempotencyKey,
    })
    return { provider: 'resend' as const, messageId }
  }

  const result = await getTransporter(config).sendMail({
    from: config.from,
    to: input.email,
    subject: input.subject,
    text: input.text,
    html: input.html,
  })
  if (!result.messageId) throw new Error('SMTP provider accepted the request without a message ID.')
  return { provider: 'smtp' as const, messageId: result.messageId }
}

function credentialHtml(input: {
  fullName: string
  intro: string
  details: [string, string][]
  loginUrl: string
}) {
  const details = input.details
    .map(([label, value]) => `<p style="margin:0 0 8px"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`)
    .join('')
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#141b34;max-width:560px;margin:auto">
      <h1 style="font-size:24px">Welcome to Mando</h1>
      <p>Hello ${escapeHtml(input.fullName)},</p>
      <p>${escapeHtml(input.intro)}</p>
      <div style="background:#f8f8f8;border:1px solid #e9eaeb;border-radius:12px;padding:16px">${details}</div>
      <p><a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;background:#dfb400;color:#141b34;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">Sign in to Mando</a></p>
      <p style="color:#6b6b6b">Keep these details private.</p>
    </div>
  `
}

async function sendWithResendApi(input: {
  apiKey: string
  from: string
  to: string
  subject: string
  text: string
  html: string
  idempotencyKey: string
}) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
      'User-Agent': 'mando-api/0.1.0',
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(`Resend email failed (${response.status}): ${result?.message ?? response.statusText}`)
  }

  const result = (await response.json().catch(() => null)) as { id?: unknown } | null
  if (!result || typeof result.id !== 'string' || !result.id.trim()) {
    throw new Error('Resend accepted the request without returning an email ID.')
  }

  return result.id
}

function getEmailConfig() {
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const password = process.env.SMTP_PASSWORD
  const from = process.env.EMAIL_FROM?.trim()

  if (!host || !user || !password || !from) {
    throw new Error('SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM must be configured.')
  }

  const port = Number(process.env.SMTP_PORT ?? 587)
  if (!Number.isInteger(port) || port <= 0) throw new Error('SMTP_PORT must be a valid port number.')

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    user,
    password,
    from,
  }
}

function getTransporter(config: ReturnType<typeof getEmailConfig>) {
  transporter ??= nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  })

  return transporter
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character]!)
}
