import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "../i18n";

const TABS = [
  {
    tab: "picks",
    path: "/",
    labelKey: "picks",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    tab: "ranking",
    path: "/?tab=ranking",
    labelKey: "ranking",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  {
    tab: "my-picks",
    path: "/?tab=my-picks",
    labelKey: "myPicks",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    tab: "coach-pass",
    path: "/?tab=coach-pass",
    labelKey: "coachPass",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { copy } = useLanguage();
  const activeTab = pathname === "/" ? searchParams.get("tab") ?? "picks" : "";

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => {
        const label = copy.nav[tab.labelKey as keyof typeof copy.nav];
        const active = pathname === tab.path || activeTab === tab.tab;

        return (
          <button
            key={tab.path}
            className={`nav-item${active ? " active" : ""}`}
            onClick={() => navigate(tab.path)}
            aria-label={label}
          >
            {tab.icon}
            {label}
          </button>
        );
      })}
    </nav>
  );
}