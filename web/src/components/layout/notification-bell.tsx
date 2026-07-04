import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Bell, CheckCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { QK } from "@/lib/query-keys"
import { cn } from "@/lib/utils"
import {
  clearReadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/server/notifications"

export function NotificationBell() {
  const qc = useQueryClient()
  const router = useRouter()

  const { data } = useQuery({
    queryKey: QK.notifications,
    queryFn: () => listNotifications(),
    refetchInterval: 15_000,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: QK.notifications })

  const markRead = useMutation({
    mutationFn: (id: number) => markNotificationRead({ data: { id } }),
    onSuccess: invalidate,
  })
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: invalidate,
  })
  const clearRead = useMutation({
    mutationFn: () => clearReadNotifications(),
    onSuccess: invalidate,
  })

  const items = data?.items ?? []
  const unread = data?.unread ?? 0

  function onItem(n: NotificationRow) {
    if (!n.isRead) markRead.mutate(n.id)
    if (n.linkPage) router.history.push(n.linkPage)
  }

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon" aria-label="Notifikasi" />}
      >
        <span className="relative inline-flex">
          <Bell className="size-4.5" />
          {unread > 0 && (
            <span className="-top-1.5 -right-1.5 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-medium text-[10px] text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="font-medium text-sm">Notifikasi</p>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => markAll.mutate()}
              disabled={unread === 0}
            >
              <CheckCheck className="size-3.5" /> Semua
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Hapus yang sudah dibaca"
              onClick={() => clearRead.mutate()}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-muted-foreground text-sm">
              Belum ada notifikasi
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onItem(n)}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/50",
                      !n.isRead && "bg-primary/5"
                    )}
                  >
                    <span className="flex w-full items-center gap-2">
                      {!n.isRead && (
                        <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                      <span className="font-medium text-sm">{n.title}</span>
                    </span>
                    {n.message && (
                      <span className="text-muted-foreground text-xs">
                        {n.message}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                        locale: idLocale,
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
