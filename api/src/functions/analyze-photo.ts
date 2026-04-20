import { app, HttpRequest, HttpResponseInit } from '@azure/functions'

app.http('analyze-photo', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'analyze-photo',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT
      const apiKey = process.env.AZURE_OPENAI_KEY
      const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o'

      if (!endpoint || !apiKey) {
        return {
          status: 503,
          jsonBody: { error: 'Azure OpenAI not configured. Photo analysis is unavailable.' },
        }
      }

      const body = await request.json() as { prompt: string; imageBase64?: string }
      if (!body.prompt) {
        return { status: 400, jsonBody: { error: 'Missing prompt' } }
      }

      const messages: any[] = [
        {
          role: 'user',
          content: body.imageBase64
            ? [
                { type: 'text', text: body.prompt },
                { type: 'image_url', image_url: { url: body.imageBase64 } },
              ]
            : body.prompt,
        },
      ]

      const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-10-21`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          messages,
          max_tokens: 1000,
          temperature: 0.3,
        }),
      })

      if (!res.ok) {
        const error = await res.text()
        console.error('Azure OpenAI error:', error)
        return { status: 502, jsonBody: { error: 'Azure OpenAI request failed' } }
      }

      const data = await res.json()
      const result = data.choices?.[0]?.message?.content || ''
      return { jsonBody: { result } }
    } catch (error: any) {
      console.error('Analyze photo error:', error)
      return { status: 500, jsonBody: { error: error.message || 'Internal server error' } }
    }
  },
})
