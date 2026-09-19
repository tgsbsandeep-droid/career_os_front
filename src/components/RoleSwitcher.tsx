import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCachedUser,
  getDashboardPath,
  getRoleLabel,
  getUserRole,
  getUserRoles,
  setActiveRole,
  subscribeToUser,
  type AppRole,
} from "../services/auth";

export default function RoleSwitcher() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState(getCachedUser());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeToUser(setUser), []);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const roles = getUserRoles(user);
  const active = getUserRole(user);
  if (roles.length < 2 && !user) return null;

  async function switchTo(role: AppRole) {
    if (role === active) { setOpen(false); return; }
    setBusy(true);
    try {
      const next = await setActiveRole(role);
      setOpen(false);
      navigate(getDashboardPath(next, role), { replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#5b6b64] hover:bg-[#f0f7f3] hover:text-[#12241c] transition"
        aria-expanded={open}
      >
        {getRoleLabel(active)}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-2xl border border-[#e4eee9] bg-white p-1.5 shadow-[0_18px_40px_-28px_rgba(18,50,36,0.28)]">
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              disabled={busy}
              onClick={() => void switchTo(role)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${
                role === active ? "bg-[#eaf6f0] text-[#146c45]" : "text-[#3d4d46] hover:bg-[#f0f7f3]"
              }`}
            >
              {getRoleLabel(role)}
              {role === active && <span className="text-[11px]">Active</span>}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setOpen(false); navigate("/select-role"); }}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#5b6b64] hover:bg-[#f0f7f3]"
          >
            <Plus size={14} /> Add another role
          </button>
        </div>
      )}
    </div>
  );
}
