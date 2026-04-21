/// <reference types="vite/client" />

export {}

declare global {
  interface Window {
    spark: {
      llmPrompt: (strings: TemplateStringsArray, ...values: unknown[]) => string
      llm: (prompt: string, modelName?: string, imageBase64?: string | boolean) => Promise<string>
      user: () => Promise<{
        id: string
        login: string
      } | null>
      kv: {
        keys: () => Promise<string[]>
        get: <T>(key: string) => Promise<T | null>
        set: (key: string, value: unknown) => Promise<void>
        delete: (key: string) => Promise<void>
      }
    }
  }

  const spark: Window['spark']
}