import {
  Award,
  Bookmark,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Mic,
  Target,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../services/api";
import NotificationBell from "./NotificationBell";
import RoleSwitcher from "./RoleSwitcher";

type IconType = ComponentType<{ size?: number; className?: string }>;
type NavItem = { label: string; to: string; icon: IconType };
type NavGroup = { id: string; label: string; icon: IconType; items: NavItem[] };

const dashboardItem: NavItem = { label: "Dashboard", to: "/candidate/dashboard", icon: LayoutDashboard };
const profileItem: NavItem = { label: "Profile", to: "/candidate/profile", icon: UserRound };

const groups: NavGroup[] = [
  {
    id: "jobs",
    label: "Jobs",
    icon: Target,
    items: [
      { label: "Find jobs", to: "/candidate/jobs", icon: Target },
      { label: "Applications", to: "/candidate/applications", icon: BriefcaseBusiness },
      { label: "Saved", to: "/candidate/saved", icon: Bookmark },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    icon: BookOpen,
    items: [
      { label: "Courses", to: "/candidate/courses", icon: BookOpen },
      { label: "Certificates", to: "/candidate/certificates", icon: Award },
    ],
  },
  {
    id: "ai",
    label: "AI Tools",
    icon: MessageSquare,
    items: [
      { label: "AI Assistant", to: "/candidate/assistant", icon: MessageSquare },
      { label: "AI Career Coach", to: "/candidate/career-coach", icon: Target },
      { label: "Resume Optimizer", to: "/candidate/resume-optimizer", icon: FileText },
      { label: "Interview Practice", to: "/candidate/interview-practice", icon: Mic },
    ],
  },
  {
    id: "discover",
    label: "Discover",
    icon: CalendarDays,
    items: [
      { label: "Events", to: "/candidate/events", icon: CalendarDays },
      { label: "Mentors", to: "/candidate/mentors", icon: Users },
      { label: "Offline Training", to: "/candidate/offline-training", icon: Building2 },
    ],
  },
];

function pathMatches(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function groupIsActive(pathname: string, group: NavGroup) {
  return group.items.some((item) => pathMatches(pathname, item.to));
}

const headerLink = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition duration-200 ${
    isActive ? "bg-[#146c45] text-white shadow-[0_8px_18px_-10px_rgba(20,108,69,0.9)]" : "text-[#5b6b64] hover:bg-[#f0f7f3] hover:text-[#12241c]"
  }`;

const menuLink = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium transition duration-200 ${
    isActive ? "bg-[#eaf6f0] text-[#146c45]" : "text-[#3d4d46] hover:bg-[#f0f7f3]"
  }`;

export default function CandidateMenu() {
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(
    groups.find((group) => groupIsActive(location.pathname, group))?.id ?? null,
  );

  useEffect(() => {
    setOpenGroup(null);
    setPanelOpen(false);
    setMobileGroup(groups.find((group) => groupIsActive(location.pathname, group))?.id ?? null);
  }, [location.pathname]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenGroup(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenGroup(null);
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
    document.body.style.overflow = panelOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [panelOpen]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  const accountOpen = openGroup === "account";

  return (
    <header className="sticky top-0 z-30 border-b border-[#e4eee9] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-3 px-5">
        <Link to="/candidate/dashboard" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#1a8f5a] to-[#0b5c3a] text-white shadow-[0_8px_20px_-8px_rgba(11,92,58,0.7)]">
            <span className="font-[family-name:var(--font-display)] text-[17px] font-bold leading-none">C</span>
          </span>
          <span className="font-[family-name:var(--font-display)] text-[20px] font-semibold tracking-tight text-[#12241c]">
            Career<span className="text-[#178a5a]">OS</span>
            <span className="ml-2 hidden rounded-full bg-[#eaf6f0] px-2 py-0.5 text-[11px] font-semibold tracking-[0.08em] text-[#146c45] sm:inline">Candidate</span>
          </span>
        </Link>

        <nav ref={navRef} className="hidden min-w-0 items-center gap-0.5 lg:flex">
          <NavLink to={dashboardItem.to} className={headerLink}>
            <dashboardItem.icon size={16} />
            {dashboardItem.label}
          </NavLink>

          {groups.map((group) => {
            const open = openGroup === group.id;
            const active = groupIsActive(location.pathname, group);
            const GroupIcon = group.icon;
            return (
              <div key={group.id} className="relative">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-haspopup="menu"
                  onClick={() => setOpenGroup(open ? null : group.id)}
                  className={`flex min-h-11 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition duration-200 ${
                    open || active ? "bg-[#eaf6f0] text-[#146c45]" : "text-[#5b6b64] hover:bg-[#f0f7f3] hover:text-[#12241c]"
                  }`}
                >
                  <GroupIcon size={16} />
                  {group.label}
                  <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div role="menu" className="absolute left-0 top-full z-50 mt-1 w-56 rounded-2xl border border-[#e4eee9] bg-white p-1.5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.28)]">
                    {group.items.map(({ label, to, icon: Icon }) => (
                      <NavLink key={to} to={to} role="menuitem" onClick={() => setOpenGroup(null)} className={menuLink}>
                        <Icon size={15} />
                        {label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="relative ml-1">
            <button
              type="button"
              aria-label="Account menu"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              onClick={() => setOpenGroup(accountOpen ? null : "account")}
              className={`grid h-11 w-11 place-items-center rounded-full transition duration-200 ${
                accountOpen || pathMatches(location.pathname, profileItem.to)
                  ? "bg-[#146c45] text-white"
                  : "bg-[#eaf6f0] text-[#146c45] hover:bg-[#d4ede2]"
              }`}
            >
              <UserRound size={16} />
            </button>
            {accountOpen && (
              <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-[#e4eee9] bg-white p-1.5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.28)]">
                <NavLink to={profileItem.to} role="menuitem" onClick={() => setOpenGroup(null)} className={menuLink}>
                  <UserRound size={16} />
                  {profileItem.label}
                </NavLink>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setOpenGroup(null); void handleLogout(); }}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium text-[#3d4d46] transition duration-200 hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <RoleSwitcher />
          <NotificationBell />
          <button
            type="button"
            aria-expanded={panelOpen}
            aria-label={panelOpen ? "Close menu" : "Open menu"}
            onClick={() => setPanelOpen((value) => !value)}
            className="grid h-11 w-11 place-items-center rounded-xl text-[#12241c] transition duration-200 hover:bg-[#f0f7f3] lg:hidden"
          >
            {panelOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu overlay" className="absolute inset-0 bg-[#12241c]/30" onClick={() => setPanelOpen(false)} />
          <aside className="absolute right-0 top-0 flex h-full w-[min(320px,86vw)] flex-col border-l border-[#e4eee9] bg-white shadow-[0_24px_60px_-20px_rgba(18,50,36,0.35)]">
            <div className="flex items-center justify-between border-b border-[#e4eee9] px-4 py-4">
              <p className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#12241c]">Candidate menu</p>
              <button type="button" aria-label="Close menu" onClick={() => setPanelOpen(false)} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-[#f0f7f3]">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3">
              <NavLink to={dashboardItem.to} onClick={() => setPanelOpen(false)} className={menuLink}>
                <dashboardItem.icon size={17} />
                {dashboardItem.label}
              </NavLink>
              {groups.map((group) => {
                const expanded = mobileGroup === group.id || groupIsActive(location.pathname, group);
                const GroupIcon = group.icon;
                return (
                  <div key={group.id} className="mt-2">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setMobileGroup(expanded && mobileGroup === group.id ? null : group.id)}
                      className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-colors ${
                        groupIsActive(location.pathname, group) ? "bg-[#eaf6f0] text-[#146c45]" : "text-[#3d4d46] hover:bg-[#f0f7f3]"
                      }`}
                    >
                      <GroupIcon size={17} />
                      <span className="flex-1">{group.label}</span>
                      <ChevronDown size={16} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                    </button>
                    {expanded && (
                      <div className="mt-1 space-y-0.5 pl-2">
                        {group.items.map(({ label, to, icon: Icon }) => (
                          <NavLink key={to} to={to} onClick={() => setPanelOpen(false)} className={menuLink}>
                            <Icon size={16} />
                            {label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
            <div className="border-t border-[#e4eee9] p-3">
              <div className="mb-2"><RoleSwitcher /></div>
              <NavLink to={profileItem.to} onClick={() => setPanelOpen(false)} className={menuLink}>
                <UserRound size={16} /> {profileItem.label}
              </NavLink>
              <button
                type="button"
                onClick={() => { setPanelOpen(false); void handleLogout(); }}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-[#3d4d46] transition duration-200 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
