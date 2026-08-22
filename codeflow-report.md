# CodeFlow Analysis Report

**Repository:** anasubaid19/alwildan-hr-system
**Analyzed:** 23/07/2026, 08.46.14

## Summary

| Metric | Value |
|--------|-------|
| Health Score | 57/100 (F) |
| Files | 48 |
| Functions | 205 |
| Lines of Code | 7.824 |
| Dependencies | 28 |
| Unused Functions | 111 |
| Security Issues | 5 |

## Security Issues

### HIGH: Hardcoded Secret
- **File:** `web/.env.example` (line 5)
- **Description:** Credentials should never be hardcoded. Use environment variables or a secrets manager.
- **Code:** `BETTER_AUTH_SECRET="ganti-dengan-secret-32-char"`

### HIGH: Hardcoded Secret
- **File:** `web/.env.example` (line 26)
- **Description:** Credentials should never be hardcoded. Use environment variables or a secrets manager.
- **Code:** `AI_API_KEY="gsk_xxx"`

### HIGH: Shell Command Execution
- **File:** `web/src/components/layout/app-shell.tsx`
- **Description:** Shell() executes system commands. Ensure input is validated.

### HIGH: XSS Vulnerability
- **File:** `web/src/components/ui/chart.tsx`
- **Description:** Direct HTML injection can lead to XSS attacks. Sanitize user input.

### LOW: Code Comments
- **File:** `web/bun.lock`
- **Description:** 1 TODO/FIXME comments found. Address before release.

## Unused Functions (111)

These functions have zero calls (internal or external) and may be dead code:

### `Accordion()`
- **File:** `web/src/components/ui/accordion.tsx`
- **Line:** 6
- **Lines of code:** 12
```
function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-2xl border",
        className
      )}
      {...props}
    />
  )
}
```

### `AccordionItem()`
- **File:** `web/src/components/ui/accordion.tsx`
- **Line:** 19
- **Lines of code:** 9
```
function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("not-last:border-b data-open:bg-muted/50", className)}
      {...props}
    />
  )
}
```

### `AccordionTrigger()`
- **File:** `web/src/components/ui/accordion.tsx`
- **Line:** 29
- **Lines of code:** 16
```
function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger relative flex flex-1 items-start justify-between gap-6 border border-transparent p-4 text-left text-sm font-medium transition-all outline-none hover:underline aria-disabled:pointer-events-none aria-disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
          className
        )}
        {...props}
      >
  // ...
```

### `AccordionContent()`
- **File:** `web/src/components/ui/accordion.tsx`
- **Line:** 62
- **Lines of code:** 16
```
function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="overflow-hidden px-4 text-sm data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn(
          "h-(--accordion-panel-height) pt-0 pb-4 data-ending-style:h-0 data-starting-style:h-0 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className
  // ...
```

### `AlertDialog()`
- **File:** `web/src/components/ui/alert-dialog.tsx`
- **Line:** 8
- **Lines of code:** 3
```
function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}
```

### `AlertDialogTrigger()`
- **File:** `web/src/components/ui/alert-dialog.tsx`
- **Line:** 12
- **Lines of code:** 5
```
function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}
```

### `AlertDialogContent()`
- **File:** `web/src/components/ui/alert-dialog.tsx`
- **Line:** 40
- **Lines of code:** 16
```
function AlertDialogContent({
  className,
  size = "default",
  ...props
}: AlertDialogPrimitive.Popup.Props & {
  size?: "default" | "sm"
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          "group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-6 rounded-4xl bg-popover p-6 text-popover-foreground shadow-xl ring-1 ring-foreground/5 duration-100 outline-none data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-md dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
  // ...
```

### `AlertDialogHeader()`
- **File:** `web/src/components/ui/alert-dialog.tsx`
- **Line:** 63
- **Lines of code:** 16
```
function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-6 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
        className
      )}
      {...props}
    />
  )
}
  // ...
```

### `AlertDialogFooter()`
- **File:** `web/src/components/ui/alert-dialog.tsx`
- **Line:** 79
- **Lines of code:** 16
```
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}
  // ...
```

### `AlertDialogMedia()`
- **File:** `web/src/components/ui/alert-dialog.tsx`
- **Line:** 95
- **Lines of code:** 16
```
function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "mb-2 inline-flex size-16 items-center justify-center rounded-full bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-8",
        className
      )}
      {...props}
    />
  )
}
  // ...
```

### `AlertDialogTitle()`
- **File:** `web/src/components/ui/alert-dialog.tsx`
- **Line:** 111
- **Lines of code:** 16
```
function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        "font-heading text-lg font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
        className
      )}
      {...props}
    />
  )
}
  // ...
```

### `AlertDialogDescription()`
- **File:** `web/src/components/ui/alert-dialog.tsx`
- **Line:** 127
- **Lines of code:** 16
```
function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(
        "text-sm text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}
  // ...
```

### `AlertDialogAction()`
- **File:** `web/src/components/ui/alert-dialog.tsx`
- **Line:** 143
- **Lines of code:** 12
```
function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="alert-dialog-action"
      className={cn(className)}
      {...props}
    />
  )
}
```

### `AlertDialogCancel()`
- **File:** `web/src/components/ui/alert-dialog.tsx`
- **Line:** 156
- **Lines of code:** 16
```
function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  )
  // ...
```

### `Alert()`
- **File:** `web/src/components/ui/alert.tsx`
- **Line:** 22
- **Lines of code:** 14
```
function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}
```

### `AlertTitle()`
- **File:** `web/src/components/ui/alert.tsx`
- **Line:** 37
- **Lines of code:** 12
```
function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}
```

### `AlertDescription()`
- **File:** `web/src/components/ui/alert.tsx`
- **Line:** 50
- **Lines of code:** 16
```
function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  )
}
  // ...
```

### `AlertAction()`
- **File:** `web/src/components/ui/alert.tsx`
- **Line:** 66
- **Lines of code:** 9
```
function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2.5 right-3", className)}
      {...props}
    />
  )
}
```

### `AspectRatio()`
- **File:** `web/src/components/ui/aspect-ratio.tsx`
- **Line:** 3
- **Lines of code:** 16
```
function AspectRatio({
  ratio,
  className,
  ...props
}: React.ComponentProps<"div"> & { ratio: number }) {
  return (
    <div
      data-slot="aspect-ratio"
      style={
        {
          "--ratio": ratio,
        } as React.CSSProperties
      }
      className={cn("relative aspect-(--ratio)", className)}
      {...props}
  // ...
```

### `Avatar()`
- **File:** `web/src/components/ui/avatar.tsx`
- **Line:** 6
- **Lines of code:** 16
```
function Avatar({
  className,
  size = "default",
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: "default" | "sm" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
        className
      )}
  // ...
```

### `AvatarImage()`
- **File:** `web/src/components/ui/avatar.tsx`
- **Line:** 26
- **Lines of code:** 12
```
function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full rounded-full object-cover",
        className
      )}
      {...props}
    />
  )
}
```

### `AvatarFallback()`
- **File:** `web/src/components/ui/avatar.tsx`
- **Line:** 39
- **Lines of code:** 16
```
function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
        className
      )}
      {...props}
    />
  )
}
  // ...
```

### `AvatarBadge()`
- **File:** `web/src/components/ui/avatar.tsx`
- **Line:** 55
- **Lines of code:** 16
```
function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}
  // ...
```

### `AvatarGroup()`
- **File:** `web/src/components/ui/avatar.tsx`
- **Line:** 71
- **Lines of code:** 12
```
function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}
```

### `AvatarGroupCount()`
- **File:** `web/src/components/ui/avatar.tsx`
- **Line:** 84
- **Lines of code:** 16
```
function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}
  // ...
```

### `Badge()`
- **File:** `web/src/components/ui/badge.tsx`
- **Line:** 30
- **Lines of code:** 16
```
function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
  // ...
```

### `Breadcrumb()`
- **File:** `web/src/components/ui/breadcrumb.tsx`
- **Line:** 11
- **Lines of code:** 10
```
function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="breadcrumb"
      data-slot="breadcrumb"
      className={cn(className)}
      {...props}
    />
  )
}
```

### `BreadcrumbList()`
- **File:** `web/src/components/ui/breadcrumb.tsx`
- **Line:** 22
- **Lines of code:** 12
```
function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-sm wrap-break-word text-muted-foreground sm:gap-2.5",
        className
      )}
      {...props}
    />
  )
}
```

### `BreadcrumbItem()`
- **File:** `web/src/components/ui/breadcrumb.tsx`
- **Line:** 35
- **Lines of code:** 9
```
function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  )
}
```

### `BreadcrumbLink()`
- **File:** `web/src/components/ui/breadcrumb.tsx`
- **Line:** 45
- **Lines of code:** 16
```
function BreadcrumbLink({
  className,
  render,
  ...props
}: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn("transition-colors hover:text-foreground", className),
      },
      props
    ),
    render,
    state: {
  // ...
```

### `BreadcrumbPage()`
- **File:** `web/src/components/ui/breadcrumb.tsx`
- **Line:** 65
- **Lines of code:** 12
```
function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("font-normal text-foreground", className)}
      {...props}
    />
  )
}
```

### `BreadcrumbSeparator()`
- **File:** `web/src/components/ui/breadcrumb.tsx`
- **Line:** 78
- **Lines of code:** 16
```
function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />}
    </li>
  // ...
```

### `BreadcrumbEllipsis()`
- **File:** `web/src/components/ui/breadcrumb.tsx`
- **Line:** 96
- **Lines of code:** 16
```
function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn(
        "flex size-5 items-center justify-center [&>svg]:size-4",
        className
      )}
      {...props}
    >
  // ...
```

### `ButtonGroup()`
- **File:** `web/src/components/ui/button-group.tsx`
- **Line:** 24
- **Lines of code:** 16
```
function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  )
}
  // ...
```

### `ButtonGroupText()`
- **File:** `web/src/components/ui/button-group.tsx`
- **Line:** 40
- **Lines of code:** 16
```
function ButtonGroupText({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "flex items-center gap-2 rounded-4xl border bg-muted px-2.5 text-sm font-medium [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
          className
        ),
      },
      props
  // ...
```

### `ButtonGroupSeparator()`
- **File:** `web/src/components/ui/button-group.tsx`
- **Line:** 63
- **Lines of code:** 16
```
function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        "relative self-stretch bg-input data-horizontal:mx-px data-horizontal:w-auto data-vertical:my-px data-vertical:h-auto",
        className
      )}
      {...props}
    />
  // ...
```

### `Calendar()`
- **File:** `web/src/components/ui/calendar.tsx`
- **Line:** 19
- **Lines of code:** 16
```
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  // ...
```

### `CardAction()`
- **File:** `web/src/components/ui/card.tsx`
- **Line:** 56
- **Lines of code:** 12
```
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}
```

### `CardContent()`
- **File:** `web/src/components/ui/card.tsx`
- **Line:** 69
- **Lines of code:** 9
```
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}
```

### `CardFooter()`
- **File:** `web/src/components/ui/card.tsx`
- **Line:** 79
- **Lines of code:** 12
```
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-4xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}
```

### `ChartContainer()`
- **File:** `web/src/components/ui/chart.tsx`
- **Line:** 40
- **Lines of code:** 16
```
function ChartContainer({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"]
  initialDimension?: {
    width: number
    height: number
  // ...
```

### `ChartTooltipContent()`
- **File:** `web/src/components/ui/chart.tsx`
- **Line:** 117
- **Lines of code:** 16
```
function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  // ...
```

### `ChartLegendContent()`
- **File:** `web/src/components/ui/chart.tsx`
- **Line:** 273
- **Lines of code:** 16
```
function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> & {
  hideIcon?: boolean
  nameKey?: string
} & RechartsPrimitive.DefaultLegendContentProps) {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }
  // ...
```

### `Checkbox()`
- **File:** `web/src/components/ui/checkbox.tsx`
- **Line:** 8
- **Lines of code:** 16
```
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-transparent bg-input/90 transition-shadow outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
  // ...
```

### `Collapsible()`
- **File:** `web/src/components/ui/collapsible.tsx`
- **Line:** 3
- **Lines of code:** 3
```
function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}
```

### `CollapsibleTrigger()`
- **File:** `web/src/components/ui/collapsible.tsx`
- **Line:** 7
- **Lines of code:** 5
```
function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  )
}
```

### `CollapsibleContent()`
- **File:** `web/src/components/ui/collapsible.tsx`
- **Line:** 13
- **Lines of code:** 5
```
function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
  )
}
```

### `ComboboxValue()`
- **File:** `web/src/components/ui/combobox.tsx`
- **Line:** 20
- **Lines of code:** 3
```
function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />
}
```

### `ComboboxInput()`
- **File:** `web/src/components/ui/combobox.tsx`
- **Line:** 62
- **Lines of code:** 16
```
function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean
  showClear?: boolean
}) {
  return (
    <InputGroup className={cn("w-auto", className)}>
      <ComboboxPrimitive.Input
        render={<InputGroupInput disabled={disabled} />}
  // ...
```

### `ComboboxContent()`
- **File:** `web/src/components/ui/combobox.tsx`
- **Line:** 97
- **Lines of code:** 16
```
function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >) {
  return (
    <ComboboxPrimitive.Portal>
  // ...
```


*...and 61 more unused functions*

## Design Patterns

### Factory
Creates objects without specifying exact class. Enables loose coupling and extensibility.

**Files:** `BETTER-AUTH-MIGRATION.md`

### Observer/Event
Defines a subscription mechanism for event-driven architecture. Great for decoupling.

**Files:** `app-shell.tsx`

### Context Provider
React Context for global state. Alternative to prop drilling.

**Files:** `BETTER-AUTH-MIGRATION.md`, `PRD-REBUILD.md`, `.env.example`, `README.md`, `chart.tsx`NaN more)

## Anti-Patterns

### God Object
Files with too many responsibilities (15+ functions). Consider splitting into smaller modules.

**Affected files:** `combobox.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`

## Architecture Issues

### 111 Unused Functions
Functions not called from other files

**Affected:** `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`, `AlertDialog`

### 3 Large Files
Files with 15+ functions

**Affected:** `combobox.tsx (17 fns)`, `context-menu.tsx (16 fns)`, `dropdown-menu.tsx (16 fns)`

### 1 Highly Coupled
Files that import 8+ other files

**Affected:** `app-shell.tsx (11 imports)`

### 1 Duplicate Function Names
Same function name in multiple files

**Affected:** `_extends (20 files)`

### 2 Similar Code Blocks
Copy-paste code detected

**Affected:** `AlertDialogTrigger, AlertDialogPortal, Root, CollapsibleTrigger, CollapsibleContent, ComboboxCollection, ContextMenuPortal, ContextMenuGroup, ContextMenuSub, ContextMenuSubContent, ContextMenuRadioGroup, DropdownMenuRadioGroup`, `ComboboxContent, ContextMenuContent, DropdownMenuContent`

### 1 High Complexity Files
Files with complexity score >30

**Affected:** `chart.tsx (47)`

## File Details

| File | Folder | Layer | Lines | Functions |
|------|--------|-------|-------|----------|
| `.gitignore` | root | utils | 37 | 0 |
| `BETTER-AUTH-MIGRATION.md` | root | note | 96 | 0 |
| `PRD-REBUILD.md` | root | note | 401 | 0 |
| `README.md` | root | note | 128 | 0 |
| `.env.example` | web | utils | 28 | 0 |
| `.gitignore` | web | utils | 18 | 0 |
| `Dockerfile` | web | utils | 37 | 0 |
| `README.md` | web | note | 66 | 0 |
| `biome.json` | web | utils | 89 | 0 |
| `bun.lock` | web | utils | 1528 | 0 |
| `components.json` | web | components | 23 | 0 |
| `docker-compose.yml` | web | utils | 56 | 0 |
| `drizzle.config.ts` | web | utils | 13 | 0 |
| `0000_shallow_nocturne.sql` | web/drizzle | utils | 163 | 0 |
| `0000_snapshot.json` | web/drizzle/meta | utils | 1076 | 0 |
| `_journal.json` | web/drizzle/meta | utils | 13 | 0 |
| `package.json` | web | utils | 75 | 0 |
| `auth-card.tsx` | web/src/components | components | 34 | 1 |
| `app-shell.tsx` | web/src/components/layout | components | 268 | 11 |
| `error-fallback.tsx` | web/src/components/layout | components | 41 | 3 |
| `notification-bell.tsx` | web/src/components/layout | components | 136 | 10 |
| `page-header.tsx` | web/src/components/layout | components | 22 | 1 |
| `search-command.tsx` | web/src/components/layout | components | 115 | 5 |
| `accordion.tsx` | web/src/components/ui | ui | 86 | 5 |
| `alert-dialog.tsx` | web/src/components/ui | ui | 187 | 13 |
| `alert.tsx` | web/src/components/ui | ui | 77 | 5 |
| `aspect-ratio.tsx` | web/src/components/ui | ui | 23 | 2 |
| `avatar.tsx` | web/src/components/ui | ui | 108 | 7 |
| `badge.tsx` | web/src/components/ui | ui | 53 | 1 |
| `breadcrumb.tsx` | web/src/components/ui | ui | 126 | 8 |
| `button-group.tsx` | web/src/components/ui | ui | 87 | 4 |
| `button.tsx` | web/src/components/ui | ui | 140 | 1 |
| `calendar.tsx` | web/src/components/ui | ui | 240 | 8 |
| `card.tsx` | web/src/components/ui | ui | 101 | 8 |
| `chart.tsx` | web/src/components/ui | ui | 372 | 7 |
| `checkbox.tsx` | web/src/components/ui | ui | 29 | 2 |
| `collapsible.tsx` | web/src/components/ui | ui | 20 | 4 |
| `combobox.tsx` | web/src/components/ui | ui | 319 | 17 |
| `command.tsx` | web/src/components/ui | ui | 202 | 10 |
| `context-menu.tsx` | web/src/components/ui | ui | 277 | 16 |
| `dialog.tsx` | web/src/components/ui | ui | 158 | 11 |
| `direction.tsx` | web/src/components/ui | ui | 5 | 0 |
| `drawer.tsx` | web/src/components/ui | ui | 135 | 11 |
| `dropdown-menu.tsx` | web/src/components/ui | ui | 275 | 16 |
| `empty.tsx` | web/src/components/ui | ui | 105 | 7 |
| `field.tsx` | web/src/components/ui | ui | 236 | 11 |
| `styles.css` | web/src | utils | 0 | 0 |
| `tsconfig.json` | web | utils | 0 | 0 |
