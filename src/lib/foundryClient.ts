import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity'

const endpoint = process.env.FOUNDRY_OPENAI_ENDPOINT ?? 'https://proj-ai-agent-it-infra.services.ai.azure.com/openai/v1'
const deployment = process.env.FOUNDRY_MODEL_DEPLOYMENT ?? 'gpt-5.6-luna'
const scope = 'https://ai.azure.com/.default'

export class FoundryConfigurationError extends Error {}

export async function createFoundryResponse(input: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) {
  const credential = new DefaultAzureCredential({ managedIdentityClientId: process.env.AZURE_CLIENT_ID })
  const getToken = getBearerTokenProvider(credential, scope)
  const accessToken = await getToken()
  if (!accessToken) throw new FoundryConfigurationError('Managed Identity could not obtain a Microsoft Foundry access token.')

  const response = await fetch(`${endpoint.replace(/\/$/, '')}/responses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: deployment, input }),
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Foundry request failed (${response.status}): ${detail.slice(0, 500)}`)
  }

  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }
  const text = payload.output_text ?? payload.output?.flatMap(item => item.content ?? []).filter(item => item.type === 'output_text').map(item => item.text ?? '').join('')
  if (!text?.trim()) throw new Error('Foundry returned an empty response.')
  return text.trim()
}
