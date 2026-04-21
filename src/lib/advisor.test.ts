import { describe, expect, it } from 'vitest'
import { getAdvisorRecommendation } from './advisor'
import type { CoffeeType, Extraction, TasteNote } from './types'

function makeExtraction(overrides: Partial<Extraction> = {}): Extraction {
  return {
    id: 'test',
    beanId: 'bean',
    grindSetting: 5,
    timeSeconds: 28,
    outputGrams: 36,
    tasteNotes: [],
    timestamp: 0,
    ...overrides,
  }
}

interface Case {
  name: string
  coffeeType: CoffeeType
  extraction: Partial<Extraction>
  expectedDirection: 'finer' | 'coarser' | 'perfect'
  reasoningContains?: string[]
  reasoningNotContains?: string[]
  suggestedChange?: number
}

const cases: Case[] = [
  // Espresso — taste-driven
  {
    name: 'espresso: perfect taste -> perfect',
    coffeeType: 'espresso',
    extraction: { tasteNotes: ['perfect'] },
    expectedDirection: 'perfect',
  },
  {
    name: 'espresso: balanced taste -> perfect',
    coffeeType: 'espresso',
    extraction: { tasteNotes: ['balanced'] },
    expectedDirection: 'perfect',
  },
  {
    name: 'espresso: sour -> finer',
    coffeeType: 'espresso',
    extraction: { tasteNotes: ['sour'], timeSeconds: 18 },
    expectedDirection: 'finer',
    suggestedChange: -0.5,
  },
  {
    name: 'espresso: watery -> finer',
    coffeeType: 'espresso',
    extraction: { tasteNotes: ['watery'] },
    expectedDirection: 'finer',
    suggestedChange: -0.5,
  },
  {
    name: 'espresso: bitter -> coarser',
    coffeeType: 'espresso',
    extraction: { tasteNotes: ['bitter'], timeSeconds: 40 },
    expectedDirection: 'coarser',
    suggestedChange: 0.5,
  },
  {
    name: 'espresso: astringent -> coarser',
    coffeeType: 'espresso',
    extraction: { tasteNotes: ['astringent'] },
    expectedDirection: 'coarser',
    suggestedChange: 0.5,
  },
  {
    name: 'espresso: too-intense -> coarser',
    coffeeType: 'espresso',
    extraction: { tasteNotes: ['too-intense'] },
    expectedDirection: 'coarser',
    suggestedChange: 0.5,
  },
  // Espresso — time-driven (no taste)
  {
    name: 'espresso: too fast (<20s) -> finer',
    coffeeType: 'espresso',
    extraction: { tasteNotes: [], timeSeconds: 18 },
    expectedDirection: 'finer',
    suggestedChange: -0.5,
  },
  {
    name: 'espresso: too slow (>35s) -> coarser',
    coffeeType: 'espresso',
    extraction: { tasteNotes: [], timeSeconds: 40 },
    expectedDirection: 'coarser',
    suggestedChange: 0.5,
  },
  {
    name: 'espresso: in range time, no taste -> perfect',
    coffeeType: 'espresso',
    extraction: { tasteNotes: [], timeSeconds: 28 },
    expectedDirection: 'perfect',
  },
  // Brew ratio: respects dosingWeight (regression for §1.7)
  {
    name: 'espresso: ratio uses dosingWeight, not hardcoded 18g',
    coffeeType: 'espresso',
    extraction: { tasteNotes: ['sour'], outputGrams: 40, dosingWeight: 20, timeSeconds: 22 },
    expectedDirection: 'finer',
    reasoningContains: ['1:2.00'],
  },
  {
    name: 'espresso: omits ratio when dosingWeight missing',
    coffeeType: 'espresso',
    extraction: { tasteNotes: ['sour'], outputGrams: 36 },
    expectedDirection: 'finer',
    reasoningNotContains: ['1:'],
  },
  {
    name: 'espresso: omits ratio when dosingWeight is 0',
    coffeeType: 'espresso',
    extraction: { tasteNotes: ['sour'], outputGrams: 36, dosingWeight: 0 },
    expectedDirection: 'finer',
    reasoningNotContains: ['1:'],
  },
  // Conflicting taste notes (§1.8)
  {
    name: 'espresso: sour + bitter -> channeling advice (no grind change)',
    coffeeType: 'espresso',
    extraction: { tasteNotes: ['sour', 'bitter'] },
    expectedDirection: 'perfect',
    reasoningContains: ['channeling'],
  },
  {
    name: 'espresso: watery + too-intense -> channeling advice',
    coffeeType: 'espresso',
    extraction: { tasteNotes: ['watery', 'too-intense'] },
    expectedDirection: 'perfect',
    reasoningContains: ['channeling'],
  },
  {
    name: 'filter: sour + astringent -> channeling advice',
    coffeeType: 'filter',
    extraction: { tasteNotes: ['sour', 'astringent'], timeSeconds: 180 },
    expectedDirection: 'perfect',
    reasoningContains: ['channeling'],
  },
  // Filter
  {
    name: 'filter: sour -> finer',
    coffeeType: 'filter',
    extraction: { tasteNotes: ['sour'], timeSeconds: 100 },
    expectedDirection: 'finer',
    suggestedChange: -1,
  },
  {
    name: 'filter: bitter -> coarser',
    coffeeType: 'filter',
    extraction: { tasteNotes: ['bitter'], timeSeconds: 240 },
    expectedDirection: 'coarser',
    suggestedChange: 1,
  },
  {
    name: 'filter: too fast time, no taste -> finer',
    coffeeType: 'filter',
    extraction: { tasteNotes: [], timeSeconds: 100 },
    expectedDirection: 'finer',
    suggestedChange: -1,
  },
  {
    name: 'filter: too slow time, no taste -> coarser',
    coffeeType: 'filter',
    extraction: { tasteNotes: [], timeSeconds: 240 },
    expectedDirection: 'coarser',
    suggestedChange: 1,
  },
  {
    name: 'filter: in range time, no taste -> perfect',
    coffeeType: 'filter',
    extraction: { tasteNotes: [], timeSeconds: 180 },
    expectedDirection: 'perfect',
  },
  // perfect/balanced wins over conflicting issue tags
  {
    name: 'espresso: perfect + sour -> perfect',
    coffeeType: 'espresso',
    extraction: { tasteNotes: ['perfect', 'sour'] as TasteNote[] },
    expectedDirection: 'perfect',
  },
]

describe('getAdvisorRecommendation', () => {
  for (const c of cases) {
    it(c.name, () => {
      const result = getAdvisorRecommendation(makeExtraction(c.extraction), c.coffeeType)
      expect(result.direction).toBe(c.expectedDirection)
      if (c.suggestedChange !== undefined) {
        expect(result.suggestedChange).toBe(c.suggestedChange)
      }
      for (const fragment of c.reasoningContains ?? []) {
        expect(result.reasoning).toContain(fragment)
      }
      for (const fragment of c.reasoningNotContains ?? []) {
        expect(result.reasoning).not.toContain(fragment)
      }
    })
  }
})
