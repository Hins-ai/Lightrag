import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/state'
import { useSettingsStore } from '@/stores/settings'
import { loginToServer, getAuthStatus } from '@/api/lightrag'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { SiteInfo } from '@/lib/constants'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { ShieldCheckIcon, ArrowRightIcon } from 'lucide-react'
import AppSettings from '@/components/AppSettings'
import BusIcon from '@/components/icons/BusIcon'

// Animated background particles component
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[100px] animate-float" />
      <div className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-accent/10 blur-[100px] animate-float" style={{ animationDelay: '-1.5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[80px] animate-float" style={{ animationDelay: '-3s' }} />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />

      {/* Floating dots */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-primary/20 blur-sm animate-float"
          style={{
            width: `${4 + i * 2}px`,
            height: `${4 + i * 2}px`,
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
            animationDelay: `${-i * 0.7}s`,
            animationDuration: `${3 + i * 0.5}s`
          }}
        />
      ))}
    </div>
  )
}

const LoginPage = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuthStore()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const authCheckRef = useRef(false); // Prevent duplicate calls in Vite dev mode

  useEffect(() => {
    console.log('LoginPage mounted')
  }, []);

  // Check if authentication is configured, skip login if not
  useEffect(() => {

    const checkAuthConfig = async () => {
      // Prevent duplicate calls in Vite dev mode
      if (authCheckRef.current) {
        return;
      }
      authCheckRef.current = true;

      try {
        // If already authenticated, redirect to home
        if (isAuthenticated) {
          navigate('/')
          return
        }

        // Check auth status
        const status = await getAuthStatus()

        // Set session flag for version check to avoid duplicate checks in App component
        if (status.core_version || status.api_version) {
          sessionStorage.setItem('VERSION_CHECKED_FROM_LOGIN', 'true');
        }

        if (!status.auth_configured && status.access_token) {
          // If auth is not configured, use the guest token and redirect
          login(status.access_token, true, status.core_version, status.api_version, status.webui_title || null, status.webui_description || null)
          if (status.message) {
            toast.info(status.message)
          }
          navigate('/')
          return
        }

        // Only set checkingAuth to false if we need to show the login page
        setCheckingAuth(false);

      } catch (error) {
        console.error('Failed to check auth configuration:', error)
        // Also set checkingAuth to false in case of error
        setCheckingAuth(false);
      }
      // Removed finally block as we're setting checkingAuth earlier
    }

    // Execute immediately
    checkAuthConfig()

    // Cleanup function to prevent state updates after unmount
    return () => {
    }
  }, [isAuthenticated, login, navigate])

  // Don't render anything while checking auth
  if (checkingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-orange-50/50 to-amber-100/50 dark:from-background dark:to-muted/30">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent animate-pulse-glow">
            <BusIcon className="h-5 w-8" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!username || !password) {
      toast.error(t('login.errorEmptyFields'))
      return
    }

    try {
      setLoading(true)
      const response = await loginToServer(username, password)

      // Get previous username from localStorage
      const previousUsername = localStorage.getItem('LIGHTRAG-PREVIOUS-USER')

      // Check if it's the same user logging in again
      const isSameUser = previousUsername === username

      // If it's not the same user, clear chat history
      if (isSameUser) {
        console.log('Same user logging in, preserving chat history')
      } else {
        console.log('Different user logging in, clearing chat history')
        // Directly clear chat history instead of setting a flag
        useSettingsStore.getState().setRetrievalHistory([])
      }

      // Update previous username
      localStorage.setItem('LIGHTRAG-PREVIOUS-USER', username)

      // Check authentication mode
      const isGuestMode = response.auth_mode === 'disabled'
      login(response.access_token, isGuestMode, response.core_version, response.api_version, response.webui_title || null, response.webui_description || null)

      // Set session flag for version check
      if (response.core_version || response.api_version) {
        sessionStorage.setItem('VERSION_CHECKED_FROM_LOGIN', 'true');
      }

      if (isGuestMode) {
        // Show authentication disabled notification
        toast.info(response.message || t('login.authDisabled', 'Authentication is disabled. Using guest access.'))
      } else {
        toast.success(t('login.successMessage'))
      }

      // Navigate to home page after successful login
      navigate('/')
    } catch (error) {
      console.error('Login failed...', error)
      toast.error(t('login.errorInvalidCredentials'))

      // Clear any existing auth state
      useAuthStore.getState().logout()
      // Clear local storage
      localStorage.removeItem('LIGHTRAG-API-TOKEN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-100/40 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <AnimatedBackground />

      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <AppSettings className="glass rounded-lg" />
      </div>

      <Card className="relative w-full max-w-[440px] mx-4 border-border/50 shadow-2xl shadow-primary/5 hover-lift animate-scale-in overflow-hidden">
        {/* Top gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary animate-shimmer" />

        <CardHeader className="flex items-center justify-center space-y-3 pb-6 pt-8">
          <div className="flex flex-col items-center space-y-4">
            {/* Logo with glow effect */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
              <div className="relative flex items-center justify-center w-20 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 px-2">
                <BusIcon className="h-10 w-16" aria-hidden="true" />
              </div>
            </div>
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight gradient-text">{SiteInfo.name}</h1>
              <p className="text-muted-foreground text-sm max-w-[280px]">
                {t('login.description')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="group">
                <label htmlFor="username-input" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1">
                  {t('login.username')}
                </label>
                <div className="relative">
                  <ShieldCheckIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50 transition-colors group-focus-within:text-primary/70" />
                  <Input
                    id="username-input"
                    placeholder={t('login.usernamePlaceholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-11 pl-10 bg-muted/30 border-muted-foreground/20 focus:border-primary/50 focus:ring-primary/20 transition-all focus-ring-glow"
                  />
                </div>
              </div>
              <div className="group">
                <label htmlFor="password-input" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 size-4 flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-muted-foreground/30 rounded-sm transition-colors group-focus-within:border-primary/50" />
                  </div>
                  <Input
                    id="password-input"
                    type="password"
                    placeholder={t('login.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pl-10 bg-muted/30 border-muted-foreground/20 focus:border-primary/50 focus:ring-primary/20 transition-all focus-ring-glow"
                  />
                </div>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold mt-2 btn-gradient text-white"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="spinner-ring size-4" />
                  {t('login.loggingIn')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {t('login.loginButton')}
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage
