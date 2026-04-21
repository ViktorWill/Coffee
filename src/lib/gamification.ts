import { CoffeeBean, Extraction, TastingProfile } from './types'

export interface Level {
  level: number
  title: string
  xp: number
}

// XP thresholds for each level. Reach `xp` to be at that level.
export const LEVELS: Level[] = [
  { level: 1, title: 'Novice Sipper', xp: 0 },
  { level: 2, title: 'Curious Taster', xp: 20 },
  { level: 3, title: 'Home Barista', xp: 50 },
  { level: 4, title: 'Bean Connoisseur', xp: 100 },
  { level: 5, title: 'Extraction Enthusiast', xp: 200 },
  { level: 6, title: 'Cupping Champion', xp: 400 },
  { level: 7, title: 'Coffee Maestro', xp: 800 },
]

export interface LevelProgress {
  current: Level
  next: Level | null
  xp: number
  xpIntoLevel: number
  xpForNext: number
  percent: number
}

export function computeXp(
  beans: CoffeeBean[],
  extractions: Extraction[],
  tastingProfiles: TastingProfile[],
): number {
  const activeBeans = beans.filter((b) => !b.archived)
  return activeBeans.length * 10 + extractions.length * 5 + tastingProfiles.length * 5
}

export function getLevelProgress(xp: number): LevelProgress {
  let current = LEVELS[0]
  let next: Level | null = LEVELS[1] ?? null
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i]
      next = LEVELS[i + 1] ?? null
    }
  }
  const xpIntoLevel = xp - current.xp
  const xpForNext = next ? next.xp - current.xp : 0
  const percent = next ? Math.min(100, Math.round((xpIntoLevel / xpForNext) * 100)) : 100
  return { current, next, xp, xpIntoLevel, xpForNext, percent }
}

export interface Achievement {
  id: string
  title: string
  description: string
  /** returns true when earned based on current stats */
  check: (stats: AchievementStats) => boolean
}

export interface AchievementStats {
  beanCount: number
  extractionCount: number
  tastingCount: number
  uniqueOrigins: number
  hasEspresso: boolean
  hasFilter: boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-bean',
    title: 'First Bean',
    description: 'Added your very first bean',
    check: (s) => s.beanCount >= 1,
  },
  {
    id: 'bean-collector',
    title: 'Bean Collector',
    description: 'Track 5 beans',
    check: (s) => s.beanCount >= 5,
  },
  {
    id: 'shelf-stocker',
    title: 'Shelf Stocker',
    description: 'Track 10 beans',
    check: (s) => s.beanCount >= 10,
  },
  {
    id: 'first-pull',
    title: 'First Pull',
    description: 'Log your first extraction',
    check: (s) => s.extractionCount >= 1,
  },
  {
    id: 'calibration-expert',
    title: 'Calibration Expert',
    description: 'Log 10 extractions',
    check: (s) => s.extractionCount >= 10,
  },
  {
    id: 'palate-trainer',
    title: 'Palate Trainer',
    description: 'Record your first tasting profile',
    check: (s) => s.tastingCount >= 1,
  },
  {
    id: 'flavor-cartographer',
    title: 'Flavor Cartographer',
    description: 'Record 5 tasting profiles',
    check: (s) => s.tastingCount >= 5,
  },
  {
    id: 'origin-hunter',
    title: 'Origin Hunter',
    description: 'Collect beans from 3 different origins',
    check: (s) => s.uniqueOrigins >= 3,
  },
  {
    id: 'dual-brewer',
    title: 'Dual Brewer',
    description: 'Track both espresso and filter beans',
    check: (s) => s.hasEspresso && s.hasFilter,
  },
]

export function computeStats(
  beans: CoffeeBean[],
  extractions: Extraction[],
  tastingProfiles: TastingProfile[],
): AchievementStats {
  const activeBeans = beans.filter((b) => !b.archived)
  const origins = new Set(
    activeBeans.map((b) => (b.origin || '').trim()).filter((o) => o.length > 0),
  )
  return {
    beanCount: activeBeans.length,
    extractionCount: extractions.length,
    tastingCount: tastingProfiles.length,
    uniqueOrigins: origins.size,
    hasEspresso: activeBeans.some((b) => b.type === 'espresso'),
    hasFilter: activeBeans.some((b) => b.type === 'filter'),
  }
}

export function getEarnedAchievements(stats: AchievementStats): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.check(stats))
}
