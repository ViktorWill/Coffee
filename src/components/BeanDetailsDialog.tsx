import { CoffeeBean, Extraction, TastingProfile } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PencilSimple, Sparkle, Plus, Palette } from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'

interface BeanDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bean: CoffeeBean | null
  extractions: Extraction[]
  tastingProfiles: TastingProfile[]
  onEdit: (bean: CoffeeBean) => void
  onAddExtraction: (bean: CoffeeBean) => void
  onCreateTastingProfile: (bean: CoffeeBean) => void
}

export function BeanDetailsDialog({
  open,
  onOpenChange,
  bean,
  extractions,
  tastingProfiles,
  onEdit,
  onAddExtraction,
  onCreateTastingProfile,
}: BeanDetailsDialogProps) {
  if (!bean) return null

  const latestExtraction = extractions.length > 0
    ? [...extractions].sort((a, b) => b.timestamp - a.timestamp)[0]
    : null

  const handleAction = (action: (bean: CoffeeBean) => void) => {
    onOpenChange(false)
    action(bean)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="text-left">
          <DialogTitle className="break-words pr-6">{bean.name}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-1">
            {bean.photoUrl && (
              <img
                src={bean.photoUrl}
                alt={bean.name}
                className="w-full max-h-64 rounded-lg object-contain bg-muted/40"
              />
            )}

            {bean.blend && (
              <p className="text-sm text-muted-foreground break-words">{bean.blend}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs capitalize">{bean.type}</Badge>
              {bean.origin && <Badge variant="outline" className="text-xs">{bean.origin}</Badge>}
              {bean.roastLevel && <Badge variant="secondary" className="text-xs">{bean.roastLevel}</Badge>}
              {bean.altitude && <Badge variant="outline" className="text-xs">{bean.altitude}</Badge>}
            </div>

            {bean.tasteNotes && (
              <div className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Taste Notes
                </h3>
                <p className="text-sm text-foreground/80 break-words">{bean.tasteNotes}</p>
              </div>
            )}

            {bean.aiPredictedTaste && (
              <div className="rounded-lg border border-border/60 bg-muted/40 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                  <Sparkle size={14} weight="fill" />
                  AI Predicted Taste
                </div>
                <p className="text-sm text-foreground/80 break-words">{bean.aiPredictedTaste}</p>
              </div>
            )}

            {bean.aiBrewSuggestion && (
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                  <Sparkle size={14} weight="fill" />
                  AI Brew Tip
                </div>
                <p className="text-sm text-foreground/80 break-words">{bean.aiBrewSuggestion}</p>
              </div>
            )}

            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Extractions</span>
                <span className="font-mono font-medium">{extractions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tasting profiles</span>
                <span className="font-mono font-medium">{tastingProfiles.length}</span>
              </div>
              {latestExtraction && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last brewed</span>
                  <span className="font-medium">
                    {formatDistanceToNow(latestExtraction.timestamp, { addSuffix: true })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Added</span>
                <span className="font-medium">
                  {formatDistanceToNow(bean.createdAt, { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={() => handleAction(onEdit)} className="flex-1 gap-2">
            <PencilSimple size={16} />
            Edit
          </Button>
          <Button onClick={() => handleAction(onAddExtraction)} variant="outline" className="gap-2">
            <Plus size={16} />
            Log Extraction
          </Button>
          <Button onClick={() => handleAction(onCreateTastingProfile)} variant="outline" className="gap-2">
            <Palette size={16} />
            Taste
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
