import { Trophy } from '@phosphor-icons/react'
import { Progress } from '@/components/ui/progress'
import { LevelProgress } from '@/lib/gamification'

interface LevelBadgeProps {
  progress: LevelProgress
}

export function LevelBadge({ progress }: LevelBadgeProps) {
  const { current, next, xp, xpIntoLevel, xpForNext, percent } = progress
  return (
    <div
      className="mt-4 rounded-xl border border-border/70 bg-card/60 px-4 py-3 shadow-sm backdrop-blur-sm"
      aria-label={`Level ${current.level}: ${current.title}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Trophy size={18} weight="fill" />
          </span>
          <div className="leading-tight">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Level {current.level}
            </div>
            <div className="text-sm font-semibold">{current.title}</div>
          </div>
        </div>
        <div className="text-right font-mono text-xs text-muted-foreground">
          {next ? (
            <>
              <div className="font-semibold text-foreground">{xp} XP</div>
              <div>
                {xpIntoLevel}/{xpForNext} to {next.title}
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold text-foreground">{xp} XP</div>
              <div>Max level reached ✨</div>
            </>
          )}
        </div>
      </div>
      <Progress value={percent} className="mt-3 h-2" />
    </div>
  )
}
