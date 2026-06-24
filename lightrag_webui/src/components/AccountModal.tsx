import { useState } from 'react'
import { useAuthStore } from '@/stores/state'
import { changePassword } from '@/api/lightrag'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { UserCircleIcon, ShieldCheckIcon, ClockIcon, KeyRoundIcon } from 'lucide-react'

interface AccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="text-muted-foreground shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  )
}

export default function AccountModal({ open, onOpenChange }: AccountModalProps) {
  const { t } = useTranslation()
  const { username, isGuestMode, tokenExpiresAt } = useAuthStore()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const role = isGuestMode ? t('account.roleGuest', 'Guest') : t('account.roleUser', 'User')

  const tokenExpiry = tokenExpiresAt
    ? new Date(tokenExpiresAt * 1000).toLocaleString()
    : t('account.unknown', 'Unknown')

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error(t('account.passwordMismatch', 'New passwords do not match'))
      return
    }
    if (newPassword.length < 6) {
      toast.error(t('account.passwordTooShort', 'Password must be at least 6 characters'))
      return
    }
    try {
      setLoading(true)
      await changePassword(currentPassword, newPassword)
      toast.success(t('account.passwordChanged', 'Password changed successfully'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || t('account.passwordChangeFailed', 'Failed to change password')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[420px] p-0 overflow-hidden">
        {/* Header gradient */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />

        <div className="px-6 pt-5 pb-6 space-y-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserCircleIcon className="size-5 text-primary" />
              {t('account.title', 'Account Info')}
            </DialogTitle>
          </DialogHeader>

          {/* User info */}
          <div className="rounded-xl bg-muted/30 px-4 py-1">
            <InfoRow
              icon={<UserCircleIcon className="size-4" />}
              label={t('account.username', 'Username')}
              value={username || '-'}
            />
            <InfoRow
              icon={<ShieldCheckIcon className="size-4" />}
              label={t('account.role', 'Role')}
              value={role}
            />
            <InfoRow
              icon={<ClockIcon className="size-4" />}
              label={t('account.tokenExpiry', 'Token Expires')}
              value={tokenExpiry}
            />
          </div>

          {/* Change password — only for non-guest */}
          {!isGuestMode && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <KeyRoundIcon className="size-4 text-primary" />
                {t('account.changePassword', 'Change Password')}
              </div>
              <form onSubmit={handleChangePassword} className="space-y-2.5">
                <Input
                  type="password"
                  placeholder={t('account.currentPassword', 'Current password')}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  className="h-9 text-sm bg-muted/30"
                />
                <Input
                  type="password"
                  placeholder={t('account.newPassword', 'New password')}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  className="h-9 text-sm bg-muted/30"
                />
                <Input
                  type="password"
                  placeholder={t('account.confirmPassword', 'Confirm new password')}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="h-9 text-sm bg-muted/30"
                />
                <Button
                  type="submit"
                  className="w-full h-9 text-sm btn-gradient text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="spinner-ring size-3.5" />
                      {t('account.saving', 'Saving...')}
                    </span>
                  ) : t('account.savePassword', 'Save Password')}
                </Button>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
