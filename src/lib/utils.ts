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

// All beans (including their photos) are persisted as a single KV document and
// Cosmos DB rejects items larger than 2 MB, so every photo has to stay small.
const PHOTO_BYTE_BUDGET = 120_000
const PHOTO_STEPS: Array<{ maxWidth: number; quality: number }> = [
  { maxWidth: 800, quality: 0.7 },
  { maxWidth: 800, quality: 0.5 },
  { maxWidth: 640, quality: 0.5 },
  { maxWidth: 480, quality: 0.45 },
  { maxWidth: 360, quality: 0.4 },
]

function drawToDataUrl(img: HTMLImageElement, maxWidth: number, quality: number): string {
  const canvas = document.createElement('canvas')
  let width = img.width
  let height = img.height

  if (width > maxWidth) {
    height = (height * maxWidth) / width
    width = maxWidth
  }

  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx?.drawImage(img, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', quality)
}

// Downscale/recompress a data-URL image until it fits the per-photo budget.
export function compressImage(base64Image: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let result = base64Image
      for (const step of PHOTO_STEPS) {
        result = drawToDataUrl(img, step.maxWidth, step.quality)
        if (result.length <= PHOTO_BYTE_BUDGET) break
      }
      resolve(result)
    }
    img.onerror = () => reject(new Error('Could not read the selected image'))
    img.src = base64Image
  })
}
