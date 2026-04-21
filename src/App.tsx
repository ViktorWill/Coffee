import { useState, useEffect, useMemo } from 'react'
import { useKV } from '@/hooks/useKV'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Toaster } from '@/components/ui/sonner'
import { CoffeeBean, Extraction, CoffeeType, TastingProfile, Grinder } from '@/lib/types'
import { COFFEE_ORIGINS, ROAST_LEVELS } from '@/lib/constants'
import { BeanCard } from '@/components/BeanCard'
import { NewBeanDialog } from '@/components/NewBeanDialog'
import { EditBeanDialog } from '@/components/EditBeanDialog'
import { ExtractionDialog } from '@/components/ExtractionDialog'
import { TastingProfileDialog } from '@/components/TastingProfileDialog'
import { GrinderDialog } from '@/components/GrinderDialog'
import { AuthDialog } from '@/components/AuthDialog'
import { UserHeader } from '@/components/UserHeader'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Coffee, Funnel, Plus, SortAscending, Faders, ChartLineUp, Palette } from '@phosphor-icons/react'
import { ulid } from 'ulid'
import { toast } from 'sonner'

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'origin-asc' | 'origin-desc' | 'roast-asc' | 'roast-desc'

function App() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string>('')
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [coffeeType, setCoffeeType] = useState<CoffeeType>('espresso')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [newBeanDialogOpen, setNewBeanDialogOpen] = useState(false)
  const [extractionDialogOpen, setExtractionDialogOpen] = useState(false)
  const [tastingProfileDialogOpen, setTastingProfileDialogOpen] = useState(false)
  const [selectedBean, setSelectedBean] = useState<CoffeeBean | null>(null)
  const [grinderDialogOpen, setGrinderDialogOpen] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Use SWA built-in auth — /.auth/me returns the authenticated user
        const res = await fetch('/.auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.clientPrincipal) {
            setCurrentUserId(data.clientPrincipal.userId)
            setCurrentUsername(data.clientPrincipal.userDetails)
            setAuthDialogOpen(false)
          } else {
            setAuthDialogOpen(true)
          }
        } else {
          setAuthDialogOpen(true)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setAuthDialogOpen(true)
      } finally {
        setIsLoading(false)
      }
    }
    
    initAuth()
  }, [])

  const handleAuthenticated = async (userId: string, username: string) => {
    setCurrentUserId(userId)
    setCurrentUsername(username)
    setAuthDialogOpen(false)
  }

  const handleSignOut = async () => {
    // SWA handles sign-out via redirect
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <span className="absolute left-1/2 -top-2 -translate-x-1/2 block h-3 w-1.5 rounded-full bg-primary/30 blur-sm animate-steam" aria-hidden="true" />
            <span className="absolute left-1/2 -top-2 -translate-x-[140%] block h-3 w-1.5 rounded-full bg-primary/20 blur-sm animate-steam animate-steam-delay-1" aria-hidden="true" />
            <span className="absolute left-1/2 -top-2 translate-x-[40%] block h-3 w-1.5 rounded-full bg-primary/20 blur-sm animate-steam animate-steam-delay-2" aria-hidden="true" />
            <Coffee size={56} weight="fill" className="mx-auto text-primary animate-bean-bob" />
          </div>
          <p className="text-muted-foreground">Brewing your beans…</p>
        </div>
      </div>
    )
  }

  if (!currentUserId) {
    return (
      <>
        <AuthDialog open={authDialogOpen} onAuthenticated={handleAuthenticated} />
        <Toaster position="top-center" />
      </>
    )
  }

  return <AuthenticatedApp 
    currentUserId={currentUserId}
    currentUsername={currentUsername}
    onSignOut={handleSignOut}
    coffeeType={coffeeType}
    setCoffeeType={setCoffeeType}
    sortBy={sortBy}
    setSortBy={setSortBy}
    newBeanDialogOpen={newBeanDialogOpen}
    setNewBeanDialogOpen={setNewBeanDialogOpen}
    extractionDialogOpen={extractionDialogOpen}
    setExtractionDialogOpen={setExtractionDialogOpen}
    tastingProfileDialogOpen={tastingProfileDialogOpen}
    setTastingProfileDialogOpen={setTastingProfileDialogOpen}
    selectedBean={selectedBean}
    setSelectedBean={setSelectedBean}
    grinderDialogOpen={grinderDialogOpen}
    setGrinderDialogOpen={setGrinderDialogOpen}
  />
}

interface AuthenticatedAppProps {
  currentUserId: string
  currentUsername: string
  onSignOut: () => void
  coffeeType: CoffeeType
  setCoffeeType: (type: CoffeeType) => void
  sortBy: SortOption
  setSortBy: (sort: SortOption) => void
  newBeanDialogOpen: boolean
  setNewBeanDialogOpen: (open: boolean) => void
  extractionDialogOpen: boolean
  setExtractionDialogOpen: (open: boolean) => void
  tastingProfileDialogOpen: boolean
  setTastingProfileDialogOpen: (open: boolean) => void
  selectedBean: CoffeeBean | null
  setSelectedBean: (bean: CoffeeBean | null) => void
  grinderDialogOpen: boolean
  setGrinderDialogOpen: (open: boolean) => void
}

function AuthenticatedApp({
  currentUserId,
  currentUsername,
  onSignOut,
  coffeeType,
  setCoffeeType,
  sortBy,
  setSortBy,
  newBeanDialogOpen,
  setNewBeanDialogOpen,
  extractionDialogOpen,
  setExtractionDialogOpen,
  tastingProfileDialogOpen,
  setTastingProfileDialogOpen,
  selectedBean,
  setSelectedBean,
  grinderDialogOpen,
  setGrinderDialogOpen,
}: AuthenticatedAppProps) {
  const userKey = encodeURIComponent(currentUserId)
  const [beans, setBeans] = useKV<CoffeeBean[]>(
    `${userKey}:coffee-beans`,
    []
  )
  const [extractions, setExtractions] = useKV<Extraction[]>(
    `${userKey}:extractions`,
    []
  )
  const [tastingProfiles, setTastingProfiles] = useKV<TastingProfile[]>(
    `${userKey}:tasting-profiles`,
    []
  )
  const [grinders, setGrinders] = useKV<Grinder[]>(
    `${userKey}:grinders`,
    []
  )

  const [filterOrigin, setFilterOrigin] = useState<string>('all')
  const [filterRoast, setFilterRoast] = useState<string>('all')
  const [editBeanDialogOpen, setEditBeanDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [beanToDelete, setBeanToDelete] = useState<CoffeeBean | null>(null)

  const filteredBeans = useMemo(() => {
    let beansToFilter = (beans || []).filter((bean) => bean.type === coffeeType && !bean.archived)
    
    if (filterOrigin !== 'all') {
      beansToFilter = beansToFilter.filter((bean) => bean.origin === filterOrigin)
    }
    
    if (filterRoast !== 'all') {
      beansToFilter = beansToFilter.filter((bean) => bean.roastLevel === filterRoast)
    }

    const sorted = [...beansToFilter]
    switch (sortBy) {
      case 'oldest':
        return sorted.sort((a, b) => a.createdAt - b.createdAt)
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name))
      case 'origin-asc':
        return sorted.sort((a, b) => (a.origin || '').localeCompare(b.origin || ''))
      case 'origin-desc':
        return sorted.sort((a, b) => (b.origin || '').localeCompare(a.origin || ''))
      case 'roast-asc':
        return sorted.sort((a, b) => (a.roastLevel || '').localeCompare(b.roastLevel || ''))
      case 'roast-desc':
        return sorted.sort((a, b) => (b.roastLevel || '').localeCompare(a.roastLevel || ''))
      case 'newest':
      default:
        return sorted.sort((a, b) => b.createdAt - a.createdAt)
    }
  }, [beans, coffeeType, sortBy, filterOrigin, filterRoast])

  const handleSaveBean = async (beanData: Omit<CoffeeBean, 'id' | 'createdAt'>) => {
    const newBean: CoffeeBean = {
      ...beanData,
      id: ulid(),
      createdAt: Date.now(),
    }

    setBeans((currentBeans) => [...(currentBeans || []), newBean])

    toast.success('Bean added successfully')
  }

  const handleAddExtraction = (bean: CoffeeBean) => {
    setSelectedBean(bean)
    setExtractionDialogOpen(true)
  }

  const handleSaveExtraction = (extractionData: Omit<Extraction, 'id' | 'timestamp'>) => {
    const newExtraction: Extraction = {
      ...extractionData,
      id: ulid(),
      timestamp: Date.now(),
    }
    setExtractions((current) => [...(current || []), newExtraction])
  }

  const handleCreateTastingProfile = (bean: CoffeeBean) => {
    setSelectedBean(bean)
    setTastingProfileDialogOpen(true)
  }

  const handleSaveTastingProfile = (profileData: Omit<TastingProfile, 'id' | 'timestamp'>) => {
    const newProfile: TastingProfile = {
      ...profileData,
      id: ulid(),
      timestamp: Date.now(),
    }
    setTastingProfiles((current) => [...(current || []), newProfile])
  }

  const getExtractionsForBean = (beanId: string) => {
    return (extractions || []).filter((e) => e.beanId === beanId)
  }

  const getTastingProfilesForBean = (beanId: string) => {
    return (tastingProfiles || []).filter((p) => p.beanId === beanId)
  }

  const handleEditBean = (bean: CoffeeBean) => {
    setSelectedBean(bean)
    setEditBeanDialogOpen(true)
  }

  const handleSaveBeanEdit = (beanId: string, updates: Partial<CoffeeBean>) => {
    setBeans((currentBeans) =>
      (currentBeans || []).map((bean) =>
        bean.id === beanId ? { ...bean, ...updates } : bean
      )
    )
    toast.success('Bean updated successfully')
  }

  const handleDeleteBean = (bean: CoffeeBean) => {
    setBeanToDelete(bean)
    setDeleteConfirmOpen(true)
  }

  const handleSaveGrinder = (grinderData: Omit<Grinder, 'id' | 'createdAt'>) => {
    const newGrinder: Grinder = {
      ...grinderData,
      id: ulid(),
      createdAt: Date.now(),
    }
    setGrinders((current) => [...(current || []), newGrinder])
    toast.success('Grinder added successfully')
  }

  const confirmDeleteBean = () => {
    if (!beanToDelete) return
    
    setBeans((currentBeans) =>
      (currentBeans || []).filter((bean) => bean.id !== beanToDelete.id)
    )
    
    setExtractions((currentExtractions) =>
      (currentExtractions || []).filter((extraction) => extraction.beanId !== beanToDelete.id)
    )
    
    setTastingProfiles((currentProfiles) =>
      (currentProfiles || []).filter((profile) => profile.beanId !== beanToDelete.id)
    )
    
    toast.success('Bean deleted successfully')
    setDeleteConfirmOpen(false)
    setBeanToDelete(null)
  }

  return (
    <div className="min-h-screen">
      <div className="container max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <span className="pointer-events-none absolute left-1/2 -top-3 -translate-x-1/2 block h-3 w-1.5 rounded-full bg-primary/30 blur-sm animate-steam" aria-hidden="true" />
                <span className="pointer-events-none absolute left-1/2 -top-3 -translate-x-[160%] block h-3 w-1.5 rounded-full bg-primary/25 blur-sm animate-steam animate-steam-delay-1" aria-hidden="true" />
                <span className="pointer-events-none absolute left-1/2 -top-3 translate-x-[60%] block h-3 w-1.5 rounded-full bg-primary/25 blur-sm animate-steam animate-steam-delay-2" aria-hidden="true" />
                <img
                  src="https://github.com/user-attachments/assets/c32a1826-2fc6-4d70-81b2-f2d7a2eb3cf2"
                  alt="Bean Sheet logo"
                  className="h-16 w-16 object-contain drop-shadow-sm"
                />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-1 tracking-tight text-gradient-brand">
                  Bean Sheet
                </h1>
                <p className="text-muted-foreground text-sm md:text-base">
                  Dial in your grind, chase the perfect cup ☕
                </p>
              </div>
            </div>
            <UserHeader username={currentUsername} onSignOut={onSignOut} />
          </div>

          {((beans?.length ?? 0) > 0 || (extractions?.length ?? 0) > 0 || (tastingProfiles?.length ?? 0) > 0) && (
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="stat-chip">
                <Coffee size={14} weight="fill" className="stat-chip-icon" />
                <span className="font-mono font-semibold">{beans?.filter((b) => !b.archived).length ?? 0}</span>
                <span className="text-muted-foreground">beans</span>
              </span>
              <span className="stat-chip">
                <ChartLineUp size={14} weight="bold" className="stat-chip-icon" />
                <span className="font-mono font-semibold">{extractions?.length ?? 0}</span>
                <span className="text-muted-foreground">extractions</span>
              </span>
              <span className="stat-chip">
                <Palette size={14} weight="fill" className="stat-chip-icon" />
                <span className="font-mono font-semibold">{tastingProfiles?.length ?? 0}</span>
                <span className="text-muted-foreground">tastings</span>
              </span>
            </div>
          )}
        </header>

        <Tabs value={coffeeType} onValueChange={(v) => setCoffeeType(v as CoffeeType)} className="space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <TabsList className="grid w-full sm:w-auto grid-cols-2 h-11">
                <TabsTrigger value="espresso" className="gap-2 px-6">
                  <Coffee size={18} weight="fill" />
                  <span className="font-medium">Espresso</span>
                </TabsTrigger>
                <TabsTrigger value="filter" className="gap-2 px-6">
                  <Funnel size={18} weight="fill" />
                  <span className="font-medium">Filter</span>
                </TabsTrigger>
              </TabsList>

              <Button 
                onClick={() => setNewBeanDialogOpen(true)}
                className="gap-2 w-full sm:w-auto"
                size="default"
              >
                <Plus size={18} weight="bold" />
                Add Bean
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <SortAscending size={20} className="text-muted-foreground" />
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="origin-asc">Origin (A-Z)</SelectItem>
                    <SelectItem value="origin-desc">Origin (Z-A)</SelectItem>
                    <SelectItem value="roast-asc">Roast Level (A-Z)</SelectItem>
                    <SelectItem value="roast-desc">Roast Level (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <Faders size={20} className="text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Filters:</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Select value={filterOrigin} onValueChange={setFilterOrigin}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="All Origins" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Origins</SelectItem>
                      {COFFEE_ORIGINS.map((origin) => (
                        <SelectItem key={origin} value={origin}>
                          {origin}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterRoast} onValueChange={setFilterRoast}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="All Roast Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roast Levels</SelectItem>
                      {ROAST_LEVELS.map((roast) => (
                        <SelectItem key={roast} value={roast}>
                          {roast}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {(filterOrigin !== 'all' || filterRoast !== 'all') && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setFilterOrigin('all')
                        setFilterRoast('all')
                      }}
                      className="w-full sm:w-auto"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <TabsContent value="espresso" className="mt-6">
            {filteredBeans.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="max-w-md mx-auto space-y-4">
                  <Coffee size={64} weight="fill" className="mx-auto text-primary/70 animate-bean-bob" />
                  <h3 className="text-xl font-semibold">Your espresso shelf is empty</h3>
                  <p className="text-muted-foreground text-sm">
                    Snap a photo of your next bag — we'll pull out the details so you can get straight to pulling shots.
                  </p>
                  <Button onClick={() => setNewBeanDialogOpen(true)} className="gap-2">
                    <Plus size={18} weight="bold" />
                    Add Your First Bean
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBeans.map((bean) => (
                  <BeanCard
                    key={bean.id}
                    bean={bean}
                    extractions={getExtractionsForBean(bean.id)}
                    tastingProfiles={getTastingProfilesForBean(bean.id)}
                    onAddExtraction={handleAddExtraction}
                    onCreateTastingProfile={handleCreateTastingProfile}
                    onEdit={handleEditBean}
                    onDelete={handleDeleteBean}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="filter" className="mt-6">
            {filteredBeans.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="max-w-md mx-auto space-y-4">
                  <Funnel size={64} weight="fill" className="mx-auto text-accent animate-bean-bob" />
                  <h3 className="text-xl font-semibold">No pour-over picks yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Add your first filter bean and we'll help you track every brew, ratio and tasting note along the way.
                  </p>
                  <Button onClick={() => setNewBeanDialogOpen(true)} className="gap-2">
                    <Plus size={18} weight="bold" />
                    Add Your First Bean
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBeans.map((bean) => (
                  <BeanCard
                    key={bean.id}
                    bean={bean}
                    extractions={getExtractionsForBean(bean.id)}
                    tastingProfiles={getTastingProfilesForBean(bean.id)}
                    onAddExtraction={handleAddExtraction}
                    onCreateTastingProfile={handleCreateTastingProfile}
                    onEdit={handleEditBean}
                    onDelete={handleDeleteBean}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <NewBeanDialog
        open={newBeanDialogOpen}
        onOpenChange={setNewBeanDialogOpen}
        coffeeType={coffeeType}
        onSave={handleSaveBean}
      />

      <ExtractionDialog
        open={extractionDialogOpen}
        onOpenChange={setExtractionDialogOpen}
        bean={selectedBean}
        grinders={grinders || []}
        onSave={handleSaveExtraction}
        onAddGrinder={() => setGrinderDialogOpen(true)}
      />

      <GrinderDialog
        open={grinderDialogOpen}
        onOpenChange={setGrinderDialogOpen}
        onSave={handleSaveGrinder}
      />

      <TastingProfileDialog
        open={tastingProfileDialogOpen}
        onOpenChange={setTastingProfileDialogOpen}
        bean={selectedBean}
        onSave={handleSaveTastingProfile}
      />

      <EditBeanDialog
        open={editBeanDialogOpen}
        onOpenChange={setEditBeanDialogOpen}
        bean={selectedBean}
        onSave={handleSaveBeanEdit}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bean</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{beanToDelete?.name}"? This will also delete all associated extractions and tasting profiles. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBean} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster position="top-center" />
    </div>
  )
}

export default App
