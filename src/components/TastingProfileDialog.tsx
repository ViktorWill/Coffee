import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { FlavorWheel } from '@/components/FlavorWheel'
import { CoffeeBean, FlavorNote, TastingProfile } from '@/lib/types'
import { ulid } from 'ulid'
import { toast } from 'sonner'

interface TastingProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bean: CoffeeBean | null
  extractionId?: string
  onSave: (profile: Omit<TastingProfile, 'id' | 'timestamp'>) => void
}

export function TastingProfileDialog({
  open,
  onOpenChange,
  bean,
  extractionId,
  onSave,
}: TastingProfileDialogProps) {
  const [flavors, setFlavors] = useState<FlavorNote[]>([])
  const [overallScore, setOverallScore] = useState<number>(3)
  const [notes, setNotes] = useState('')

  const handleSave = () => {
    if (!bean) return

    if (flavors.length === 0) {
      toast.error('Please select at least one flavor')
      return
    }

    onSave({
      beanId: bean.id,
      extractionId,
      flavors,
      overallScore,
      notes: notes.trim() || undefined,
    })

    setFlavors([])
    setOverallScore(3)
    setNotes('')
    onOpenChange(false)
    toast.success('Tasting profile saved')
  }

  const handleFlavorToggle = (category: FlavorNote['category'], flavor: string) => {
    setFlavors((current) => {
      const existingIndex = current.findIndex(
        (f) => f.category === category && f.flavor === flavor
      )
      
      if (existingIndex >= 0) {
        return current.filter((_, i) => i !== existingIndex)
      } else {
        return [...current, { category, flavor, intensity: 3 }]
      }
    })
  }

  const handleClose = () => {
    setFlavors([])
    setOverallScore(3)
    setNotes('')
    onOpenChange(false)
  }

  if (!bean) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Tasting Profile</DialogTitle>
          <DialogDescription>
            Record the flavor notes and characteristics of {bean.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Flavor Profile</Label>
            <FlavorWheel
              selectedFlavors={flavors}
              onFlavorToggle={handleFlavorToggle}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Overall Score</Label>
              <span className="text-sm font-medium">{overallScore}/5</span>
            </div>
            <Slider
              value={[overallScore]}
              onValueChange={(value) => setOverallScore(value[0])}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tasting-notes">Additional Notes (Optional)</Label>
            <Textarea
              id="tasting-notes"
              placeholder="Describe your tasting experience, impressions, or comparisons..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
