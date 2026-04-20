import { TastingProfile } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface FlavorProfileVisualizationProps {
  profile: TastingProfile
  compact?: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  fruity: 'bg-rose-500',
  nutty: 'bg-amber-500',
  chocolate: 'bg-orange-500',
  floral: 'bg-purple-500',
  spicy: 'bg-red-500',
  earthy: 'bg-green-500'
}

export function FlavorProfileVisualization({ profile, compact = false }: FlavorProfileVisualizationProps) {
  const totalFlavors = profile.flavors.length

  if (compact) {
    const categoryGroups = profile.flavors.reduce((acc, flavor) => {
      if (!acc[flavor.category]) {
        acc[flavor.category] = []
      }
      acc[flavor.category].push(flavor)
      return acc
    }, {} as Record<string, typeof profile.flavors>)

    return (
      <div className="flex flex-wrap gap-1">
        {Object.entries(categoryGroups).map(([category, flavors]) => (
          <Badge
            key={category}
            className={cn(
              'text-white border-none text-xs',
              CATEGORY_COLORS[category]
            )}
          >
            {flavors.length}
          </Badge>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {profile.flavors.map((flavor, index) => (
        <div key={`${flavor.category}-${flavor.flavor}-${index}`} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{flavor.flavor}</span>
            <span className="text-xs text-muted-foreground capitalize">{flavor.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', CATEGORY_COLORS[flavor.category])}
                style={{ width: `${(flavor.intensity / 5) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium w-4">{flavor.intensity}</span>
          </div>
        </div>
      ))}
      
      {profile.overallScore && (
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Overall</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-3 h-3 rounded-full',
                    i < profile.overallScore! ? 'bg-primary' : 'bg-muted'
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      
      {profile.notes && (
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">{profile.notes}</p>
        </div>
      )}
    </div>
  )
}
