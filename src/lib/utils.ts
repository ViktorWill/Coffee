import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Some models wrap JSON responses in markdown code fences despite being told not to.
export function parseLlmJson<T>(raw: string): T {
  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  return JSON.parse(stripped) as T
}
