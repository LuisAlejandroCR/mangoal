import { createContext, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { WagmiProvider as WagmiProviderOriginal } from "wagmi";
import { WagmiProvider as WagmiProviderPrivy } from "@privy-io/wagmi";
import { PrivyProvider, usePrivy, useConnectOrCreateWallet } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConnect, useAccount } from "wagmi";
import { injected } from "wagmi/connectors";
import { celo } from "wagmi/chains";
import { wagmiConfigPrivy, wagmiConfigStandalone } from "./config/wagmi";
import { BottomNav } from "./components/BottomNav";
import { Predictions } from "./screens/Predictions";
import { AllMatches } from "./screens/AllMatches";
import { PredictionDetail } from "./screens/PredictionDetail";
import { CoachInsight } from "./screens/CoachInsight";
import { CoachPass } from "./screens/CoachPass";
import { CoachPassHistory } from "./screens/CoachPassHistory";
import { Ranking } from "./screens/Ranking";
import { MyPicks } from "./screens/MyPicks";
import { OnChainAudit } from "./screens/OnChainAudit";
import { RewardClaim } from "./screens/RewardClaim";
import { Stats } from "./screens/Stats";
import { Support } from "./screens/Support";
import { DemoTour } from "./screens/DemoTour";
import { Challenge } from "./screens/Challenge";
import { SplashScreen } from "./screens/SplashScreen";
import { LanguageProvider } from "./i18n";
import { analytics } from "./lib/analytics";

// ── Auth mode context ─────────────────────────────────────────────────────────
// true = Privy is active; false = standalone wagmi (injected wallet only)
export const PrivyActiveContext = createContext(false);

const PRIVY_APP_ID = (import.meta.env.VITE_PRIVY_APP_ID as string | undefined) ?? "";
const queryClient = new QueryClient();

// ── MiniPay auto-connect (Privy mode) ────────────────────────────────────────
function MiniPayAutoConnectPrivy() {
  const { connectOrCreateWallet } = useConnectOrCreateWallet();
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    const isMiniPay =
      typeof window !== "undefined" &&
      window.ethereum !== undefined &&
      (window.ethereum as { isMiniPay?: boolean }).isMiniPay === true;

    if (isMiniPay && ready && !authenticated) {
      connectOrCreateWallet();
      analytics.walletConnected("minipay");
    }
  }, [ready, authenticated, connectOrCreateWallet]);

  return null;
}

// ── MiniPay auto-connect (standalone wagmi mode) ──────────────────────────────
function MiniPayAutoConnectStandalone() {
  const { connect } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    const isMiniPay =
      typeof window !== "undefined" &&
      window.ethereum !== undefined &&
      (window.ethereum as { isMiniPay?: boolean }).isMiniPay === true;

    if (isMiniPay && !isConnected) {
      connect({ connector: injected({ target: "metaMask" }) });
      analytics.walletConnected("minipay");
    }
  }, [connect, isConnected]);

  return null;
}

// ── Tabs / routing ────────────────────────────────────────────────────────────
type RootTab = "picks" | "ranking" | "my-picks" | "coach-pass";
const ROOT_TABS = new Set(["picks", "ranking", "my-picks", "coach-pass"]);

function getStoredTab(): RootTab {
  if (typeof window === "undefined") return "picks";
  const stored = window.localStorage.getItem("mangooal:root-tab");
  return ROOT_TABS.has(stored ?? "") ? (stored as RootTab) : "picks";
}

function RootTabs() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<RootTab>(getStoredTab);

  useEffect(() => {
    const queryTab = searchParams.get("tab");
    if (ROOT_TABS.has(queryTab ?? "")) {
      window.localStorage.setItem("mangooal:root-tab", queryTab as RootTab);
      setTab(queryTab as RootTab);
      navigate("/", { replace: true });
    }
  }, [navigate, searchParams]);

  useEffect(() => {
    const onTab = () => setTab(getStoredTab());
    window.addEventListener("mangooal:tab", onTab);
    return () => window.removeEventListener("mangooal:tab", onTab);
  }, []);

  if (tab === "ranking") return <Ranking />;
  if (tab === "my-picks") return <MyPicks />;
  if (tab === "coach-pass") return <CoachPass />;
  return <Predictions />;
}

function AppShell() {
  const location = useLocation();
  const showBottomNav =
    !location.pathname.startsWith("/support") &&
    !location.pathname.startsWith("/terms") &&
    !location.pathname.startsWith("/demo");

  return (
    <>
      <Routes>
        <Route path="/" element={<RootTabs />} />
        <Route path="/matches" element={<AllMatches />} />
        <Route path="/match/:id" element={<PredictionDetail />} />
        <Route path="/coach/:id" element={<CoachInsight />} />
        <Route path="/coach-pass" element={<CoachPass />} />
        <Route path="/coach-pass/history" element={<CoachPassHistory />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/my-picks" element={<MyPicks />} />
        <Route path="/audit/:id" element={<OnChainAudit />} />
        <Route path="/challenge/:id" element={<Challenge />} />
        <Route path="/claim" element={<RewardClaim />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/support" element={<Support />} />
        <Route path="/demo" element={<DemoTour />} />
      </Routes>
      {showBottomNav && <BottomNav />}
    </>
  );
}

// ── App content (shared between both trees) ───────────────────────────────────
function AppContent({ showSplash, onSplashDone }: { showSplash: boolean; onSplashDone: () => void }) {
  return (
    <LanguageProvider>
      {showSplash ? (
        <SplashScreen onDone={onSplashDone} />
      ) : (
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      )}
    </LanguageProvider>
  );
}

// ── Tree A: full Privy integration ────────────────────────────────────────────
function AppWithPrivy() {
  const [showSplash, setShowSplash] = useState(
    () => typeof window !== "undefined" && window.location.pathname === "/"
  );

  return (
    <PrivyActiveContext.Provider value={true}>
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          loginMethods: ["email", "wallet"],
          embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
          defaultChain: celo,
          supportedChains: [celo],
          appearance: {
            theme: "light",
            accentColor: "#16A34A",
            landingHeader: "Welcome to Mangooal",
            loginMessage: "Enter your email to get started",
          },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProviderPrivy config={wagmiConfigPrivy}>
            <MiniPayAutoConnectPrivy />
            <AppContent showSplash={showSplash} onSplashDone={() => setShowSplash(false)} />
          </WagmiProviderPrivy>
        </QueryClientProvider>
      </PrivyProvider>
    </PrivyActiveContext.Provider>
  );
}

// ── Tree B: standalone wagmi (no Privy App ID configured) ─────────────────────
function AppStandalone() {
  const [showSplash, setShowSplash] = useState(
    () => typeof window !== "undefined" && window.location.pathname === "/"
  );

  return (
    <PrivyActiveContext.Provider value={false}>
      <WagmiProviderOriginal config={wagmiConfigStandalone}>
        <QueryClientProvider client={queryClient}>
          <MiniPayAutoConnectStandalone />
          <AppContent showSplash={showSplash} onSplashDone={() => setShowSplash(false)} />
        </QueryClientProvider>
      </WagmiProviderOriginal>
    </PrivyActiveContext.Provider>
  );
}

export default function App() {
  return PRIVY_APP_ID ? <AppWithPrivy /> : <AppStandalone />;
}
