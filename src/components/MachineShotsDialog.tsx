import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner, Coffee, Warning } from '@phosphor-icons/react'
import { CoffeeBean, Extraction } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

export interface MachineShot {
  time: number
  timeSeconds: number
  targetTemperature: number | null
  outputGrams: number | null
  valid: boolean
  invalidReason: string | null
}

interface MachineShotsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  beans: CoffeeBean[]
  /** Shot times (epoch ms) already logged, so they aren't offered twice. */
  importedTimes: number[]
  /** True while that list is still loading — rows stay hidden to avoid double-logging. */
  importedTimesLoading?: boolean
  onImport: (shotTime: number, extraction: Omit<Extraction, 'id'>) => void
}

/**
 * Brews the machine recorded, offered for attaching to a bean.
 *
 * The machine knows when a shot happened and how long it ran, but not which
 * coffee went in, how it was ground, or what came out — so the bean is always
 * chosen explicitly and dose/yield are entered by hand. Nothing is guessed.
 */
export function MachineShotsDialog({
  open,
  onOpenChange,
  beans,
  importedTimes,
  importedTimesLoading = false,
  onImport,
}: MachineShotsDialogProps) {
  const [shots, setShots] = useState<MachineShot[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Per-shot draft state, keyed by shot time.
  const [drafts, setDrafts] = useState<Record<number, { beanId?: string; grind?: string; yield?: string }>>({})

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/machine/shots?days=14')
      if (!res.ok) throw new Error(`Could not load brews (${res.status})`)
      const data = (await res.json()) as { shots: MachineShot[] }
      setShots(data.shots)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load brews')
      setShots([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  // Until the imported list has loaded, previously logged shots would briefly
  // reappear and could be logged twice, so treat it as part of loading.
  const busy = isLoading || importedTimesLoading
  const imported = new Set(importedTimes)
  const pending = busy ? [] : (shots ?? []).filter((s) => !imported.has(s.time))

  const updateDraft = (time: number, patch: Partial<{ beanId: string; grind: string; yield: string }>) =>
    setDrafts((d) => ({ ...d, [time]: { ...d[time], ...patch } }))

  const handleLog = (shot: MachineShot) => {
    const draft = drafts[shot.time] ?? {}
    const bean = beans.find((b) => b.id === draft.beanId)
    if (!bean) return

    const grindSetting = Number(draft.grind)
    const outputGrams = Number(draft.yield)

    onImport(shot.time, {
      beanId: bean.id,
      grindSetting: Number.isFinite(grindSetting) ? grindSetting : 0,
      timeSeconds: shot.timeSeconds,
      outputGrams: Number.isFinite(outputGrams) ? outputGrams : 0,
      tasteNotes: [],
      // Preserve when the shot was actually pulled, not when it was logged.
      timestamp: shot.time,
    })

    setDrafts((d) => {
      const next = { ...d }
      delete next[shot.time]
      return next
    })
    toast.success(`Logged to ${bean.name}`)
  }

  const isComplete = (time: number) => {
    const d = drafts[time]
    return Boolean(d?.beanId && d.grind !== undefined && d.grind !== '' && d.yield !== undefined && d.yield !== '')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Brews from your machine</DialogTitle>
          <DialogDescription>
            Shots your Linea Mini R recorded. Pick which bean each one was, and add the grind and yield —
            the machine doesn't know those.
          </DialogDescription>
        </DialogHeader>

        {busy && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Spinner size={20} className="animate-spin" />
            Loading recent brews…
          </div>
        )}

        {!busy && error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">{error}</div>
        )}

        {!busy && !error && beans.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Add a bean first, then you can attach brews to it.
          </div>
        )}

        {!busy && !error && beans.length > 0 && pending.length === 0 && (
          <div className="py-10 text-center space-y-2">
            <Coffee size={40} weight="fill" className="mx-auto text-primary/60" />
            <p className="text-sm text-muted-foreground">
              No new brews. Everything your machine recorded in the last 14 days is already logged.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {pending.map((shot) => (
            <div key={shot.time} className="rounded-lg border border-border/60 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{shot.timeSeconds}s</span>
                  {shot.targetTemperature !== null && (
                    <Badge variant="secondary" className="text-xs">
                      {shot.targetTemperature}°C
                    </Badge>
                  )}
                  {!shot.valid && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Warning size={11} weight="fill" />
                      {shot.invalidReason || 'flagged by machine'}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(shot.time, { addSuffix: true })}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-3">
                  <Label className="text-xs">Bean</Label>
                  <Select
                    value={drafts[shot.time]?.beanId ?? ''}
                    onValueChange={(v) => updateDraft(shot.time, { beanId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Which coffee was this?" />
                    </SelectTrigger>
                    <SelectContent>
                      {beans.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Grind</Label>
                  <Input
                    type="number"
                    step={0.1}
                    inputMode="decimal"
                    placeholder="e.g. 12"
                    value={drafts[shot.time]?.grind ?? ''}
                    onChange={(e) => updateDraft(shot.time, { grind: e.target.value })}
                  />
                </div>

                <div>
                  <Label className="text-xs">Yield (g)</Label>
                  <Input
                    type="number"
                    step={0.1}
                    inputMode="decimal"
                    placeholder="e.g. 36"
                    value={drafts[shot.time]?.yield ?? ''}
                    onChange={(e) => updateDraft(shot.time, { yield: e.target.value })}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    className="w-full"
                    disabled={!isComplete(shot.time)}
                    onClick={() => handleLog(shot)}
                  >
                    Log
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
