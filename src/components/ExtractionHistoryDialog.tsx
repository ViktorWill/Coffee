import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CoffeeBean, Extraction, TasteNote } from '@/lib/types'
import { getAdvisorRecommendation, TASTE_NOTE_LABELS } from '@/lib/advisor'
import { ExtractionChart } from '@/components/ExtractionChart'
import { ArrowUp, ArrowDown, Check, Lightbulb, ChartLine, Clock, List } from '@phosphor-icons/react'
import { format, formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

interface ExtractionHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bean: CoffeeBean | null
  extractions: Extraction[]
}

type FilterType = 'all' | 'perfect' | 'needs-improvement'
type ViewType = 'list' | 'charts'

export function ExtractionHistoryDialog({ 
  open, 
  onOpenChange, 
  bean, 
  extractions 
}: ExtractionHistoryDialogProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [viewType, setViewType] = useState<ViewType>('list')

  if (!bean) return null

  const sortedExtractions = useMemo(() => {
    return [...extractions].sort((a, b) => b.timestamp - a.timestamp)
  }, [extractions])

  const filteredExtractions = useMemo(() => {
    if (filter === 'all') return sortedExtractions
    
    return sortedExtractions.filter(extraction => {
      if (filter === 'perfect') {
        return extraction.tasteNotes.includes('perfect') || 
               extraction.tasteNotes.includes('balanced')
      }
      if (filter === 'needs-improvement') {
        return extraction.tasteNotes.some(note => 
          ['sour', 'bitter', 'watery', 'too-intense', 'astringent'].includes(note)
        )
      }
      return true
    })
  }, [sortedExtractions, filter])

  const stats = useMemo(() => {
    if (extractions.length === 0) return null

    const avgGrind = extractions.reduce((sum, e) => sum + e.grindSetting, 0) / extractions.length
    const avgTime = extractions.reduce((sum, e) => sum + e.timeSeconds, 0) / extractions.length
    const avgOutput = extractions.reduce((sum, e) => sum + e.outputGrams, 0) / extractions.length
    
    const espressoExtractions = extractions.filter(e => e.dosingWeight)
    const avgRatio = espressoExtractions.length > 0
      ? espressoExtractions.reduce((sum, e) => sum + (e.outputGrams / e.dosingWeight!), 0) / espressoExtractions.length
      : null

    const perfectCount = extractions.filter(e => 
      e.tasteNotes.includes('perfect') || e.tasteNotes.includes('balanced')
    ).length

    return {
      avgGrind: avgGrind.toFixed(1),
      avgTime: Math.round(avgTime),
      avgOutput: avgOutput.toFixed(1),
      avgRatio: avgRatio?.toFixed(2),
      perfectCount,
      successRate: Math.round((perfectCount / extractions.length) * 100)
    }
  }, [extractions])

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl">
                Extraction History
              </DialogTitle>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm font-medium">{bean.name}</span>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">{bean.blend}</span>
              </div>
            </div>
            <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
              <TabsList className="grid w-32 grid-cols-2">
                <TabsTrigger value="list" className="text-xs gap-1">
                  <List size={14} />
                  List
                </TabsTrigger>
                <TabsTrigger value="charts" className="text-xs gap-1">
                  <ChartLine size={14} />
                  Charts
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        {stats && (
          <div className="px-6 py-4 bg-muted/30 border-b">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Avg. Grind</p>
                <p className="text-lg font-mono font-semibold">{stats.avgGrind}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Avg. Time</p>
                <p className="text-lg font-mono font-semibold">{stats.avgTime}s</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Avg. Output</p>
                <p className="text-lg font-mono font-semibold">{stats.avgOutput}g</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Success Rate</p>
                <p className="text-lg font-mono font-semibold text-accent">{stats.successRate}%</p>
              </div>
            </div>
            {stats.avgRatio && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Average Brew Ratio:</p>
                  <p className="text-sm font-mono font-semibold">1:{stats.avgRatio}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {viewType === 'list' && (
          <div className="px-6 py-3 border-b">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" className="text-xs">
                  All ({sortedExtractions.length})
                </TabsTrigger>
                <TabsTrigger value="perfect" className="text-xs">
                  Perfect
                </TabsTrigger>
                <TabsTrigger value="needs-improvement" className="text-xs">
                  Needs Work
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-3 py-4">
            {viewType === 'charts' ? (
              <ExtractionChart extractions={extractions} beanType={bean.type} />
            ) : (
              filteredExtractions.length === 0 ? (
              <div className="text-center py-12">
                <ChartLine size={48} weight="thin" className="mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {filter === 'all' 
                    ? 'No extractions logged yet' 
                    : `No ${filter === 'perfect' ? 'perfect' : 'problematic'} extractions found`}
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredExtractions.map((extraction, index) => {
                  const advisor = extraction.tasteNotes.length > 0 
                    ? getAdvisorRecommendation(extraction, bean.type)
                    : null
                  
                  const isExpanded = expandedId === extraction.id
                  const isPerfect = extraction.tasteNotes.includes('perfect') || 
                                   extraction.tasteNotes.includes('balanced')

                  return (
                    <motion.div
                      key={extraction.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <div 
                        className={`border rounded-lg transition-all ${
                          isPerfect 
                            ? 'border-accent/40 bg-accent/5' 
                            : 'border-border hover:border-accent/30'
                        }`}
                      >
                        <button
                          onClick={() => toggleExpanded(extraction.id)}
                          className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-ring rounded-lg"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-muted-foreground flex-shrink-0" />
                                <span className="text-xs text-muted-foreground">
                                  {format(extraction.timestamp, 'MMM d, yyyy • h:mm a')}
                                </span>
                                <span className="text-xs text-muted-foreground/60">
                                  ({formatDistanceToNow(extraction.timestamp, { addSuffix: true })})
                                </span>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                                <div>
                                  <p className="text-xs text-muted-foreground">Grind</p>
                                  <p className="font-mono font-semibold text-sm">{extraction.grindSetting}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Time</p>
                                  <p className="font-mono font-semibold text-sm">{extraction.timeSeconds}s</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Output</p>
                                  <p className="font-mono font-semibold text-sm">{extraction.outputGrams}g</p>
                                </div>
                                {extraction.dosingWeight && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Ratio</p>
                                    <p className="font-mono font-semibold text-sm text-accent">
                                      1:{(extraction.outputGrams / extraction.dosingWeight).toFixed(2)}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {extraction.tasteNotes.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {extraction.tasteNotes.map((note) => {
                                    const info = TASTE_NOTE_LABELS[note]
                                    return (
                                      <Badge 
                                        key={note} 
                                        variant={note === 'perfect' || note === 'balanced' ? 'default' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {info.label}
                                      </Badge>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                            <div className="flex-shrink-0">
                              {advisor?.direction === 'perfect' && (
                                <div className="bg-accent text-accent-foreground rounded-full p-2">
                                  <Check size={16} weight="bold" />
                                </div>
                              )}
                              {advisor?.direction === 'finer' && (
                                <div className="bg-muted rounded-full p-2">
                                  <ArrowUp size={16} weight="bold" className="text-foreground" />
                                </div>
                              )}
                              {advisor?.direction === 'coarser' && (
                                <div className="bg-muted rounded-full p-2">
                                  <ArrowDown size={16} weight="bold" className="text-foreground" />
                                </div>
                              )}
                            </div>
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                                <div className="px-4 pb-4 pt-2 space-y-3 border-t">
                                  {extraction.dosingWeight && (
                                    <div className="bg-muted/50 rounded-lg p-3">
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Dose</p>
                                          <p className="font-mono font-semibold">{extraction.dosingWeight}g</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Brew Ratio</p>
                                          <p className="font-mono font-semibold text-accent">
                                            1:{(extraction.outputGrams / extraction.dosingWeight).toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-2">
                                        {extraction.dosingWeight}g → {extraction.outputGrams}g in {extraction.timeSeconds}s
                                      </p>
                                    </div>
                                  )}

                                  {extraction.filterRecipe && (extraction.filterRecipe.coffeeWeightG > 0 || extraction.filterRecipe.numberOfPours > 0) && (
                                    <div className="bg-muted/50 rounded-lg p-3">
                                      <p className="text-xs font-semibold text-muted-foreground mb-2">Pour Recipe</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        {extraction.filterRecipe.coffeeWeightG > 0 && (
                                          <div>
                                            <p className="text-xs text-muted-foreground">Coffee</p>
                                            <p className="font-mono font-semibold text-sm">{extraction.filterRecipe.coffeeWeightG}g</p>
                                          </div>
                                        )}
                                        {extraction.filterRecipe.numberOfPours > 0 && (
                                          <div>
                                            <p className="text-xs text-muted-foreground">Pours</p>
                                            <p className="font-mono font-semibold text-sm">
                                              {extraction.filterRecipe.numberOfPours}
                                              {extraction.filterRecipe.waterPerPourMl > 0 ? ` × ${extraction.filterRecipe.waterPerPourMl}ml` : ''}
                                            </p>
                                          </div>
                                        )}
                                        {extraction.filterRecipe.totalWaterMl > 0 && (
                                          <div>
                                            <p className="text-xs text-muted-foreground">Total Water</p>
                                            <p className="font-mono font-semibold text-sm">{extraction.filterRecipe.totalWaterMl}ml</p>
                                          </div>
                                        )}
                                        {extraction.filterRecipe.totalWaterMl > 0 && extraction.filterRecipe.coffeeWeightG > 0 && (
                                          <div>
                                            <p className="text-xs text-muted-foreground">Ratio</p>
                                            <p className="font-mono font-semibold text-sm text-accent">
                                              1:{(extraction.filterRecipe.totalWaterMl / extraction.filterRecipe.coffeeWeightG).toFixed(1)}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {extraction.notes && (
                                  <div className="bg-muted/30 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                                    <p className="text-sm">{extraction.notes}</p>
                                  </div>
                                )}

                                {advisor && (
                                  <Alert className="border-accent/50 bg-accent/5">
                                    <div className="flex gap-3">
                                      <div className="flex-shrink-0 mt-0.5">
                                        {advisor.direction === 'finer' && (
                                          <ArrowUp size={18} weight="bold" className="text-accent" />
                                        )}
                                        {advisor.direction === 'coarser' && (
                                          <ArrowDown size={18} weight="bold" className="text-accent" />
                                        )}
                                        {advisor.direction === 'perfect' && (
                                          <Check size={18} weight="bold" className="text-accent" />
                                        )}
                                      </div>
                                      <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2 font-semibold text-xs">
                                          <Lightbulb size={14} weight="fill" className="text-accent" />
                                          <span>
                                            {advisor.direction === 'finer' && 'Grind Finer'}
                                            {advisor.direction === 'coarser' && 'Grind Coarser'}
                                            {advisor.direction === 'perfect' && 'Perfect! Keep Going'}
                                          </span>
                                        </div>
                                        <AlertDescription className="text-xs">
                                          {advisor.reasoning}
                                          {advisor.suggestedChange && (
                                            <span className="block mt-1.5 font-medium">
                                              Suggested: {advisor.suggestedChange > 0 ? '+' : ''}
                                              {advisor.suggestedChange} on grinder
                                            </span>
                                          )}
                                        </AlertDescription>
                                      </div>
                                    </div>
                                  </Alert>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )
            )}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
