import { useState, useCallback, useEffect, useRef } from 'react'
import ThemeProvider from '@/components/ThemeProvider'
import TabVisibilityProvider from '@/contexts/TabVisibilityProvider'
import ApiKeyAlert from '@/components/ApiKeyAlert'
import StatusIndicator from '@/components/status/StatusIndicator'
import { SiteInfo, webuiPrefix } from '@/lib/constants'
import { useBackendState, useAuthStore } from '@/stores/state'
import { useSettingsStore } from '@/stores/settings'
import { getAuthStatus } from '@/api/lightrag'
import SiteHeader from '@/features/SiteHeader'
import { InvalidApiKeyError, RequireApiKeError } from '@/api/lightrag'
import { Sparkles } from 'lucide-react'
import BusIcon from '@/components/icons/BusIcon'

import GraphViewer from '@/features/GraphViewer'
import DocumentManager from '@/features/DocumentManager'
import RetrievalTesting from '@/features/RetrievalTesting'
import ApiSite from '@/features/ApiSite'
import SiteSidebar from '@/features/SiteSidebar'

import { Tabs, TabsContent } from '@/components/ui/Tabs'

function App() {
  const message = useBackendState.use.message()
  const enableHealthCheck = useSettingsStore.use.enableHealthCheck()
  const currentTab = useSettingsStore.use.currentTab()
  const [apiKeyAlertOpen, setApiKeyAlertOpen] = useState(false)
  const [initializing, setInitializing] = useState(true) // Add initializing state
  const versionCheckRef = useRef(false); // Prevent duplicate calls in Vite dev mode
  const healthCheckInitializedRef = useRef(false); // Prevent duplicate health checks in Vite dev mode

  const handleApiKeyAlertOpenChange = useCallback((open: boolean) => {
    setApiKeyAlertOpen(open)
    if (!open) {
      useBackendState.getState().clear()
    }
  }, [])

  // Track component mount status with useRef
  const isMountedRef = useRef(true);

  // Set up mount/unmount status tracking
  useEffect(() => {
    isMountedRef.current = true;

    // Handle page reload/unload
    const handleBeforeUnload = () => {
      isMountedRef.current = false;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Health check - can be disabled
  useEffect(() => {
    // Health check function
    const performHealthCheck = async () => {
      try {
        // Only perform health check if component is still mounted
        if (isMountedRef.current) {
          await useBackendState.getState().check();
        }
      } catch (error) {
        console.error('Health check error:', error);
      }
    };

    // Set health check function in the store
    useBackendState.getState().setHealthCheckFunction(performHealthCheck);

    if (!enableHealthCheck || apiKeyAlertOpen) {
      useBackendState.getState().clearHealthCheckTimer();
      return;
    }

    // On first mount or when enableHealthCheck becomes true and apiKeyAlertOpen is false,
    // perform an immediate health check and start the timer
    if (!healthCheckInitializedRef.current) {
      healthCheckInitializedRef.current = true;
    }

    // Start/reset the health check timer using the store
    useBackendState.getState().resetHealthCheckTimer();

    // Component unmount cleanup
    return () => {
      useBackendState.getState().clearHealthCheckTimer();
    };
  }, [enableHealthCheck, apiKeyAlertOpen]);

  // Version check - independent and executed only once
  useEffect(() => {
    const checkVersion = async () => {
      // Prevent duplicate calls in Vite dev mode
      if (versionCheckRef.current) return;
      versionCheckRef.current = true;

      // Check if version info was already obtained in login page
      const versionCheckedFromLogin = sessionStorage.getItem('VERSION_CHECKED_FROM_LOGIN') === 'true';
      if (versionCheckedFromLogin) {
        setInitializing(false); // Skip initialization if already checked
        return;
      }

      try {
        setInitializing(true); // Start initialization

        // Get version info
        const token = localStorage.getItem('LIGHTRAG-API-TOKEN');
        const status = await getAuthStatus();

        // If auth is not configured and a new token is returned, use the new token
        if (!status.auth_configured && status.access_token) {
          useAuthStore.getState().login(
            status.access_token, // Use the new token
            true, // Guest mode
            status.core_version,
            status.api_version,
            status.webui_title || null,
            status.webui_description || null
          );
        } else if (token && (status.core_version || status.api_version || status.webui_title || status.webui_description)) {
          // Otherwise use the old token (if it exists)
          const isGuestMode = status.auth_mode === 'disabled' || useAuthStore.getState().isGuestMode;
          useAuthStore.getState().login(
            token,
            isGuestMode,
            status.core_version,
            status.api_version,
            status.webui_title || null,
            status.webui_description || null
          );
        }

        // Set flag to indicate version info has been checked
        sessionStorage.setItem('VERSION_CHECKED_FROM_LOGIN', 'true');
      } catch (error) {
        console.error('Failed to get version info:', error);
      } finally {
        // Ensure initializing is set to false even if there's an error
        setInitializing(false);
      }
    };

    // Execute version check
    checkVersion();
  }, []); // Empty dependency array ensures it only runs once on mount

  const handleTabChange = useCallback(
    (tab: string) => useSettingsStore.getState().setCurrentTab(tab as any),
    []
  )

  // React to backend message changes during render rather than via useEffect
  // (avoids cascading renders flagged by react-hooks/set-state-in-effect)
  const [previousMessage, setPreviousMessage] = useState(message)
  if (message !== previousMessage) {
    setPreviousMessage(message)
    if (message && (message.includes(InvalidApiKeyError) || message.includes(RequireApiKeError))) {
      setApiKeyAlertOpen(true)
    }
  }

  return (
    <ThemeProvider>
      <TabVisibilityProvider>
        {initializing ? (
          // Loading state while initializing with simplified header
          <div className="flex h-screen w-screen flex-col bg-gradient-to-br from-background to-muted/30">
            {/* Simplified header during initialization - matches SiteHeader structure */}
            <header className="glass-strong sticky top-0 z-50 flex h-11 w-full border-b px-4">
              <div className="min-w-[200px] w-auto flex items-center">
                <a href={webuiPrefix} className="flex items-center gap-2">
                  <BusIcon className="h-4 w-6" aria-hidden="true" />
                  <span className="font-bold md:inline-block gradient-text">{SiteInfo.name}</span>
                </a>
              </div>

              {/* Empty middle section to maintain layout */}
              <div className="flex h-10 flex-1 items-center justify-center">
              </div>

              {/* Empty right section to maintain layout */}
              <nav className="w-[200px] flex items-center justify-end">
              </nav>
            </header>

            {/* Loading indicator in content area */}
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center space-y-4 animate-fade-in">
                <div className="relative mx-auto">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
                  <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
                    <Sparkles className="size-6 text-white animate-pulse" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Initializing</p>
                  <p className="text-xs text-muted-foreground">Preparing your workspace...</p>
                </div>
                <div className="flex justify-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 typing-dot" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 typing-dot" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 typing-dot" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Main content after initialization
          <main className="flex h-screen w-screen overflow-hidden">
            <Tabs
              defaultValue={currentTab}
              className="!m-0 flex grow !p-0 overflow-hidden"
              onValueChange={handleTabChange}
            >
              <SiteSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <SiteHeader />
                <div className="relative grow">
                  <TabsContent value="documents" className="absolute top-0 right-0 bottom-0 left-0 overflow-auto">
                    <DocumentManager />
                  </TabsContent>
                  <TabsContent value="knowledge-graph" className="absolute top-0 right-0 bottom-0 left-0 overflow-hidden">
                    <GraphViewer />
                  </TabsContent>
                  <TabsContent value="retrieval" className="absolute top-0 right-0 bottom-0 left-0 overflow-hidden">
                    <RetrievalTesting />
                  </TabsContent>
                  <TabsContent value="api" className="absolute top-0 right-0 bottom-0 left-0 overflow-hidden">
                    <ApiSite />
                  </TabsContent>
                </div>
              </div>
            </Tabs>
            {enableHealthCheck && <StatusIndicator />}
            <ApiKeyAlert open={apiKeyAlertOpen} onOpenChange={handleApiKeyAlertOpenChange} />
          </main>
        )}
      </TabVisibilityProvider>
    </ThemeProvider>
  )
}

export default App
