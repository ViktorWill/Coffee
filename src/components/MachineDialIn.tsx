import { Button } from '@/components/ui/button'
import { Thermometer, Power, CheckCircle } from '@phosphor-icons/react'
import { useMachine } from '@/hooks/useMachine'
import { CoffeeBean } from '@/lib/types'
import { toast } from 'sonner'

interface MachineDialInProps {
  bean: CoffeeBean
}

/**
 * Per-bean machine control. Renders nothing unless the La Marzocco integration
 * is configured and this bean has a target temperature, so the card stays clean
 * for anyone without a connected machine.
 */
export function MachineDialIn({ bean }: MachineDialInProps) {
  const { status, available, isBusy, setTemperature, setPower } = useMachine()

  if (!available || !status || bean.brewTempC === undefined) return null

  const current = status.coffeeBoiler.targetTemperature
  const alreadySet = current !== null && Math.abs(current - bean.brewTempC) < 0.05

  const handleDialIn = async () => {
    try {
      if (!status.powered) await setPower(true)
      const confirmed = await setTemperature(bean.brewTempC!)

      if (confirmed) {
        toast.success(`Machine set to ${bean.brewTempC}°C for ${bean.name}`, {
          description: 'The boiler will take a few minutes to reach temperature.',
        })
      } else {
        // Accepted by the cloud but not observed on the machine within the
        // polling window — it may still land, so don't claim failure.
        toast.warning('Command sent, but not confirmed', {
          description: 'The machine has not reported the new temperature yet. Check the La Marzocco app.',
        })
      }
    } catch (error) {
      toast.error('Could not reach the machine', {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
          <Thermometer size={14} weight="fill" />
          Machine
          {status.mock && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-500">
              MOCK
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {status.powered ? (current !== null ? `${current}°C` : 'on') : 'standby'}
          {status.coffeeBoiler.ready && status.powered ? ' · ready' : ''}
        </span>
      </div>

      {alreadySet && status.powered ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle size={14} weight="fill" className="text-accent" />
          Dialled in at {bean.brewTempC}°C
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2"
          disabled={isBusy}
          onClick={handleDialIn}
        >
          {status.powered ? <Thermometer size={14} weight="fill" /> : <Power size={14} weight="fill" />}
          {isBusy
            ? 'Applying…'
            : status.powered
              ? `Set to ${bean.brewTempC}°C`
              : `Warm up to ${bean.brewTempC}°C`}
        </Button>
      )}
    </div>
  )
}
