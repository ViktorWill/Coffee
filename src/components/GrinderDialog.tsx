import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Grinder } from '@/lib/types'
import { toast } from 'sonner'

interface GrinderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (grinder: Omit<Grinder, 'id' | 'createdAt'>) => void
}

export function GrinderDialog({ open, onOpenChange, onSave }: GrinderDialogProps) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a grinder name')
      return
    }
    onSave({ name: name.trim(), brand: brand.trim() || undefined })
    setName('')
    setBrand('')
    onOpenChange(false)
  }

  const handleClose = () => {
    setName('')
    setBrand('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Grinder</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="grinder-name">Grinder Name *</Label>
            <Input
              id="grinder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Mazzer Philos, Comandante C40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grinder-brand">Brand (Optional)</Label>
            <Input
              id="grinder-brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g., Mazzer, Comandante"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save Grinder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
