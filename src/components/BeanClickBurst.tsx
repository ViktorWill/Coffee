import { CSSProperties, useEffect, useRef, useState } from 'react'

interface Bean {
  id: number
  x: number
  y: number
  rotate: number
  drift: number
  duration: number
  size: number
}

/**
 * Listens for clicks anywhere on the document and spawns animated coffee beans
 * at the cursor position — unless the click target (or an ancestor) is an
 * interactive element (button, input, link, dialog, etc.).
 */
export function BeanClickBurst() {
  const [beans, setBeans] = useState<Bean[]>([])
  const nextId = useRef(0)

  useEffect(() => {
    const isInteractive = (el: EventTarget | null): boolean => {
      if (!(el instanceof Element)) return false
      // Skip if click originated from (or inside) any interactive/control surface.
      return !!el.closest(
        [
          'button',
          'a',
          'input',
          'textarea',
          'select',
          'label',
          'summary',
          '[role="button"]',
          '[role="menuitem"]',
          '[role="option"]',
          '[role="tab"]',
          '[role="switch"]',
          '[role="checkbox"]',
          '[role="radio"]',
          '[role="combobox"]',
          '[role="dialog"]',
          '[role="menu"]',
          '[role="listbox"]',
          '[data-bean-burst-ignore]',
        ].join(','),
      )
    }

    const handler = (e: MouseEvent) => {
      if (e.button !== 0) return
      if (isInteractive(e.target)) return

      const count = 4 + Math.floor(Math.random() * 3) // 4–6 beans
      const spawned: Bean[] = []
      for (let i = 0; i < count; i++) {
        spawned.push({
          id: nextId.current++,
          x: e.clientX,
          y: e.clientY,
          rotate: Math.random() * 360,
          drift: (Math.random() - 0.5) * 160,
          duration: 900 + Math.random() * 700,
          size: 14 + Math.random() * 12,
        })
      }
      setBeans((prev) => [...prev, ...spawned])

      const maxDuration = Math.max(...spawned.map((b) => b.duration))
      const spawnedIds = new Set(spawned.map((b) => b.id))
      window.setTimeout(() => {
        setBeans((prev) => prev.filter((b) => !spawnedIds.has(b.id)))
      }, maxDuration + 50)
    }

    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
    >
      {beans.map((b) => {
        const style: CSSProperties & Record<'--bean-drift' | '--bean-rotate', string> = {
          left: `${b.x}px`,
          top: `${b.y}px`,
          width: `${b.size}px`,
          height: `${b.size * 1.35}px`,
          animationDuration: `${b.duration}ms`,
          '--bean-drift': `${b.drift}px`,
          '--bean-rotate': `${b.rotate}deg`,
        }
        return <span key={b.id} className="bean-burst-piece" style={style} />
      })}
    </div>
  )
}
