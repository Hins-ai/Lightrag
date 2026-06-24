import { cn } from '@/lib/utils'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { FilesIcon } from 'lucide-react'

interface EmptyCardProps extends React.ComponentPropsWithoutRef<typeof Card> {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}

export default function EmptyCard({
  title,
  description,
  icon: Icon = FilesIcon,
  action,
  className,
  ...props
}: EmptyCardProps) {
  return (
    <Card
      className={cn(
        'flex h-full min-h-0 w-full flex-col items-center justify-center space-y-6 rounded-none bg-transparent p-16',
        className
      )}
      {...props}
    >
      <div className="relative">
        {/* Glow behind icon */}
        <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full scale-150" />
        <div className="relative mr-4 shrink-0 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5">
          <Icon className="text-primary/60 size-10" aria-hidden="true" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description ? <CardDescription className="max-w-[280px]">{description}</CardDescription> : null}
      </div>
      {action ? action : null}
    </Card>
  )
}
