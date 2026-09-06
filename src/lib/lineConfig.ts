import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { db } from '@/lib/db'

const CONFIG_ID = 'default'
const ALGORITHM = 'aes-256-gcm'

type LineDeliveryConfig = { token: string; recipientId: string }
type LineConfigStatus = { configured: boolean; recipientIdMasked: string | null; source: 'database' | 'environment' | null; updatedAt: string | null }

function getEncryptionKey() {
  const encoded = process.env.LINE_CONFIG_ENCRYPTION_KEY
  if (!encoded) throw new Error('LINE_CONFIG_ENCRYPTION_KEY is not configured.')
  const key = Buffer.from(encoded, 'base64')
  if (key.length !== 32) throw new Error('LINE_CONFIG_ENCRYPTION_KEY must be a base64-encoded 32-byte key.')
  return key
}

function encrypt(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, ciphertext].map(part => part.toString('base64')).join('.')
}

function decrypt(value: string) {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = value.split('.')
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error('Stored LINE configuration is invalid.')
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivEncoded, 'base64'))
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, 'base64')), decipher.final()]).toString('utf8')
}

function maskRecipientId(value: string) {
  if (value.length <= 6) return '••••••'
  return `${value.slice(0, 3)}••••${value.slice(-3)}`
}

async function getStoredConfig() {
  return db.lineIntegrationConfig.findUnique({ where: { id: CONFIG_ID } })
}

export async function getLineDeliveryConfig(): Promise<LineDeliveryConfig | null> {
  const stored = await getStoredConfig()
  if (stored?.channelAccessTokenEncrypted && stored.recipientIdEncrypted) {
    return { token: decrypt(stored.channelAccessTokenEncrypted), recipientId: decrypt(stored.recipientIdEncrypted) }
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const recipientId = process.env.LINE_DAILY_SUMMARY_RECIPIENT_ID
  return token && recipientId ? { token, recipientId } : null
}

export async function getLineConfigStatus(): Promise<LineConfigStatus> {
  const stored = await getStoredConfig()
  if (stored?.channelAccessTokenEncrypted && stored.recipientIdEncrypted) {
    return { configured: true, recipientIdMasked: maskRecipientId(decrypt(stored.recipientIdEncrypted)), source: 'database', updatedAt: stored.updatedAt.toISOString() }
  }
  const recipientId = process.env.LINE_DAILY_SUMMARY_RECIPIENT_ID
  return recipientId && process.env.LINE_CHANNEL_ACCESS_TOKEN
    ? { configured: true, recipientIdMasked: maskRecipientId(recipientId), source: 'environment', updatedAt: null }
    : { configured: false, recipientIdMasked: null, source: null, updatedAt: null }
}

export async function updateLineConfig(values: { channelAccessToken?: string; recipientId?: string }) {
  const existing = await getStoredConfig()
  const token = values.channelAccessToken ?? (existing?.channelAccessTokenEncrypted ? decrypt(existing.channelAccessTokenEncrypted) : process.env.LINE_CHANNEL_ACCESS_TOKEN)
  const recipientId = values.recipientId ?? (existing?.recipientIdEncrypted ? decrypt(existing.recipientIdEncrypted) : process.env.LINE_DAILY_SUMMARY_RECIPIENT_ID)
  if (!token || !recipientId) throw new Error('Both a channel access token and recipient ID are required for the first save.')

  await db.lineIntegrationConfig.upsert({
    where: { id: CONFIG_ID },
    create: { id: CONFIG_ID, channelAccessTokenEncrypted: encrypt(token), recipientIdEncrypted: encrypt(recipientId) },
    update: { channelAccessTokenEncrypted: encrypt(token), recipientIdEncrypted: encrypt(recipientId) },
  })
}
