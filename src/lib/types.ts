export type CoffeeType = 'espresso' | 'filter'

export type TasteNote = 
  | 'sour' 
  | 'bitter' 
  | 'perfect' 
  | 'too-intense' 
  | 'watery'
  | 'astringent'
  | 'balanced'
  | 'sweet'

export type FlavorCategory = 'fruity' | 'nutty' | 'chocolate' | 'floral' | 'spicy' | 'earthy'

export interface FlavorNote {
  category: FlavorCategory
  flavor: string
  intensity: number
}

export interface TastingProfile {
  id: string
  beanId: string
  extractionId?: string
  flavors: FlavorNote[]
  overallScore?: number
  notes?: string
  timestamp: number
}

export interface CoffeeBean {
  id: string
  type: CoffeeType
  name: string
  blend: string
  tasteNotes: string
  photoUrl?: string
  origin?: string
  altitude?: string
  roastLevel?: string
  createdAt: number
  archived?: boolean
}

export interface Extraction {
  id: string
  beanId: string
  grindSetting: number
  timeSeconds: number
  outputGrams: number
  dosingWeight?: number
  tasteNotes: TasteNote[]
  notes?: string
  timestamp: number
}

export interface AdvisorRecommendation {
  direction: 'finer' | 'coarser' | 'perfect'
  reasoning: string
  suggestedChange?: number
}
