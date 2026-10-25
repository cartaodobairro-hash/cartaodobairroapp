import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/notifications";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  const { data } = useNotifications();
  const unread = (data ?? []).filter((notification) => !notification.read_at).length;
  return <Button asChild size="icon" variant="ghost" className="relative" title="Notificações">
    <Link to="/app/notificacoes" aria-label={unread ? `Notificações: ${unread} não lidas` : "Notificações"}>
      <Bell className="size-5" />
      {unread > 0 ? <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{unread > 99 ? "99+" : unread}</span> : null}
    </Link>
  </Button>;
}