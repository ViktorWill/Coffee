import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { CosmosClient } from '@azure/cosmos'

// Cosmos DB hard-limits a single item to 2 MB; leave headroom for the
// document envelope (id, partition key, system properties).
const MAX_ITEM_BYTES = 1_800_000

let container: any = null

function getContainer() {
  if (container) return container
  const connectionString = process.env.COSMOS_CONNECTION_STRING
  if (!connectionString) {
    throw new Error('COSMOS_CONNECTION_STRING not configured')
  }
  const client = new CosmosClient(connectionString)
  const database = client.database(process.env.COSMOS_DATABASE || 'coffee-dialer')
  container = database.container(process.env.COSMOS_CONTAINER || 'kvstore')
  return container
}

app.http('kv', {
  methods: ['GET', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'kv',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const c = getContainer()

      if (request.method === 'GET') {
        const key = request.query.get('key')
        if (!key) {
          return { status: 400, jsonBody: { error: 'Missing key parameter' } }
        }
        try {
          const { resource } = await c.item(key, key).read()
          if (!resource) {
            return { status: 404, jsonBody: { error: 'Key not found' } }
          }
          return { jsonBody: { key, value: resource.value } }
        } catch (err: any) {
          if (err.code === 404) {
            return { status: 404, jsonBody: { error: 'Key not found' } }
          }
          throw err
        }
      }

      if (request.method === 'PUT') {
        const body = await request.json() as { key: string; value: unknown }
        if (!body.key) {
          return { status: 400, jsonBody: { error: 'Missing key in body' } }
        }
        // Cosmos DB rejects items larger than 2 MB. Fail fast with a clear,
        // actionable message instead of surfacing an opaque 500.
        const serializedSize = Buffer.byteLength(JSON.stringify(body.value ?? null), 'utf8')
        if (serializedSize > MAX_ITEM_BYTES) {
          return {
            status: 413,
            jsonBody: {
              error: `Data for "${body.key}" is too large to store (${Math.round(serializedSize / 1024)} KB, limit ${Math.round(MAX_ITEM_BYTES / 1024)} KB). Remove or shrink some photos.`,
            },
          }
        }
        await c.items.upsert({
          id: body.key,
          partitionKey: body.key,
          value: body.value,
        })
        return { status: 200, jsonBody: { success: true } }
      }

      if (request.method === 'DELETE') {
        const key = request.query.get('key')
        if (!key) {
          return { status: 400, jsonBody: { error: 'Missing key parameter' } }
        }
        try {
          await c.item(key, key).delete()
        } catch (err: any) {
          if (err.code !== 404) throw err
        }
        return { status: 200, jsonBody: { success: true } }
      }

      return { status: 405, jsonBody: { error: 'Method not allowed' } }
    } catch (error: any) {
      console.error('KV API error:', error)
      // Surface Cosmos client errors (413 too large, 429 throttled, ...) so the
      // browser can tell the user what actually went wrong.
      const status = typeof error?.code === 'number' && error.code >= 400 && error.code < 600
        ? error.code
        : 500
      return { status, jsonBody: { error: error.message || 'Internal server error' } }
    }
  },
})
