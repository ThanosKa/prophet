import { Resend } from 'resend'
import { logger } from '@/lib/logger'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || 'MISSING_KEY')
  }
  return _resend
}

const FROM_EMAIL = 'Prophet <hello@notifications.app-whisper.com>'

export interface SendWelcomeEmailParams {
  to: string
  firstName?: string | null
  lastName?: string | null
}

export interface SendPurchaseEmailParams {
  to: string
  firstName?: string | null
  lastName?: string | null
  planName: string
  credits: number
  isSubscription: boolean
}

export async function sendWelcomeEmail({ to, firstName, lastName }: SendWelcomeEmailParams) {
  const html = buildWelcomeHtml({ firstName, lastName })

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: buildWelcomeSubject({ firstName }),
      html,
    })

    if (error) {
      logger.error({ error, to }, 'Failed to send welcome email')
      return
    }

    logger.info({ emailId: data?.id, to }, 'Welcome email sent')
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err), to }, 'Welcome email send threw')
  }
}

export async function sendPurchaseEmail(params: SendPurchaseEmailParams) {
  const html = buildPurchaseHtml(params)

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Your Prophet receipt — ${params.planName}`,
      html,
    })

    if (error) {
      logger.error({ error, to: params.to }, 'Failed to send purchase email')
      return
    }

    logger.info({ emailId: data?.id, to: params.to, plan: params.planName }, 'Purchase email sent')
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err), to: params.to }, 'Purchase email send threw')
  }
}

function buildWelcomeSubject({ firstName }: { firstName?: string | null }): string {
  return firstName ? `Welcome to Prophet, ${firstName}!` : 'Welcome to Prophet!'
}

function formatName(firstName?: string | null, lastName?: string | null): string | null {
  const parts = [firstName, lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : null
}

// ─── Shared email style constants ───

const GOLD_PRIMARY = '#D4960A'
const GOLD_GRADIENT_START = '#FFD700'
const GOLD_GRADIENT_END = '#9E7C0C'
const DARK_BG = '#1C1917'
const CARD_BG = '#FFFFFF'
const TEXT_PRIMARY = '#1C1917'
const TEXT_SECONDARY = '#78716C'
const TEXT_MUTED = '#A8A29E'
const BORDER_COLOR = '#E7E5E4'
const LOGO_URL = 'https://prophetchrome.com/logo.png'
const APP_URL = 'https://prophetchrome.com'

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Prophet</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F5F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F4;">
<tr><td align="center" style="padding:40px 16px;">

<!-- Outer card -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<!-- Gold header bar -->
<tr>
<td style="background:linear-gradient(135deg,${GOLD_GRADIENT_START},${GOLD_GRADIENT_END});padding:32px 40px;text-align:center;">
<a href="${APP_URL}" style="text-decoration:none;">
<img src="${LOGO_URL}" alt="Prophet" width="48" height="48" style="display:inline-block;vertical-align:middle;border:0;" />
<span style="display:inline-block;vertical-align:middle;margin-left:12px;font-size:24px;font-weight:700;color:${DARK_BG};letter-spacing:-0.5px;">Prophet</span>
</a>
</td>
</tr>

<!-- White card body -->
<tr>
<td style="background-color:${CARD_BG};padding:40px;">
${content}
</td>
</tr>

<!-- Footer -->
<tr>
<td style="background-color:#FAFAF9;padding:24px 40px;border-top:1px solid ${BORDER_COLOR};text-align:center;">
<p style="margin:0 0 8px 0;font-size:13px;color:${TEXT_MUTED};">
<a href="${APP_URL}" style="color:${TEXT_MUTED};text-decoration:underline;">prophetchrome.com</a>
</p>
<p style="margin:0;font-size:12px;color:${TEXT_MUTED};">
You're receiving this because you signed up for Prophet.
</p>
</td>
</tr>

</table>
<!-- /Outer card -->

</td></tr>
</table>
</body>
</html>`
}

export function buildWelcomeHtml({ firstName, lastName }: { firstName?: string | null; lastName?: string | null }): string {
  const fullName = formatName(firstName, lastName)
  const greeting = fullName ? `Welcome to Prophet, ${fullName}!` : 'Welcome to Prophet!'

  const content = `
<h1 style="margin:0 0 16px 0;font-size:26px;font-weight:700;color:${TEXT_PRIMARY};line-height:1.3;">
${greeting}
</h1>
<p style="margin:0 0 28px 0;font-size:16px;color:${TEXT_SECONDARY};line-height:1.6;">
You just unlocked a powerful AI assistant that lives right inside your browser. Here's how to get started:
</p>

<!-- Step 1 -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
<tr>
<td width="48" valign="top">
<div style="width:36px;height:36px;border-radius:50%;background-color:${GOLD_PRIMARY};color:#FFFFFF;font-size:16px;font-weight:700;text-align:center;line-height:36px;">1</div>
</td>
<td valign="top" style="padding-left:12px;">
<p style="margin:0 0 4px 0;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">Install the Chrome Extension</p>
<p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};line-height:1.5;">Add Prophet to Chrome from the Web Store. One click and you're set.</p>
</td>
</tr>
</table>

<!-- Step 2 -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
<tr>
<td width="48" valign="top">
<div style="width:36px;height:36px;border-radius:50%;background-color:${GOLD_PRIMARY};color:#FFFFFF;font-size:16px;font-weight:700;text-align:center;line-height:36px;">2</div>
</td>
<td valign="top" style="padding-left:12px;">
<p style="margin:0 0 4px 0;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">Open the Side Panel</p>
<p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};line-height:1.5;">Click the Prophet icon on any webpage to open the AI side panel.</p>
</td>
</tr>
</table>

<!-- Step 3 -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
<tr>
<td width="48" valign="top">
<div style="width:36px;height:36px;border-radius:50%;background-color:${GOLD_PRIMARY};color:#FFFFFF;font-size:16px;font-weight:700;text-align:center;line-height:36px;">3</div>
</td>
<td valign="top" style="padding-left:12px;">
<p style="margin:0 0 4px 0;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">Chat with Claude AI</p>
<p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};line-height:1.5;">Ask questions, analyze pages, automate tasks — Claude is at your fingertips with 18 built-in tools.</p>
</td>
</tr>
</table>

<!-- Free credits callout -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
<tr>
<td style="background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:16px 20px;">
<p style="margin:0;font-size:14px;color:#92400E;line-height:1.5;">
<strong>Your free credits are ready.</strong> Every new account includes $0.20 in API credits so you can try Prophet risk-free. Upgrade anytime for more credits and bonus value.
</p>
</td>
</tr>
</table>

<!-- CTA button -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="center">
<a href="https://chromewebstore.google.com/detail/prophet/febgdmgcdimmjfkfblbpjmkjfepmfkif" style="display:inline-block;padding:14px 32px;background-color:${GOLD_PRIMARY};color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
Install Prophet Extension
</a>
</td>
</tr>
</table>
`

  return emailWrapper(content)
}

export function buildPurchaseHtml(params: SendPurchaseEmailParams): string {
  const { firstName, lastName, planName, credits, isSubscription } = params
  const fullName = formatName(firstName, lastName)
  const greeting = fullName ? `Thank you, ${fullName}!` : 'Thank you for your purchase!'
  const creditsFormatted = `$${(credits / 100).toFixed(2)}`
  const typeLabel = isSubscription ? 'Subscription' : 'One-time purchase'

  const content = `
<h1 style="margin:0 0 16px 0;font-size:26px;font-weight:700;color:${TEXT_PRIMARY};line-height:1.3;">
${greeting}
</h1>
<p style="margin:0 0 28px 0;font-size:16px;color:${TEXT_SECONDARY};line-height:1.6;">
Your payment has been confirmed. Here's your receipt:
</p>

<!-- Receipt card -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;border:1px solid ${BORDER_COLOR};border-radius:8px;overflow:hidden;">

<!-- Receipt header -->
<tr>
<td style="background-color:#FAFAF9;padding:16px 20px;border-bottom:1px solid ${BORDER_COLOR};">
<p style="margin:0;font-size:14px;font-weight:600;color:${TEXT_PRIMARY};text-transform:uppercase;letter-spacing:0.5px;">
Receipt
</p>
</td>
</tr>

<!-- Plan -->
<tr>
<td style="padding:14px 20px;border-bottom:1px solid ${BORDER_COLOR};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="font-size:14px;color:${TEXT_SECONDARY};">Plan</td>
<td align="right" style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY};">${planName}</td>
</tr>
</table>
</td>
</tr>

<!-- Type -->
<tr>
<td style="padding:14px 20px;border-bottom:1px solid ${BORDER_COLOR};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="font-size:14px;color:${TEXT_SECONDARY};">Type</td>
<td align="right" style="font-size:14px;color:${TEXT_PRIMARY};">${typeLabel}</td>
</tr>
</table>
</td>
</tr>

<!-- Credits -->
<tr>
<td style="padding:14px 20px;border-bottom:1px solid ${BORDER_COLOR};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="font-size:14px;color:${TEXT_SECONDARY};">Credits included</td>
<td align="right" style="font-size:14px;color:${TEXT_PRIMARY};">${credits.toLocaleString()} credits (${creditsFormatted} value)</td>
</tr>
</table>
</td>
</tr>

</table>
<!-- /Receipt card -->

<p style="margin:0 0 28px 0;font-size:14px;color:${TEXT_SECONDARY};line-height:1.6;">
Your credits have been added to your account and are ready to use. Open the Prophet side panel on any webpage to start chatting with Claude AI.
</p>

<!-- CTA button -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="center">
<a href="${APP_URL}/account" style="display:inline-block;padding:14px 32px;background-color:${GOLD_PRIMARY};color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
View Your Account
</a>
</td>
</tr>
</table>
`

  return emailWrapper(content)
}
