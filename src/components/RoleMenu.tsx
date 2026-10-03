import { ChevronDown, LogOut, Menu, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { supabase } from "../services/api";
import { getCachedUser, subscribeToUser } from "../services/auth";
import NotificationBell from "./NotificationBell";
import RoleSwitcher from "./RoleSwitcher";

function getUserInitials(user: ReturnType<typeof getCachedUser>) {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = typeof meta.full_name === "string" ? meta.full_name : (user?.email ?? "");
  return fullName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

function getRawAvatarUrl(user: ReturnType<typeof getCachedUser>) {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  return typeof meta.avatar_url === "string" ? meta.avatar_url : "";
}

export type RoleNavItem = { to: string; label: string; icon: ReactNode };
export type RoleNavGroup = { id: string; label: string; icon?: ReactNode; items: RoleNavItem[] };

function pathMatches(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function RoleMenu({
  homeTo,
  brand,
  logo,
  primary,
  groups,
  onLogout,
  profileTo,
  profileLabel = "Profile",
}: {
  homeTo: string;
  brand: string;
  logo?: ReactNode;
  primary: RoleNavItem[];
  groups: RoleNavGroup[];
  onLogout: () => void;
  profileTo?: string;
  profileLabel?: string;
}) {
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const [avatarUser, setAvatarUser] = useState(getCachedUser());
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState("");

  useEffect(() => subscribeToUser((u) => setAvatarUser(u)), []);

  useEffect(() => {
    void (async () => {
      let raw = getRawAvatarUrl(avatarUser);
      // Fallback: if user_metadata.avatar_url is not set, fetch from candidate_profiles.
      if (!raw && avatarUser?.id) {
        const { data: profileRow } = await supabase
          .from("candidate_profiles")
          .select("avatar_url")
          .eq("id", avatarUser.id)
          .maybeSingle();
        raw = (profileRow as { avatar_url?: string } | null)?.avatar_url ?? "";
        // Backfill user_metadata so subsequent renders skip the DB call.
        if (raw) {
          void supabase.auth.updateUser({ data: { avatar_url: raw } });
        }
      }
      if (!raw) { setResolvedAvatarUrl(""); return; }
      if (/^https?:\/\//i.test(raw)) { setResolvedAvatarUrl(raw); return; }
      const { data } = await supabase.storage.from("avatars").createSignedUrl(raw, 3600);
      setResolvedAvatarUrl(data?.signedUrl ?? "");
    })();
  }, [avatarUser]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenMenu(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null);
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    setOpenMenu(null);
    setPanelOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = panelOpen ? "hidden" : "";
    if (panelOpen) setOpenMenu(null);
    return () => { document.body.style.overflow = ""; };
  }, [panelOpen]);

  const headerLink = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition duration-200 ${
      isActive ? "bg-[#146c45] text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)]" : "text-[#5b6b64] hover:bg-[#f0f7f3] hover:text-[#12241c]"
    }`;

  const menuLink = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium transition duration-200 ${
      isActive ? "bg-[#eaf6f0] text-[#146c45]" : "text-[#3d4d46] hover:bg-[#f0f7f3]"
    }`;

  const accountOpen = openMenu === "account";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#e4eee9] bg-white/90 backdrop-blur-md">
        <div ref={navRef} className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-3 px-5">
          <NavLink to={homeTo} className="flex min-w-0 shrink-0 items-center gap-2.5">
            {logo ?? (
              <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#1a8f5a] to-[#0b5c3a] text-white shadow-[0_8px_20px_-8px_rgba(11,92,58,0.7)]">
                <span className="font-[family-name:var(--font-display)] text-[17px] font-bold leading-none">C</span>
              </span>
            )}
            <span className="font-[family-name:var(--font-display)] text-[20px] font-semibold tracking-tight text-[#12241c]">
              Career<span className="text-[#178a5a]">OS</span>
              <span className="ml-2 hidden rounded-full bg-[#eaf6f0] px-2 py-0.5 text-[11px] font-semibold tracking-[0.08em] text-[#146c45] sm:inline">{brand}</span>
            </span>
          </NavLink>

          <nav className="hidden min-w-0 items-center gap-0.5 lg:flex">
            {primary.map((item) => (
              <NavLink key={item.to} to={item.to} className={headerLink}>
                {item.icon}{item.label}
              </NavLink>
            ))}
            {groups.map((group) => {
              const open = openMenu === group.id;
              const active = group.items.some((item) => pathMatches(location.pathname, item.to));
              return (
                <div key={group.id} className="relative">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-haspopup="menu"
                    onClick={() => setOpenMenu(open ? null : group.id)}
                    className={`flex min-h-11 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition duration-200 ${
                      open || active ? "bg-[#eaf6f0] text-[#146c45]" : "text-[#5b6b64] hover:bg-[#f0f7f3] hover:text-[#12241c]"
                    }`}
                  >
                    {group.icon}
                    {group.label}
                    <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div role="menu" className="absolute left-0 top-full z-50 mt-2 w-56 rounded-2xl border border-[#e4eee9] bg-white p-1.5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.28)]">
                      {group.items.map((item) => (
                        <NavLink key={item.to} to={item.to} role="menuitem" onClick={() => setOpenMenu(null)} className={menuLink}>
                          {item.icon}{item.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

          </nav>

          <div className="flex shrink-0 items-center gap-1">
            <span className="hidden sm:block"><RoleSwitcher /></span>
            <NotificationBell />
            {/* Account menu — always at the extreme right on desktop */}
            <div className="relative hidden lg:block">
              <button
                type="button"
                aria-label="Account menu"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                onClick={() => setOpenMenu(accountOpen ? null : "account")}
                className={`grid h-11 w-11 place-items-center overflow-hidden rounded-full transition duration-200 ${
                  accountOpen || (profileTo && pathMatches(location.pathname, profileTo))
                    ? "ring-2 ring-[#146c45] ring-offset-1"
                    : "hover:ring-2 hover:ring-[#146c45]/40 hover:ring-offset-1"
                }`}
              >
                {resolvedAvatarUrl ? (
                  <img src={resolvedAvatarUrl} alt="Avatar" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-semibold ${
                    accountOpen || (profileTo && pathMatches(location.pathname, profileTo))
                      ? "bg-[#146c45] text-white"
                      : "bg-[#eaf6f0] text-[#146c45]"
                  }`}>
                    {(() => { const i = getUserInitials(avatarUser); return i !== "?" ? i : <UserRound size={16} />; })()}
                  </span>
                )}
              </button>
              {accountOpen && (
                <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-[#e4eee9] bg-white p-1.5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.28)]">
                  {profileTo && (
                    <NavLink to={profileTo} role="menuitem" onClick={() => setOpenMenu(null)} className={menuLink}>
                      <UserRound size={16} />{profileLabel}
                    </NavLink>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setOpenMenu(null); onLogout(); }}
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium text-[#3d4d46] transition duration-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              aria-label={panelOpen ? "Close menu" : "Open menu"}
              onClick={() => { setOpenMenu(null); setPanelOpen((value) => !value); }}
              className="grid h-11 w-11 place-items-center rounded-xl text-[#12241c] transition duration-200 hover:bg-[#f0f7f3] lg:hidden"
            >
              {panelOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {panelOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu overlay" className="absolute inset-0 bg-[#12241c]/30" onClick={() => setPanelOpen(false)} />
          <aside className="absolute right-0 top-0 flex h-full w-[min(320px,86vw)] flex-col border-l border-[#e4eee9] bg-white shadow-[0_24px_60px_-20px_rgba(18,50,36,0.35)]">
            <div className="flex items-center justify-between border-b border-[#e4eee9] px-4 py-4">
              <p className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#12241c]">{brand} menu</p>
              <button type="button" aria-label="Close menu" onClick={() => setPanelOpen(false)} className="grid h-11 w-11 place-items-center rounded-lg hover:bg-[#f0f7f3]">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3">
              {primary.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setPanelOpen(false)} className={menuLink}>
                  {item.icon}{item.label}
                </NavLink>
              ))}
              {groups.map((group) => (
                <div key={group.id} className="mt-3">
                  <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.12em] text-[#7a8b84]">{group.label?.toUpperCase()}</p>
                  {group.items.map((item) => (
                    <NavLink key={item.to} to={item.to} onClick={() => setPanelOpen(false)} className={menuLink}>
                      {item.icon}{item.label}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
            <div className="border-t border-[#e4eee9] p-3">
              <div className="mb-2"><RoleSwitcher /></div>
              {profileTo && (
                <NavLink to={profileTo} onClick={() => setPanelOpen(false)} className={menuLink}>
                  <UserRound size={16} /> {profileLabel}
                </NavLink>
              )}
              <button
                type="button"
                onClick={() => { setPanelOpen(false); onLogout(); }}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium text-[#3d4d46] transition duration-200 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
