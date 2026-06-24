import { TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/state'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { SiteInfo, webuiPrefix } from '@/lib/constants'
import BusIcon from '@/components/icons/BusIcon'
import { FileTextIcon, NetworkIcon, SearchIcon, CodeIcon, Sparkles } from 'lucide-react'

const NAV_ITEMS = [
  { value: 'documents', icon: FileTextIcon, labelKey: 'header.documents' },
  { value: 'knowledge-graph', icon: NetworkIcon, labelKey: 'header.knowledgeGraph' },
  { value: 'retrieval', icon: SearchIcon, labelKey: 'header.retrieval' },
  { value: 'api', icon: CodeIcon, labelKey: 'header.api' },
]

export default function SiteSidebar() {
  const { t } = useTranslation()
  const currentTab = useSettingsStore.use.currentTab()
  const { isGuestMode } = useAuthStore()

  return (
    <aside className="glass-strong flex h-full w-44 shrink-0 flex-col border-r">
      {/* Logo */}
      <div className="flex h-11 items-center gap-2 border-b px-3">
        <a href={webuiPrefix} className="flex items-center gap-2 group">
          <div className="transition-transform duration-300 group-hover:scale-110">
            <BusIcon className="h-5 w-8" aria-hidden="true" />
          </div>
          <span className="font-bold text-xs tracking-tight gradient-text leading-tight">
            {SiteInfo.name}
          </span>
        </a>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 p-2">
        <TabsList className="flex flex-col h-auto gap-1 bg-transparent p-0">
          {NAV_ITEMS.map(({ value, icon: Icon, labelKey }) => {
            const isActive = currentTab === value
            return (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  'relative w-full cursor-pointer justify-start gap-2.5 px-3 py-2 text-sm font-medium transition-all duration-200 rounded-lg',
                  isActive
                    ? 'text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary to-accent shadow-md shadow-primary/20" />
                )}
                <span className="relative z-10 flex items-center gap-2.5">
                  <Icon className="size-4 shrink-0" />
                  <span>{t(labelKey)}</span>
                  {isActive && <Sparkles className="size-3 ml-auto opacity-70" />}
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>
      </nav>

      {/* Guest badge */}
      {isGuestMode && (
        <div className="px-3 pb-3">
          <div className="w-full text-center px-2 py-1 text-[10px] font-semibold tracking-wide uppercase bg-amber-100/80 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 rounded-full border border-amber-200/50 dark:border-amber-700/30">
            {t('login.guestMode', 'Guest Mode')}
          </div>
        </div>
      )}
    </aside>
  )
}
