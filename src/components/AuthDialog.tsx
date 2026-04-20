import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { User, GithubLogo } from '@phosphor-icons/react'
import { Coffee } from '@phosphor-icons/react'

interface AuthDialogProps {
  open: boolean
  onAuthenticated: (userId: string, username: string) => void
}

export function AuthDialog({ open }: AuthDialogProps) {
  const handleMicrosoftLogin = () => {
    window.location.href = '/.auth/login/aad?post_login_redirect_uri=/'
  }

  const handleGitHubLogin = () => {
    window.location.href = '/.auth/login/github?post_login_redirect_uri=/'
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <Coffee size={48} weight="fill" className="text-primary" />
          </div>
          <DialogTitle className="text-center">Welcome to Coffee Dialer</DialogTitle>
          <DialogDescription className="text-center">
            Sign in to track your coffee extractions across all your devices
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Button
            type="button"
            className="w-full gap-2 h-11"
            onClick={handleMicrosoftLogin}
          >
            <User size={18} weight="fill" />
            Sign in with Microsoft
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 h-11"
            onClick={handleGitHubLogin}
          >
            <GithubLogo size={18} weight="fill" />
            Sign in with GitHub
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
