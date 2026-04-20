// Drop-in replacement for @github/spark APIs
// Routes requests to Azure Functions API endpoints

interface SWAAuthUser {
  clientPrincipal: {
    userId: string
    userDetails: string
    userRoles: string[]
    identityProvider: string
  } | null
}

interface SparkUser {
  id: string
  login: string
}

const kvApi = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const res = await fetch(`/api/kv?key=${encodeURIComponent(key)}`)
      if (!res.ok) return null
      const data = await res.json()
      return data.value as T
    } catch {
      return null
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    await fetch('/api/kv', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
  },

  async delete(key: string): Promise<void> {
    await fetch(`/api/kv?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
    })
  },

  async keys(): Promise<string[]> {
    try {
      const res = await fetch('/api/kv-keys')
      if (!res.ok) return []
      const data = await res.json()
      return data.keys as string[]
    } catch {
      return []
    }
  },
}

async function getUser(): Promise<SparkUser | null> {
  try {
    const res = await fetch('/.auth/me')
    if (!res.ok) return null
    const data: SWAAuthUser = await res.json()
    if (data.clientPrincipal) {
      return {
        id: data.clientPrincipal.userId,
        login: data.clientPrincipal.userDetails,
      }
    }
    return null
  } catch {
    return null
  }
}

async function llm(prompt: string, _model?: string, imageBase64?: string | boolean): Promise<string> {
  try {
    const res = await fetch('/api/analyze-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt,
        imageBase64: typeof imageBase64 === 'string' ? imageBase64 : undefined,
      }),
    })
    if (!res.ok) throw new Error('LLM request failed')
    const data = await res.json()
    return data.result
  } catch (error) {
    console.error('LLM call failed:', error)
    throw error
  }
}

function llmPrompt(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, str, i) => {
    return result + str + (values[i] !== undefined ? String(values[i]) : '')
  }, '')
}

export const spark = {
  kv: kvApi,
  user: getUser,
  llm,
  llmPrompt,
}

// Make spark available globally (existing code references it without import)
;(window as any).spark = spark
