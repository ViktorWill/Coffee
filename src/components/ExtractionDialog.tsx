import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CoffeeBean, Extraction, FilterRecipe, Grinder, TasteNote } from '@/lib/types'
import { getAdvisorRecommendation, TASTE_NOTE_LABELS } from '@/lib/advisor'
import { ArrowUp, ArrowDown, Check, Lightbulb, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface ExtractionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bean: CoffeeBean | null
  grinders: Grinder[]
  onSave: (extraction: Omit<Extraction, 'id' | 'timestamp'>) => void
  onAddGrinder: () => void
}

const TASTE_NOTES: TasteNote[] = [
  'perfect',
  'balanced',
  'sweet',
  'sour',
  'bitter',
  'watery',
  'too-intense',
  'astringent',
]

export function ExtractionDialog({ open, onOpenChange, bean, grinders, onSave, onAddGrinder }: ExtractionDialogProps) {
  const [selectedGrinderId, setSelectedGrinderId] = useState('')
  const [grindSetting, setGrindSetting] = useState('')
  const [timeSeconds, setTimeSeconds] = useState('')
  const [outputGrams, setOutputGrams] = useState('')
  const [dosingWeight, setDosingWeight] = useState('')
  const [selectedTastes, setSelectedTastes] = useState<TasteNote[]>([])
  const [notes, setNotes] = useState('')
  const [showAdvisor, setShowAdvisor] = useState(false)
  const [advisor, setAdvisor] = useState<ReturnType<typeof getAdvisorRecommendation> | null>(null)

  // Filter recipe fields
  const [numberOfPours, setNumberOfPours] = useState('')
  const [waterPerPourMl, setWaterPerPourMl] = useState('')
  const [totalWaterMl, setTotalWaterMl] = useState('')
  const [coffeeWeightG, setCoffeeWeightG] = useState('')

  if (!bean) return null

  const isFilter = bean.type === 'filter'
  const selectedGrinder = grinders.find((g) => g.id === selectedGrinderId) ?? null

  const toggleTaste = (taste: TasteNote) => {
    setSelectedTastes((prev) =>
      prev.includes(taste) ? prev.filter((t) => t !== taste) : [...prev, taste]
    )
  }

  const recalcTotal = (pours: string, perPour: string) => {
    const p = parseFloat(pours)
    const w = parseFloat(perPour)
    if (!isNaN(p) && !isNaN(w) && p > 0 && w > 0) {
      setTotalWaterMl(String(p * w))
    }
  }

  const handleNumberOfPoursChange = (val: string) => {
    setNumberOfPours(val)
    recalcTotal(val, waterPerPourMl)
  }

  const handleWaterPerPourChange = (val: string) => {
    setWaterPerPourMl(val)
    recalcTotal(numberOfPours, val)
  }

  const handleSave = () => {
    if (!selectedGrinderId) {
      toast.error('Please select or create a grinder first')
      return
    }

    const grind = parseFloat(grindSetting)
    const time = parseFloat(timeSeconds)
    const output = parseFloat(outputGrams)
    const trimmedDose = dosingWeight.trim()
    const dose = trimmedDose === '' ? undefined : parseFloat(trimmedDose)

    if (isNaN(grind) || grind <= 0) {
      toast.error('Please enter a valid grind setting')
      return
    }

    if (isNaN(time) || time <= 0) {
      toast.error('Please enter a valid extraction time')
      return
    }

    if (isNaN(output) || output <= 0) {
      toast.error('Please enter a valid output weight')
      return
    }

    if (!isFilter && dose !== undefined && (isNaN(dose) || dose <= 0)) {
      toast.error('Please enter a valid dosing weight')
      return
    }

    let filterRecipe: FilterRecipe | undefined
    if (isFilter && (numberOfPours || waterPerPourMl || totalWaterMl || coffeeWeightG)) {
      const pours = parseFloat(numberOfPours)
      const perPour = parseFloat(waterPerPourMl)
      const totalWater = parseFloat(totalWaterMl)
      const coffeeW = parseFloat(coffeeWeightG)

      filterRecipe = {
        numberOfPours: isNaN(pours) ? 0 : pours,
        waterPerPourMl: isNaN(perPour) ? 0 : perPour,
        totalWaterMl: isNaN(totalWater) ? 0 : totalWater,
        coffeeWeightG: isNaN(coffeeW) ? 0 : coffeeW,
      }
    }

    const extraction: Omit<Extraction, 'id' | 'timestamp'> = {
      beanId: bean.id,
      grinderId: selectedGrinderId,
      grindSetting: grind,
      timeSeconds: time,
      outputGrams: output,
      dosingWeight: dose,
      tasteNotes: selectedTastes,
      notes: notes.trim() || undefined,
      filterRecipe,
    }

    if (selectedTastes.length > 0) {
      const recommendation = getAdvisorRecommendation(
        { ...extraction, id: '', timestamp: Date.now() },
        bean.type
      )
      setAdvisor(recommendation)
      setShowAdvisor(true)
    }

    onSave(extraction)
    toast.success('Extraction logged successfully!')

    if (selectedTastes.length === 0) {
      resetForm()
      onOpenChange(false)
    }
  }

  const resetForm = () => {
    setSelectedGrinderId('')
    setGrindSetting('')
    setTimeSeconds('')
    setOutputGrams('')
    setDosingWeight('')
    setSelectedTastes([])
    setNotes('')
    setShowAdvisor(false)
    setAdvisor(null)
    setNumberOfPours('')
    setWaterPerPourMl('')
    setTotalWaterMl('')
    setCoffeeWeightG('')
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Log Extraction - {bean.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {bean.type === 'espresso' ? 'Espresso' : 'Filter Coffee'} • {bean.blend}
          </p>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Grinder Selection */}
          <div className="space-y-2">
            <Label>Grinder *</Label>
            {grinders.length === 0 ? (
              <div className="border border-dashed rounded-lg p-4 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  No grinders yet. Add your grinder to get started.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddGrinder}
                  className="gap-2"
                >
                  <Plus size={16} />
                  Add Grinder
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={selectedGrinderId} onValueChange={setSelectedGrinderId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose a grinder" />
                  </SelectTrigger>
                  <SelectContent>
                    {grinders.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}{g.brand ? ` (${g.brand})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onAddGrinder}
                  title="Add another grinder"
                >
                  <Plus size={16} />
                </Button>
              </div>
            )}
          </div>

          {/* Grind Setting — only shown after a grinder is selected */}
          {selectedGrinder && (
            <div className="space-y-2">
              <Label htmlFor="grind-setting">
                Grind Setting ({selectedGrinder.name}) *
              </Label>
              <Input
                id="grind-setting"
                type="number"
                step="0.1"
                value={grindSetting}
                onChange={(e) => setGrindSetting(e.target.value)}
                placeholder={isFilter ? 'e.g., 5.0' : 'e.g., 2.5'}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Your current grind setting on the {selectedGrinder.name}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {!isFilter && (
              <div className="space-y-2">
                <Label htmlFor="dosing-weight">Dosing Weight (grams)</Label>
                <Input
                  id="dosing-weight"
                  type="number"
                  step="0.1"
                  value={dosingWeight}
                  onChange={(e) => setDosingWeight(e.target.value)}
                  placeholder="e.g., 18"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Coffee dose going into the portafilter (helps track brew ratios)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="time">Extraction Time (seconds) *</Label>
              <Input
                id="time"
                type="number"
                step="1"
                value={timeSeconds}
                onChange={(e) => setTimeSeconds(e.target.value)}
                placeholder={isFilter ? 'e.g., 180' : 'e.g., 28'}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {isFilter
                  ? 'Target: 2:30-3:30 (150-210 seconds)'
                  : 'Target: 25-30 seconds'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="output">Output Weight (grams) *</Label>
              <Input
                id="output"
                type="number"
                step="0.1"
                value={outputGrams}
                onChange={(e) => setOutputGrams(e.target.value)}
                placeholder={isFilter ? 'e.g., 300' : 'e.g., 36'}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {isFilter
                  ? 'Total brewed coffee weight'
                  : 'Final espresso weight in the cup'}
              </p>
            </div>

            {!isFilter && dosingWeight && outputGrams &&
              !isNaN(parseFloat(dosingWeight)) && !isNaN(parseFloat(outputGrams)) &&
              parseFloat(dosingWeight) > 0 && (
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Brew Ratio</span>
                  <span className="text-lg font-mono font-semibold text-accent">
                    1:{(parseFloat(outputGrams) / parseFloat(dosingWeight)).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {parseFloat(dosingWeight).toFixed(1)}g → {parseFloat(outputGrams).toFixed(1)}g
                </p>
              </div>
            )}
          </div>

          {/* Filter Pour Recipe */}
          {isFilter && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              <p className="text-sm font-semibold">Pour Recipe (Optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="coffee-weight" className="text-xs">Coffee Weight (g)</Label>
                  <Input
                    id="coffee-weight"
                    type="number"
                    step="0.1"
                    value={coffeeWeightG}
                    onChange={(e) => setCoffeeWeightG(e.target.value)}
                    placeholder="e.g., 15"
                    className="font-mono h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="num-pours" className="text-xs">Number of Pours</Label>
                  <Input
                    id="num-pours"
                    type="number"
                    step="1"
                    min="1"
                    value={numberOfPours}
                    onChange={(e) => handleNumberOfPoursChange(e.target.value)}
                    placeholder="e.g., 4"
                    className="font-mono h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="water-per-pour" className="text-xs">Water per Pour (ml)</Label>
                  <Input
                    id="water-per-pour"
                    type="number"
                    step="1"
                    value={waterPerPourMl}
                    onChange={(e) => handleWaterPerPourChange(e.target.value)}
                    placeholder="e.g., 60"
                    className="font-mono h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="total-water" className="text-xs">Total Water (ml)</Label>
                  <Input
                    id="total-water"
                    type="number"
                    step="1"
                    value={totalWaterMl}
                    onChange={(e) => setTotalWaterMl(e.target.value)}
                    placeholder="e.g., 240"
                    className="font-mono h-8 text-sm"
                  />
                </div>
              </div>
              {coffeeWeightG && totalWaterMl &&
                !isNaN(parseFloat(coffeeWeightG)) && !isNaN(parseFloat(totalWaterMl)) &&
                parseFloat(coffeeWeightG) > 0 && (
                <div className="bg-accent/10 border border-accent/30 rounded-lg p-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Brew Ratio</span>
                    <span className="text-sm font-mono font-semibold text-accent">
                      1:{(parseFloat(totalWaterMl) / parseFloat(coffeeWeightG)).toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {parseFloat(coffeeWeightG).toFixed(1)}g coffee → {parseFloat(totalWaterMl).toFixed(0)}ml water
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Label>Taste Evaluation (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {TASTE_NOTES.map((taste) => {
                const isSelected = selectedTastes.includes(taste)
                const info = TASTE_NOTE_LABELS[taste]
                return (
                  <Badge
                    key={taste}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleTaste(taste)}
                  >
                    {info.label}
                  </Badge>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Select one or more descriptors to get AI-powered adjustment advice
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other observations about this extraction..."
              rows={2}
            />
          </div>

          <AnimatePresence>
            {showAdvisor && advisor && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <Alert className="border-accent/50 bg-accent/5">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {advisor.direction === 'finer' && (
                        <ArrowUp size={20} weight="bold" className="text-accent" />
                      )}
                      {advisor.direction === 'coarser' && (
                        <ArrowDown size={20} weight="bold" className="text-accent" />
                      )}
                      {advisor.direction === 'perfect' && (
                        <Check size={20} weight="bold" className="text-accent" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <Lightbulb size={16} weight="fill" className="text-accent" />
                        <span>
                          {advisor.direction === 'finer' && 'Grind Finer'}
                          {advisor.direction === 'coarser' && 'Grind Coarser'}
                          {advisor.direction === 'perfect' && 'Perfect! Keep Going'}
                        </span>
                      </div>
                      <AlertDescription className="text-sm">
                        {advisor.reasoning}
                        {advisor.suggestedChange && selectedGrinder && (
                          <span className="block mt-2 font-medium">
                            Suggested adjustment: {advisor.suggestedChange > 0 ? '+' : ''}
                            {advisor.suggestedChange} on {selectedGrinder.name}
                          </span>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            {showAdvisor ? 'Close' : 'Cancel'}
          </Button>
          {!showAdvisor && (
            <Button onClick={handleSave} className="flex-1">
              Save Extraction
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
