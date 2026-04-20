import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { CosmosClient } from '@azure/cosmos'

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

app.http('kv-keys', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'kv-keys',
  handler: async (_request: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const c = getContainer()
      const { resources } = await c.items
        .query('SELECT c.id FROM c')
        .fetchAll()
      const keys = resources.map((r: any) => r.id)
      return { jsonBody: { keys } }
    } catch (error: any) {
      console.error('KV keys API error:', error)
      return { status: 500, jsonBody: { error: error.message || 'Internal server error' } }
    }
  },
})
