export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-title">{title}</h1>
        {description && (
          <p className="mt-1 text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
