import { CoffeeBean } from './types'

// Cosmos DB rejects a single item larger than 2 MB. The whole "coffee-beans"
// array is stored as one KV document, so once enough beans have an embedded
// photo (a base64 data URL), that document can hit the limit and every
// future save (even unrelated edits) starts failing with a 413.
//
// To avoid that ceiling, each bean's photo is instead persisted as its own
// small KV document (keyed by bean id), and the beans array only carries a
// lightweight reference marker in place of the actual image data. This keeps
// the size of the beans document proportional to the number of beans
// (a few hundred bytes each) rather than the number of photos, so it scales
// to effectively unlimited beans/photos.
//
// Existing beans saved before this change already have the real data URL
// inlined in `photoUrl` - those are read back unchanged (no migration
// needed to keep viewing them), and get automatically split out into their
// own document the next time the beans array is saved for any reason.
const PHOTO_REF = '@stored-separately'

function photoKey(beansKey: string, beanId: string): string {
  return `${beansKey}:photo:${beanId}`
}

async function putPhoto(key: string, dataUrl: string): Promise<void> {
  const res = await fetch('/api/kv', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: dataUrl }),
  })
  if (!res.ok) {
    throw new Error(`Failed to store photo (HTTP ${res.status})`)
  }
}

async function getPhoto(key: string): Promise<string | undefined> {
  const res = await fetch(`/api/kv?key=${encodeURIComponent(key)}`)
  if (res.status === 404) return undefined
  if (!res.ok) {
    throw new Error(`Failed to load photo (HTTP ${res.status})`)
  }
  const data = await res.json()
  return typeof data.value === 'string' ? data.value : undefined
}

async function deletePhotoKey(key: string): Promise<void> {
  try {
    const res = await fetch(`/api/kv?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 404) {
      console.error(`Failed to delete photo "${key}": HTTP ${res.status}`)
    }
  } catch (error) {
    console.error(`Failed to delete photo "${key}":`, error)
  }
}

export interface BeanPhotoCodec {
  serialize: (beans: CoffeeBean[]) => Promise<CoffeeBean[]>
  deserialize: (beans: CoffeeBean[]) => Promise<CoffeeBean[]>
  // Best-effort cleanup for a bean's photo document, e.g. when the bean is
  // deleted or its photo is replaced/removed.
  deletePhoto: (beanId: string) => Promise<void>
}

export function createBeanPhotoCodec(beansKey: string): BeanPhotoCodec {
  return {
    async serialize(beans) {
      return Promise.all(
        beans.map(async (bean) => {
          if (bean.photoUrl && bean.photoUrl.startsWith('data:')) {
            try {
              await putPhoto(photoKey(beansKey, bean.id), bean.photoUrl)
              return { ...bean, photoUrl: PHOTO_REF }
            } catch (error) {
              // If offloading fails, fall back to inlining the photo so we
              // don't silently lose it (may still hit the size cap).
              console.error(`Failed to store photo for bean "${bean.id}" separately, keeping it inline:`, error)
              return bean
            }
          }
          return bean
        })
      )
    },

    async deserialize(beans) {
      return Promise.all(
        beans.map(async (bean) => {
          if (bean.photoUrl === PHOTO_REF) {
            try {
              const photoUrl = await getPhoto(photoKey(beansKey, bean.id))
              return { ...bean, photoUrl }
            } catch (error) {
              console.error(`Failed to load photo for bean "${bean.id}":`, error)
              return { ...bean, photoUrl: undefined }
            }
          }
          return bean
        })
      )
    },

    async deletePhoto(beanId) {
      await deletePhotoKey(photoKey(beansKey, beanId))
    },
  }
}
