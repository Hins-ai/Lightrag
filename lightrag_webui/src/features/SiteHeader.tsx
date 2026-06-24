import { useState } from 'react'
import Button from '@/components/ui/Button'
import AppSettings from '@/components/AppSettings'
import { useAuthStore } from '@/stores/state'
import { useTranslation } from 'react-i18next'
import { navigationService } from '@/services/navigation'
import { LogOutIcon } from 'lucide-react'
import GithubIcon from '@/components/icons/GithubIcon'
import { SiteInfo } from '@/lib/constants'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import AccountModal from '@/components/AccountModal'

export default function SiteHeader() {
  const { t } = useTranslation()
  const { isGuestMode, coreVersion, apiVersion, username, webuiTitle, webuiDescription } = useAuthStore()
  const [accountModalOpen, setAccountModalOpen] = useState(false)

  const versionDisplay = (coreVersion && apiVersion)
    ? `${coreVersion}/${apiVersion}`
    : null

  const hasWarning = apiVersion?.endsWith('⚠️')
  const versionTooltip = hasWarning
    ? t('header.frontendNeedsRebuild')
    : versionDisplay ? `v${versionDisplay}` : ''

  const handleLogout = () => {
    navigationService.navigateToLogin()
  }

  return (
    <header className="glass-strong sticky top-0 z-50 flex h-11 w-full items-center border-b px-4 shadow-sm">
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Title / description */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        {webuiTitle ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm font-medium text-muted-foreground truncate cursor-default">
                  {webuiTitle}
                </span>
              </TooltipTrigger>
              {webuiDescription && (
                <TooltipContent side="bottom">{webuiDescription}</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-sm text-muted-foreground/50 truncate">{SiteInfo.name}</span>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {versionDisplay && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[11px] font-mono text-muted-foreground/70 mr-1 cursor-default px-1.5 py-0.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                  v{versionDisplay}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">{versionTooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Button variant="ghost" size="icon" side="bottom" tooltip={t('header.projectRepository')} className="hover-glow">
          <a href={SiteInfo.github} target="_blank" rel="noopener noreferrer">
            <GithubIcon className="size-4" />
          </a>
        </Button>
        <AppSettings />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setAccountModalOpen(true)}
                className="flex items-center justify-center size-7 rounded-full bg-primary/15 hover:bg-primary/25 transition-colors text-primary font-semibold text-xs shrink-0"
                aria-label={t('header.account', 'Account')}
              >
                {username ? username.charAt(0).toUpperCase() : '?'}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {username || t('header.account', 'Account')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {!isGuestMode && (
          <Button
            variant="ghost"
            size="icon"
            side="bottom"
            tooltip={`${t('header.logout')} (${username})`}
            onClick={handleLogout}
            className="hover-glow hover:text-destructive"
          >
            <LogOutIcon className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      <AccountModal open={accountModalOpen} onOpenChange={setAccountModalOpen} />
    </header>
  )
}
