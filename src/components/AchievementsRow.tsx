import { Medal } from '@phosphor-icons/react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Achievement, ACHIEVEMENTS } from '@/lib/gamification'

interface AchievementsRowProps {
  earned: Achievement[]
}

export function AchievementsRow({ earned }: AchievementsRowProps) {
  const earnedIds = new Set(earned.map((a) => a.id))
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Medal size={14} weight="fill" className="text-primary" />
        Achievements
        <span className="font-mono normal-case tracking-normal">
          {earned.length}/{ACHIEVEMENTS.length}
        </span>
      </div>
      <TooltipProvider delayDuration={150}>
        <div className="flex flex-wrap gap-2">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = earnedIds.has(a.id)
            return (
              <Tooltip key={a.id}>
                <TooltipTrigger asChild>
                  <span
                    className={
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ' +
                      (unlocked
                        ? 'border-primary/40 bg-primary/10 text-foreground'
                        : 'border-border/60 bg-muted/40 text-muted-foreground opacity-60')
                    }
                    aria-label={
                      unlocked
                        ? `${a.title} unlocked: ${a.description}`
                        : `${a.title} locked: ${a.description}`
                    }
                  >
                    <Medal
                      size={12}
                      weight={unlocked ? 'fill' : 'regular'}
                      className={unlocked ? 'text-primary' : ''}
                    />
                    {a.title}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-xs opacity-80">{a.description}</div>
                  {!unlocked && <div className="mt-1 text-xs italic opacity-70">Locked</div>}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>
    </div>
  )
}
