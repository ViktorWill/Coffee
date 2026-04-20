import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CoffeeBean, Extraction, TasteNote } from '@/lib/types'
import { getAdvisorRecommendation, TASTE_NOTE_LABELS } from '@/lib/advisor'
import { ArrowUp, ArrowDown, Check, Lightbulb } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface ExtractionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bean: CoffeeBean | null
  onSave: (extraction: Omit<Extraction, 'id' | 'timestamp'>) => void
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

export function ExtractionDialog({ open, onOpenChange, bean, onSave }: ExtractionDialogProps) {
  const [grindSetting, setGrindSetting] = useState('')
  const [timeSeconds, setTimeSeconds] = useState('')
  const [outputGrams, setOutputGrams] = useState('')
  const [dosingWeight, setDosingWeight] = useState('')
  const [selectedTastes, setSelectedTastes] = useState<TasteNote[]>([])
  const [notes, setNotes] = useState('')
  const [showAdvisor, setShowAdvisor] = useState(false)
  const [advisor, setAdvisor] = useState<ReturnType<typeof getAdvisorRecommendation> | null>(null)

  if (!bean) return null

  const toggleTaste = (taste: TasteNote) => {
    setSelectedTastes((prev) =>
      prev.includes(taste) ? prev.filter((t) => t !== taste) : [...prev, taste]
    )
  }

  const handleSave = () => {
    const grind = parseFloat(grindSetting)
    const time = parseFloat(timeSeconds)
    const output = parseFloat(outputGrams)
    const dose = dosingWeight ? parseFloat(dosingWeight) : undefined

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

    if (bean.type === 'espresso' && dosingWeight && (isNaN(dose!) || dose! <= 0)) {
      toast.error('Please enter a valid dosing weight')
      return
    }

    const extraction: Omit<Extraction, 'id' | 'timestamp'> = {
      beanId: bean.id,
      grindSetting: grind,
      timeSeconds: time,
      outputGrams: output,
      dosingWeight: dose,
      tasteNotes: selectedTastes,
      notes: notes.trim() || undefined,
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
    setGrindSetting('')
    setTimeSeconds('')
    setOutputGrams('')
    setDosingWeight('')
    setSelectedTastes([])
    setNotes('')
    setShowAdvisor(false)
    setAdvisor(null)
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
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grind-setting">
                Grind Setting (Mazzer Philos) *
              </Label>
              <Input
                id="grind-setting"
                type="number"
                step="0.1"
                value={grindSetting}
                onChange={(e) => setGrindSetting(e.target.value)}
                placeholder={bean.type === 'espresso' ? 'e.g., 2.5' : 'e.g., 5.0'}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Your current grind setting on the Mazzer Philos scale
              </p>
            </div>

            {bean.type === 'espresso' && (
              <div className="space-y-2">
                <Label htmlFor="dosing-weight">
                  Dosing Weight (grams)
                </Label>
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
              <Label htmlFor="time">
                Extraction Time (seconds) *
              </Label>
              <Input
                id="time"
                type="number"
                step="1"
                value={timeSeconds}
                onChange={(e) => setTimeSeconds(e.target.value)}
                placeholder={bean.type === 'espresso' ? 'e.g., 28' : 'e.g., 180'}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {bean.type === 'espresso' 
                  ? 'Target: 25-30 seconds' 
                  : 'Target: 2:30-3:30 (150-210 seconds)'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="output">
                Output Weight (grams) *
              </Label>
              <Input
                id="output"
                type="number"
                step="0.1"
                value={outputGrams}
                onChange={(e) => setOutputGrams(e.target.value)}
                placeholder={bean.type === 'espresso' ? 'e.g., 36' : 'e.g., 300'}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {bean.type === 'espresso' 
                  ? 'Final espresso weight in the cup' 
                  : 'Total brewed coffee weight'}
              </p>
            </div>

            {bean.type === 'espresso' && dosingWeight && outputGrams && !isNaN(parseFloat(dosingWeight)) && !isNaN(parseFloat(outputGrams)) && parseFloat(dosingWeight) > 0 && (
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
                        {advisor.suggestedChange && (
                          <span className="block mt-2 font-medium">
                            Suggested adjustment: {advisor.suggestedChange > 0 ? '+' : ''}
                            {advisor.suggestedChange} on Mazzer Philos
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
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            {showAdvisor ? 'Close' : 'Cancel'}
          </Button>
          {!showAdvisor && (
            <Button
              onClick={handleSave}
              className="flex-1"
            >
              Save Extraction
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
