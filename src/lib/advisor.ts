import { AdvisorRecommendation, CoffeeType, Extraction, TasteNote } from './types'

export function getAdvisorRecommendation(
  extraction: Extraction,
  coffeeType: CoffeeType
): AdvisorRecommendation {
  const { timeSeconds, outputGrams, tasteNotes } = extraction

  const hasPerfect = tasteNotes.includes('perfect')
  const hasBalanced = tasteNotes.includes('balanced')
  const hasSour = tasteNotes.includes('sour')
  const hasBitter = tasteNotes.includes('bitter')
  const hasWatery = tasteNotes.includes('watery')
  const hasTooIntense = tasteNotes.includes('too-intense')
  const hasAstringent = tasteNotes.includes('astringent')

  if (hasPerfect || hasBalanced) {
    return {
      direction: 'perfect',
      reasoning: "You've dialed it in! These taste notes indicate a well-balanced extraction. Keep this grind setting for this bean.",
    }
  }

  if (coffeeType === 'espresso') {
    const targetTime = 28
    const targetRatio = 2.0

    const ratio = outputGrams / 18
    const tooFast = timeSeconds < 20
    const tooSlow = timeSeconds > 35

    if (hasSour || hasWatery) {
      return {
        direction: 'finer',
        reasoning: `${hasSour ? 'Sour' : 'Watery'} espresso indicates under-extraction. ${tooFast ? `Your shot pulled in ${timeSeconds}s (target ~25-30s). ` : ''}Grind finer on your grinder to slow flow and increase extraction. Aim for 25-30 second extraction time.`,
        suggestedChange: -0.5,
      }
    }

    if (hasBitter || hasAstringent || hasTooIntense) {
      return {
        direction: 'coarser',
        reasoning: `${hasBitter ? 'Bitter' : hasAstringent ? 'Astringent' : 'Too intense'} flavors suggest over-extraction. ${tooSlow ? `Your shot took ${timeSeconds}s (target ~25-30s). ` : ''}Grind coarser on your grinder to speed up flow. Target 25-30 seconds with a 1:2 ratio.`,
        suggestedChange: 0.5,
      }
    }

    if (tooFast) {
      return {
        direction: 'finer',
        reasoning: `Shot extracted too quickly (${timeSeconds}s). Even without clear taste issues, this suggests under-extraction. Grind finer to slow the flow and aim for 25-30 seconds.`,
        suggestedChange: -0.5,
      }
    }

    if (tooSlow) {
      return {
        direction: 'coarser',
        reasoning: `Shot took too long (${timeSeconds}s). This typically leads to over-extraction. Grind coarser to speed flow and target 25-30 seconds.`,
        suggestedChange: 0.5,
      }
    }

    return {
      direction: 'perfect',
      reasoning: `Your extraction time (${timeSeconds}s) is in the ideal range. Fine-tune based on taste preference or keep this setting if it tastes good.`,
    }
  } else {
    const targetTimeMin = 2.5 * 60
    const targetTimeMax = 3.5 * 60

    const tooFast = timeSeconds < targetTimeMin
    const tooSlow = timeSeconds > targetTimeMax

    if (hasSour || hasWatery) {
      return {
        direction: 'finer',
        reasoning: `${hasSour ? 'Sour' : 'Watery'} filter coffee indicates under-extraction. ${tooFast ? `Your brew finished in ${Math.floor(timeSeconds / 60)}:${String(timeSeconds % 60).padStart(2, '0')}. ` : ''}Grind finer on your grinder to slow water flow through the bed. Target 2:30-3:30 total brew time.`,
        suggestedChange: -1,
      }
    }

    if (hasBitter || hasAstringent || hasTooIntense) {
      return {
        direction: 'coarser',
        reasoning: `${hasBitter ? 'Bitter' : hasAstringent ? 'Astringent' : 'Too intense'} notes suggest over-extraction. ${tooSlow ? `Your brew took ${Math.floor(timeSeconds / 60)}:${String(timeSeconds % 60).padStart(2, '0')}. ` : ''}Grind coarser to increase flow rate. Aim for 2:30-3:30 brew time.`,
        suggestedChange: 1,
      }
    }

    if (tooFast) {
      return {
        direction: 'finer',
        reasoning: `Brew time of ${Math.floor(timeSeconds / 60)}:${String(timeSeconds % 60).padStart(2, '0')} is too fast. Water is channeling through the coffee bed too quickly. Grind finer to extend brew time to 2:30-3:30.`,
        suggestedChange: -1,
      }
    }

    if (tooSlow) {
      return {
        direction: 'coarser',
        reasoning: `Brew time of ${Math.floor(timeSeconds / 60)}:${String(timeSeconds % 60).padStart(2, '0')} is too slow, likely causing over-extraction. Grind coarser to speed water flow. Target 2:30-3:30.`,
        suggestedChange: 1,
      }
    }

    return {
      direction: 'perfect',
      reasoning: `Brew time of ${Math.floor(timeSeconds / 60)}:${String(timeSeconds % 60).padStart(2, '0')} is in the ideal range for filter coffee. Adjust based on taste or maintain this setting.`,
    }
  }
}

export const TASTE_NOTE_LABELS: Record<TasteNote, { label: string; description: string }> = {
  'perfect': { label: 'Perfect', description: 'Balanced and delicious' },
  'balanced': { label: 'Balanced', description: 'Well-rounded flavors' },
  'sour': { label: 'Sour', description: 'Sharp, acidic, under-extracted' },
  'bitter': { label: 'Bitter', description: 'Harsh, over-extracted' },
  'watery': { label: 'Watery', description: 'Weak, under-extracted' },
  'too-intense': { label: 'Too Intense', description: 'Overwhelming strength' },
  'astringent': { label: 'Astringent', description: 'Dry, puckering mouthfeel' },
  'sweet': { label: 'Sweet', description: 'Pleasant sweetness' },
}
