import { Bell, Check, CheckCheck, X, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../services/api";

type Notification = {
  id: string;
  message: string;
  type: string;
  read_at: string | null;
  created_at: string;
};

const typeColors: Record<string, string> = {
  application: "bg-[#146c45]",
  course: "bg-[#157a4f]",
  job: "bg-[#1a8f5a]",
  status: "bg-[#b45309]",
  system: "bg-[#7a8b84]",
};

function formatTime(dateStr: string) {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch { return ""; }
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await apiRequest<{ notifications: Notification[] }>("/api/notifications");
      setNotifications(res.notifications);
    } catch {
      setNotifications([]);
    }
  }

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markRead(id: string) {
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((curr) => curr.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch { /* silent */ }
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    await Promise.all(unreadIds.map((id) => markRead(id)));
  }

  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        type="button"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-lg text-[#5b6b64] transition duration-200 hover:bg-[#f0f7f3] hover:text-[#12241c]"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#146c45] px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-[#e4eee9] bg-white shadow-[0_18px_40px_-28px_rgba(18,50,36,0.28)]">
          <div className="flex items-center justify-between border-b border-[#e4eee9] px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-[#5b6b64]" />
              <h2 className="text-sm font-semibold text-[#12241c]">Notifications</h2>
              {unread > 0 && (
                <span className="rounded-full bg-[#eaf6f0] px-2 py-0.5 text-xs font-semibold text-[#146c45]">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  aria-label="Mark all as read"
                  title="Mark all as read"
                  className="grid h-10 w-10 place-items-center rounded-lg text-[#7a8b84] transition duration-200 hover:bg-[#f0f7f3] hover:text-[#146c45]"
                >
                  <CheckCheck size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="grid h-10 w-10 place-items-center rounded-lg text-[#7a8b84] transition duration-200 hover:bg-[#f0f7f3] hover:text-[#12241c]"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell size={28} className="text-[#cfe6db]" />
                <p className="mt-2 text-sm font-medium text-[#5b6b64]">No notifications yet</p>
                <p className="mt-0.5 text-xs text-[#7a8b84]">We'll let you know when something happens.</p>
              </div>
            )}

            {notifications.map((n) => {
              const dotColor = typeColors[n.type] ?? typeColors.system;
              return (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => void markRead(n.id)}
                  className={`flex min-h-11 w-full items-start gap-3 px-4 py-3 text-left transition duration-200 hover:bg-[#f7fbf9] ${
                    n.read_at ? "opacity-60" : ""
                  }`}
                >
                  <div className="mt-1.5 flex shrink-0 flex-col items-center gap-1">
                    <div className={`h-2 w-2 rounded-full ${n.read_at ? "bg-[#e4eee9]" : dotColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-5 ${n.read_at ? "text-[#5b6b64]" : "font-medium text-[#12241c]"}`}>
                      {n.message}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[#7a8b84]">
                      <Clock size={11} />
                      {formatTime(n.created_at)}
                    </div>
                  </div>
                  {!n.read_at && (
                    <Check size={14} className="mt-1 shrink-0 text-[#146c45]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-[#e4eee9] px-4 py-2.5 text-center">
              <p className="text-xs text-[#7a8b84]">Click a notification to mark it as read.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
