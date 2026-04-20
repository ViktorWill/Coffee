import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Spinner } from '@phosphor-icons/react'
import { CoffeeBean, CoffeeType } from '@/lib/types'
import { COFFEE_ORIGINS, ALTITUDE_RANGES, ROAST_LEVELS } from '@/lib/constants'
import { toast } from 'sonner'

interface NewBeanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  coffeeType: CoffeeType
  onSave: (bean: Omit<CoffeeBean, 'id' | 'createdAt'>) => void
}

export function NewBeanDialog({ open, onOpenChange, coffeeType, onSave }: NewBeanDialogProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [name, setName] = useState('')
  const [blend, setBlend] = useState('')
  const [tasteNotes, setTasteNotes] = useState('')
  const [origin, setOrigin] = useState('')
  const [altitude, setAltitude] = useState('')
  const [roastLevel, setRoastLevel] = useState('')

  const compressImage = (base64Image: string, maxWidth: number = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = base64Image
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64Image = event.target?.result as string
      
      setIsAnalyzing(true)
      try {
        const prompt = spark.llmPrompt`You are analyzing a coffee package photo. Extract the following information from the image:
- Coffee name/brand
- Blend type (e.g., "Single Origin Ethiopia", "House Blend", "Dark Roast")  
- Taste notes/flavor profile (any tasting notes mentioned on the package)
- Origin/Region (e.g., "Ethiopia", "Colombia", "Kenya")
- Altitude (e.g., "1500m", "1200-1800 masl")
- Roast level (e.g., "Light", "Medium", "Dark", "Medium-Dark")

Return ONLY a JSON object with these exact keys: "name", "blend", "tasteNotes", "origin", "altitude", "roastLevel". If you cannot find information, use empty strings.

Example response format:
{"name": "Blue Bottle Giant Steps", "blend": "Single Origin Ethiopia", "tasteNotes": "Blueberry, chocolate, floral notes", "origin": "Ethiopia Yirgacheffe", "altitude": "1800-2200 masl", "roastLevel": "Light"}

Important: Return ONLY the JSON object, no other text.`

        const result = await spark.llm(prompt, 'gpt-4o', base64Image)
        const parsed = JSON.parse(result)
        
        const compressedImage = await compressImage(base64Image)
        setPhotoUrl(compressedImage)
        
        if (parsed.name) setName(parsed.name)
        if (parsed.blend) setBlend(parsed.blend)
        if (parsed.tasteNotes) setTasteNotes(parsed.tasteNotes)
        if (parsed.origin) setOrigin(parsed.origin)
        if (parsed.altitude) setAltitude(parsed.altitude)
        if (parsed.roastLevel) setRoastLevel(parsed.roastLevel)
        
        toast.success('Coffee info extracted successfully!')
      } catch (error) {
        console.error('Analysis error:', error)
        const compressedImage = await compressImage(base64Image)
        setPhotoUrl(compressedImage)
        toast.error('Could not analyze image. Please enter details manually.')
      } finally {
        setIsAnalyzing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a coffee name')
      return
    }

    onSave({
      type: coffeeType,
      name: name.trim(),
      blend: blend.trim(),
      tasteNotes: tasteNotes.trim(),
      photoUrl: photoUrl || undefined,
      origin: origin.trim() || undefined,
      altitude: altitude.trim() || undefined,
      roastLevel: roastLevel.trim() || undefined,
    })

    setPhotoUrl('')
    setName('')
    setBlend('')
    setTasteNotes('')
    setOrigin('')
    setAltitude('')
    setRoastLevel('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New {coffeeType === 'espresso' ? 'Espresso' : 'Filter'} Bean</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Coffee Package Photo (Optional)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent/50 transition-colors">
              {photoUrl ? (
                <div className="space-y-3">
                  <img 
                    src={photoUrl} 
                    alt="Coffee package" 
                    className="max-h-48 mx-auto rounded-md"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPhotoUrl('')
                      setName('')
                      setBlend('')
                      setTasteNotes('')
                      setOrigin('')
                      setAltitude('')
                      setRoastLevel('')
                    }}
                  >
                    Remove Photo
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isAnalyzing}
                  />
                  <div className="flex flex-col items-center gap-2">
                    {isAnalyzing ? (
                      <>
                        <Spinner size={32} className="animate-spin text-accent" />
                        <p className="text-sm text-muted-foreground">Analyzing image...</p>
                      </>
                    ) : (
                      <>
                        <Upload size={32} className="text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload coffee package photo
                        </p>
                        <p className="text-xs text-muted-foreground">
                          We'll extract the coffee details automatically
                        </p>
                      </>
                    )}
                  </div>
                </label>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Coffee Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ethiopian Yirgacheffe"
              disabled={isAnalyzing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="blend">Blend / Origin</Label>
            <Input
              id="blend"
              value={blend}
              onChange={(e) => setBlend(e.target.value)}
              placeholder="e.g., Single Origin, House Blend"
              disabled={isAnalyzing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tasteNotes">Taste Notes</Label>
            <Textarea
              id="tasteNotes"
              value={tasteNotes}
              onChange={(e) => setTasteNotes(e.target.value)}
              placeholder="e.g., Blueberry, chocolate, citrus"
              rows={3}
              disabled={isAnalyzing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="origin">Origin (Optional)</Label>
            <Select value={origin} onValueChange={setOrigin} disabled={isAnalyzing}>
              <SelectTrigger id="origin">
                <SelectValue placeholder="Select origin" />
              </SelectTrigger>
              <SelectContent>
                {COFFEE_ORIGINS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="altitude">Altitude (Optional)</Label>
            <Select value={altitude} onValueChange={setAltitude} disabled={isAnalyzing}>
              <SelectTrigger id="altitude">
                <SelectValue placeholder="Select altitude range" />
              </SelectTrigger>
              <SelectContent>
                {ALTITUDE_RANGES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="roastLevel">Roast Level (Optional)</Label>
            <Select value={roastLevel} onValueChange={setRoastLevel} disabled={isAnalyzing}>
              <SelectTrigger id="roastLevel">
                <SelectValue placeholder="Select roast level" />
              </SelectTrigger>
              <SelectContent>
                {ROAST_LEVELS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isAnalyzing || !name.trim()}
            className="flex-1"
          >
            Save Bean
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
