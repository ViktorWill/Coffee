import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Spinner, Sparkle } from '@phosphor-icons/react'
import { CoffeeBean } from '@/lib/types'
import { COFFEE_ORIGINS, ALTITUDE_RANGES, ROAST_LEVELS } from '@/lib/constants'
import { parseLlmJson } from '@/lib/utils'
import { toast } from 'sonner'

interface EditBeanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bean: CoffeeBean | null
  onSave: (beanId: string, updates: Partial<CoffeeBean>) => void
}

export function EditBeanDialog({ open, onOpenChange, bean, onSave }: EditBeanDialogProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [name, setName] = useState('')
  const [blend, setBlend] = useState('')
  const [tasteNotes, setTasteNotes] = useState('')
  const [origin, setOrigin] = useState('')
  const [altitude, setAltitude] = useState('')
  const [roastLevel, setRoastLevel] = useState('')
  const [aiPredictedTaste, setAiPredictedTaste] = useState('')
  const [aiBrewSuggestion, setAiBrewSuggestion] = useState('')

  useEffect(() => {
    if (bean) {
      setPhotoUrl(bean.photoUrl || '')
      setName(bean.name)
      setBlend(bean.blend || '')
      setTasteNotes(bean.tasteNotes)
      setOrigin(bean.origin || '')
      setAltitude(bean.altitude || '')
      setRoastLevel(bean.roastLevel || '')
      setAiPredictedTaste(bean.aiPredictedTaste || '')
      setAiBrewSuggestion(bean.aiBrewSuggestion || '')
    }
  }, [bean])

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
        const coffeeType = bean?.type ?? 'espresso'
        const brewTarget = coffeeType === 'espresso'
          ? 'espresso (dose in grams, brew ratio like 1:2, shot time in seconds, water temp)'
          : 'filter/pour-over (coffee-to-water ratio like 1:16, grind size, total brew time, water temp)'

        const prompt = spark.llmPrompt`You are a coffee expert analyzing a coffee package photo for someone about to brew it as ${brewTarget}. Extract the following information from the image:
- Coffee name/brand
- Blend type (e.g., "Single Origin Ethiopia", "House Blend", "Dark Roast")
- Taste notes/flavor profile (any tasting notes mentioned on the package)
- Origin/Region (e.g., "Ethiopia", "Colombia", "Kenya")
- Altitude (e.g., "1500m", "1200-1800 masl")
- Roast level (e.g., "Light", "Medium", "Dark", "Medium-Dark")

Then, using what's on the package plus your general knowledge of that origin/altitude/roast combination, add:
- predictedTaste: a short paragraph (2-3 sentences) predicting the likely flavor, acidity, body and mouthfeel of this coffee
- brewSuggestion: a short paragraph (2-3 sentences) with a concrete starting-point brew recipe for ${coffeeType === 'espresso' ? 'espresso' : 'filter/pour-over'}, tuned to the roast level and origin (e.g. lighter/higher-altitude beans often want a finer grind and hotter water, darker roasts often want coarser grind and slightly cooler water)

Return ONLY a JSON object with these exact keys: "name", "blend", "tasteNotes", "origin", "altitude", "roastLevel", "predictedTaste", "brewSuggestion". If you cannot find label information, use empty strings, but always attempt predictedTaste and brewSuggestion from what you can infer.

Example response format:
{"name": "Blue Bottle Giant Steps", "blend": "Single Origin Ethiopia", "tasteNotes": "Blueberry, chocolate, floral notes", "origin": "Ethiopia Yirgacheffe", "altitude": "1800-2200 masl", "roastLevel": "Light", "predictedTaste": "Expect bright, juicy acidity with blueberry and floral notes up front, a light body, and a clean, tea-like finish typical of washed Yirgacheffe.", "brewSuggestion": "Start with a fine-medium grind, water just off the boil (~96°C), and a 1:2.2 ratio over 27-30 seconds to bring out the fruit without tipping sour."}

Important: Return ONLY the JSON object, no other text.`

        const result = await spark.llm(prompt, 'gpt-5-mini', base64Image)
        const parsed = parseLlmJson<{
          name?: string
          blend?: string
          tasteNotes?: string
          origin?: string
          altitude?: string
          roastLevel?: string
          predictedTaste?: string
          brewSuggestion?: string
        }>(result)

        const compressedImage = await compressImage(base64Image)
        setPhotoUrl(compressedImage)

        if (parsed.name) setName(parsed.name)
        if (parsed.blend) setBlend(parsed.blend)
        if (parsed.tasteNotes) setTasteNotes(parsed.tasteNotes)
        if (parsed.origin) setOrigin(parsed.origin)
        if (parsed.altitude) setAltitude(parsed.altitude)
        if (parsed.roastLevel) setRoastLevel(parsed.roastLevel)
        if (parsed.predictedTaste) setAiPredictedTaste(parsed.predictedTaste)
        if (parsed.brewSuggestion) setAiBrewSuggestion(parsed.brewSuggestion)

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
    if (!bean) return
    
    if (!name.trim()) {
      toast.error('Please enter a coffee name')
      return
    }

    onSave(bean.id, {
      name: name.trim(),
      blend: blend.trim(),
      tasteNotes: tasteNotes.trim(),
      photoUrl: photoUrl || undefined,
      origin: origin.trim() || undefined,
      altitude: altitude.trim() || undefined,
      roastLevel: roastLevel.trim() || undefined,
      aiPredictedTaste: aiPredictedTaste.trim() || undefined,
      aiBrewSuggestion: aiBrewSuggestion.trim() || undefined,
    })

    onOpenChange(false)
  }

  if (!bean) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {bean.type === 'espresso' ? 'Espresso' : 'Filter'} Bean</DialogTitle>
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
                    onClick={() => setPhotoUrl('')}
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

          {(aiPredictedTaste || aiBrewSuggestion) && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                <Sparkle size={16} weight="fill" />
                AI Suggestions
              </div>
              {aiPredictedTaste && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Predicted Taste</p>
                  <p className="text-sm text-foreground/80">{aiPredictedTaste}</p>
                </div>
              )}
              {aiBrewSuggestion && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Brew Suggestion</p>
                  <p className="text-sm text-foreground/80">{aiBrewSuggestion}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-name">Coffee Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ethiopian Yirgacheffe"
              disabled={isAnalyzing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-blend">Blend / Origin</Label>
            <Input
              id="edit-blend"
              value={blend}
              onChange={(e) => setBlend(e.target.value)}
              placeholder="e.g., Single Origin, House Blend"
              disabled={isAnalyzing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tasteNotes">Taste Notes</Label>
            <Textarea
              id="edit-tasteNotes"
              value={tasteNotes}
              onChange={(e) => setTasteNotes(e.target.value)}
              placeholder="e.g., Blueberry, chocolate, citrus"
              rows={3}
              disabled={isAnalyzing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-origin">Origin (Optional)</Label>
            <Select value={origin} onValueChange={setOrigin} disabled={isAnalyzing}>
              <SelectTrigger id="edit-origin">
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
            <Label htmlFor="edit-altitude">Altitude (Optional)</Label>
            <Select value={altitude} onValueChange={setAltitude} disabled={isAnalyzing}>
              <SelectTrigger id="edit-altitude">
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
            <Label htmlFor="edit-roastLevel">Roast Level (Optional)</Label>
            <Select value={roastLevel} onValueChange={setRoastLevel} disabled={isAnalyzing}>
              <SelectTrigger id="edit-roastLevel">
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
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
