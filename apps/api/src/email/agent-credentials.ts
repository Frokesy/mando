import nodemailer from 'nodemailer'

import { buildWebUrl } from '../config/web-url.js'

type AgentCredentialsEmail = {
  email: string
  fullName: string
  agentCode: string
  password: string
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
