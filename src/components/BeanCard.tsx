import { useState } from 'react'
import { CoffeeBean, Extraction, TastingProfile } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Clock, ChartLineUp, Palette, PencilSimple, Trash, DotsThree } from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'
import { ExtractionHistoryDialog } from '@/components/ExtractionHistoryDialog'
import { FlavorProfileVisualization } from '@/components/FlavorProfileVisualization'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface BeanCardProps {
  bean: CoffeeBean
  extractions: Extraction[]
  tastingProfiles: TastingProfile[]
  onAddExtraction: (bean: CoffeeBean) => void
  onCreateTastingProfile: (bean: CoffeeBean) => void
  onEdit: (bean: CoffeeBean) => void
  onDelete: (bean: CoffeeBean) => void
}

export function BeanCard({ bean, extractions, tastingProfiles, onAddExtraction, onCreateTastingProfile, onEdit, onDelete }: BeanCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false)
  
  const latestExtraction = extractions.length > 0 
    ? extractions.sort((a, b) => b.timestamp - a.timestamp)[0]
    : null
  
  const latestProfile = tastingProfiles.length > 0
    ? tastingProfiles.sort((a, b) => b.timestamp - a.timestamp)[0]
    : null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <Card className="card-elevated overflow-hidden hover:border-foreground/20 transition-colors duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <CardTitle className="text-xl font-semibold truncate flex-1">
                  {bean.name}
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 -mr-2">
                      <DotsThree size={20} weight="bold" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(bean)} className="gap-2">
                      <PencilSimple size={16} />
                      Edit Bean
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(bean)} 
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash size={16} />
                      Delete Bean
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {bean.blend && (
                <p className="text-sm text-muted-foreground mb-1">
                  {bean.blend}
                </p>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {bean.origin && (
                  <span className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {bean.origin}
                    </Badge>
                  </span>
                )}
                {bean.roastLevel && (
                  <Badge variant="secondary" className="text-xs">
                    {bean.roastLevel}
                  </Badge>
                )}
                {bean.altitude && (
                  <span>{bean.altitude}</span>
                )}
              </div>
            </div>
            {bean.photoUrl && (
              <img 
                src={bean.photoUrl} 
                alt={bean.name}
                className="w-16 h-16 rounded-md object-cover flex-shrink-0"
              />
            )}
          </div>
          {bean.tasteNotes && (
            <p className="text-sm text-foreground/70 line-clamp-2 mt-2">
              {bean.tasteNotes}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-3">
          {latestExtraction ? (
            <div className="rounded-lg p-3 space-y-2 bg-muted/50 border border-border/60">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Latest Grind</span>
                <span className="font-mono font-medium">
                  {latestExtraction.grindSetting}
                </span>
              </div>
              {bean.type === 'espresso' && latestExtraction.dosingWeight && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Dose</span>
                    <span className="font-mono font-medium">
                      {latestExtraction.dosingWeight}g
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ratio</span>
                    <span className="font-mono font-medium text-accent">
                      1:{(latestExtraction.outputGrams / latestExtraction.dosingWeight).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              {bean.type === 'filter' && latestExtraction.filterRecipe && latestExtraction.filterRecipe.coffeeWeightG > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Coffee</span>
                    <span className="font-mono font-medium">
                      {latestExtraction.filterRecipe.coffeeWeightG}g
                    </span>
                  </div>
                  {latestExtraction.filterRecipe.numberOfPours > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pours</span>
                      <span className="font-mono font-medium">
                        {latestExtraction.filterRecipe.numberOfPours}
                        {latestExtraction.filterRecipe.waterPerPourMl > 0
                          ? ` × ${latestExtraction.filterRecipe.waterPerPourMl}ml`
                          : ''}
                      </span>
                    </div>
                  )}
                  {latestExtraction.filterRecipe.totalWaterMl > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Water</span>
                      <span className="font-mono font-medium">
                        {latestExtraction.filterRecipe.totalWaterMl}ml
                      </span>
                    </div>
                  )}
                  {latestExtraction.filterRecipe.totalWaterMl > 0 && latestExtraction.filterRecipe.coffeeWeightG > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ratio</span>
                      <span className="font-mono font-medium text-accent">
                        1:{(latestExtraction.filterRecipe.totalWaterMl / latestExtraction.filterRecipe.coffeeWeightG).toFixed(1)}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Time</span>
                <span className="font-mono font-medium">
                  {latestExtraction.timeSeconds}s
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Output</span>
                <span className="font-mono font-medium">
                  {latestExtraction.outputGrams}g
                </span>
              </div>
              {latestExtraction.tasteNotes.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {latestExtraction.tasteNotes.slice(0, 3).map((note) => (
                    <Badge 
                      key={note} 
                      variant="secondary" 
                      className="text-xs"
                    >
                      {note.replace('-', ' ')}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                <Clock size={12} />
                <span>
                  {formatDistanceToNow(latestExtraction.timestamp, { addSuffix: true })}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 rounded-lg p-4 text-center text-sm text-muted-foreground">
              No extractions yet
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={() => onAddExtraction(bean)}
              className="flex-1 gap-2"
              variant="default"
            >
              <Plus size={16} />
              Log Extraction
            </Button>
            <Button 
              onClick={() => onCreateTastingProfile(bean)}
              variant="outline"
              className="gap-2"
            >
              <Palette size={16} />
              Taste
            </Button>
            {extractions.length > 0 && (
              <Button 
                onClick={() => setHistoryOpen(true)}
                variant="outline"
                className="gap-2"
              >
                <ChartLineUp size={16} />
              </Button>
            )}
          </div>

          {latestProfile && (
            <div className="bg-muted/40 border border-border/60 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground/80">Tasting Profile</span>
                <FlavorProfileVisualization profile={latestProfile} compact />
              </div>
            </div>
          )}

          {extractions.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              {extractions.length} extraction{extractions.length !== 1 ? 's' : ''} • {tastingProfiles.length} profile{tastingProfiles.length !== 1 ? 's' : ''}
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      <ExtractionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        bean={bean}
        extractions={extractions}
      />
    </>
  )
}
