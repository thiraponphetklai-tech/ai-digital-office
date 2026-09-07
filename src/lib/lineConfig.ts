import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'

const CONFIG_ID = 'default'
const ALGORITHM = 'aes-256-gcm'

type LineDeliveryConfig = { token: string; recipientId: string }
type LineConfigStatus = { configured: boolean; recipientIdMasked: string | null; source: 'database' | 'environment' | null; updatedAt: string | null }
export type LineGroupSummary = { id: string; name: string; recipientIdMasked: string; active: boolean; selected: boolean }

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

export async function getLineChannelAccessToken() {
  const stored = await getStoredConfig()
  return stored?.channelAccessTokenEncrypted ? decrypt(stored.channelAccessTokenEncrypted) : process.env.LINE_CHANNEL_ACCESS_TOKEN ?? null
}

export async function getLineChannelSecret() {
  const stored = await getStoredConfig()
  return stored?.channelSecretEncrypted ? decrypt(stored.channelSecretEncrypted) : process.env.LINE_CHANNEL_SECRET ?? null
}

export async function verifyLineWebhookSignature(rawBody: string, signature: string | null) {
  // LINE signs webhook payloads with the Channel secret, not the access token.
  const channelSecret = await getLineChannelSecret()
  if (!channelSecret || !signature) return false
  const expected = createHmac('sha256', channelSecret).update(rawBody).digest('base64')
  const actual = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer)
}

export async function discoverLineGroup(groupId: string) {
  const groups = await db.lineRecipientGroup.findMany({ select: { id: true, recipientIdEncrypted: true } })
  if (groups.some((group: { recipientIdEncrypted: string }) => decrypt(group.recipientIdEncrypted) === groupId)) return false
  await db.lineRecipientGroup.create({ data: { name: `กลุ่มที่ค้นพบ ${maskRecipientId(groupId)}`, recipientIdEncrypted: encrypt(groupId) } })
  return true
}

export async function getLineGroups(projectId?: string): Promise<LineGroupSummary[]> {
  const [config, project, groups] = await Promise.all([
    getStoredConfig(),
    projectId ? db.project.findUnique({ where: { id: projectId }, select: { lineRecipientGroupId: true } }) : null,
    db.lineRecipientGroup.findMany({ orderBy: { name: 'asc' } }),
  ])
  const selectedGroupId = project?.lineRecipientGroupId ?? config?.selectedGroupId
  return groups.map((group: { id: string; name: string; recipientIdEncrypted: string; active: boolean }) => ({ id: group.id, name: group.name, recipientIdMasked: maskRecipientId(decrypt(group.recipientIdEncrypted)), active: group.active, selected: selectedGroupId === group.id }))
}

export async function addLineGroup(name: string, recipientId: string) {
  const groups = await db.lineRecipientGroup.findMany({ select: { id: true, recipientIdEncrypted: true } })
  if (groups.some((group: { recipientIdEncrypted: string }) => decrypt(group.recipientIdEncrypted) === recipientId)) throw new Error('This LINE group is already listed.')
  return db.lineRecipientGroup.create({ data: { name, recipientIdEncrypted: encrypt(recipientId) } })
}

export async function selectLineGroup(projectId: string, groupId: string) {
  const group = await db.lineRecipientGroup.findFirst({ where: { id: groupId, active: true }, select: { id: true } })
  if (!group) throw new Error('Selected LINE group was not found.')
  const project = await db.project.update({ where: { id: projectId }, data: { lineRecipientGroupId: group.id }, select: { id: true } }).catch(() => null)
  if (!project) throw new Error('Project was not found.')
}

export async function deleteLineGroup(groupId: string) {
  const config = await getStoredConfig()
  if (config?.selectedGroupId === groupId) await db.lineIntegrationConfig.update({ where: { id: CONFIG_ID }, data: { selectedGroupId: null } })
  await db.lineRecipientGroup.delete({ where: { id: groupId } })
}

async function getStoredConfig() {
  return db.lineIntegrationConfig.findUnique({ where: { id: CONFIG_ID } })
}

export async function getLineDeliveryConfig(projectId?: string): Promise<LineDeliveryConfig | null> {
  const stored = await getStoredConfig()
  const project = projectId ? await db.project.findUnique({ where: { id: projectId }, select: { lineRecipientGroupId: true } }) : null
  const selectedGroupId = project?.lineRecipientGroupId ?? stored?.selectedGroupId
  const selectedGroup = selectedGroupId ? await db.lineRecipientGroup.findUnique({ where: { id: selectedGroupId } }) : null
  if (stored?.channelAccessTokenEncrypted && selectedGroup?.active) {
    return { token: decrypt(stored.channelAccessTokenEncrypted), recipientId: decrypt(selectedGroup.recipientIdEncrypted) }
  }
  if (stored?.channelAccessTokenEncrypted && stored.recipientIdEncrypted) {
    return { token: decrypt(stored.channelAccessTokenEncrypted), recipientId: decrypt(stored.recipientIdEncrypted) }
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const recipientId = process.env.LINE_DAILY_SUMMARY_RECIPIENT_ID
  return token && recipientId ? { token, recipientId } : null
}

export async function getLineConfigStatus(projectId?: string): Promise<LineConfigStatus> {
  const [stored, project] = await Promise.all([
    getStoredConfig(),
    projectId ? db.project.findUnique({ where: { id: projectId }, select: { lineRecipientGroup: { select: { active: true, recipientIdEncrypted: true } } } }) : null,
  ])
  if (stored?.channelAccessTokenEncrypted && project?.lineRecipientGroup?.active) {
    return { configured: true, recipientIdMasked: maskRecipientId(decrypt(project.lineRecipientGroup.recipientIdEncrypted)), source: 'database', updatedAt: stored.updatedAt.toISOString() }
  }
  if (stored?.channelAccessTokenEncrypted && stored.recipientIdEncrypted) {
    return { configured: true, recipientIdMasked: maskRecipientId(decrypt(stored.recipientIdEncrypted)), source: 'database', updatedAt: stored.updatedAt.toISOString() }
  }
  const recipientId = process.env.LINE_DAILY_SUMMARY_RECIPIENT_ID
  return recipientId && process.env.LINE_CHANNEL_ACCESS_TOKEN
    ? { configured: true, recipientIdMasked: maskRecipientId(recipientId), source: 'environment', updatedAt: null }
    : { configured: false, recipientIdMasked: null, source: null, updatedAt: null }
}

export async function updateLineConfig(values: { channelAccessToken?: string; channelSecret?: string; recipientId?: string }) {
  const existing = await getStoredConfig()
  const token = values.channelAccessToken ?? (existing?.channelAccessTokenEncrypted ? decrypt(existing.channelAccessTokenEncrypted) : process.env.LINE_CHANNEL_ACCESS_TOKEN)
  const channelSecret = values.channelSecret ?? (existing?.channelSecretEncrypted ? decrypt(existing.channelSecretEncrypted) : process.env.LINE_CHANNEL_SECRET)
  const recipientId = values.recipientId ?? (existing?.recipientIdEncrypted ? decrypt(existing.recipientIdEncrypted) : process.env.LINE_DAILY_SUMMARY_RECIPIENT_ID)
  if (!token) throw new Error('A channel access token is required for the first save.')

  await db.lineIntegrationConfig.upsert({
    where: { id: CONFIG_ID },
    create: { id: CONFIG_ID, channelAccessTokenEncrypted: encrypt(token), channelSecretEncrypted: channelSecret ? encrypt(channelSecret) : null, recipientIdEncrypted: recipientId ? encrypt(recipientId) : null },
    update: { channelAccessTokenEncrypted: encrypt(token), ...(channelSecret ? { channelSecretEncrypted: encrypt(channelSecret) } : {}), ...(recipientId ? { recipientIdEncrypted: encrypt(recipientId) } : {}) },
  })
}
